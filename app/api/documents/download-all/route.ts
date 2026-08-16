import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { Buffer } from "node:buffer";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientModel } from "@/models/Client";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { getUserBranch, normalizeBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { correctDocName, buildDocumentFileName } from "@/lib/documents";

export const runtime = "nodejs";

const archiveBase =
  process.env.ARCHIVE_SERVICE_URL ||
  process.env.NEXT_PUBLIC_ARCHIVE_SERVICE_URL ||
  "http://localhost:5000";

const normalizeArchiveUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const apiMatch = trimmed.match(/\/?api\/archives\/([0-9a-f]{24})/i);
  if (apiMatch) {
    return `${archiveBase}/api/archives/${apiMatch[1]}/download`;
  }

  const archiveMatch = trimmed.match(/archives\/([0-9a-f]{24})/i);
  if (archiveMatch) {
    return `${archiveBase}/api/archives/${archiveMatch[1]}/download`;
  }

  const idMatch = trimmed.match(/([0-9a-f]{24})/i);
  if (idMatch) {
    return `${archiveBase}/api/archives/${idMatch[1]}/download`;
  }

  if (/^\/?api\/archives\//i.test(trimmed)) {
    const prefix = trimmed.startsWith("/") ? "" : "/";
    return `${archiveBase}${prefix}${trimmed}`;
  }

  return trimmed;
};

const pickExt = (url: string) => {
  try {
    const clean = url.split("?")[0];
    const part = clean.split("/").pop() || "";
    if (part.includes(".")) {
      return "." + (part.split(".").pop() || "");
    }
    return "";
  } catch {
    return "";
  }
};

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "غير مصرح، يرجى تسجيل الدخول." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientCodeParam = searchParams.get("clientCode");
  const clientCode = clientCodeParam?.trim() ?? "";

  if (!clientCode) {
    return NextResponse.json({ message: "معرّف العميل clientCode غير صالح." }, { status: 400 });
  }

  await connectMongo();

  const client = await ClientModel.findOne({
    $or: [{ clientCode }, { clientCodeRaw: clientCode }],
  }).lean();
  if (!client) {
    return NextResponse.json({ message: "العميل غير موجود." }, { status: 404 });
  }

  const userBranch = normalizeBranch(getUserBranch(user));
  const canAll = canAccessAllBranches(user);
  const clientBranch = normalizeBranch((client as any).createdBranch);

  if (!canAll && clientBranch && clientBranch !== userBranch) {
    return NextResponse.json(
      { message: "هذا العميل مسجّل بفرع آخر ولا تملك صلاحية عرض مستنداته." },
      { status: 403 }
    );
  }

  const docClientCode = (client as any).clientCode ?? clientCode;
  const zipClientCode =
    (client as any).clientCodeRaw ?? (client as any).clientCode ?? clientCode;

  const docs = await ClientDocumentModel.find(
    canAll
      ? { clientCode: docClientCode }
      : { clientCode: docClientCode, branch: userBranch }
  )
    .sort({ createdAt: -1 })
    .lean();

  if (!docs.length) {
    return NextResponse.json(
      { message: "لا توجد مستندات متاحة لهذا العميل." },
      { status: 404 }
    );
  }

  const zip = new JSZip();
  let successCount = 0;

  for (const doc of docs) {
    const storedUrl = (doc as any).fileUrl || (doc as any).filePath;
    if (!storedUrl || typeof storedUrl !== "string") continue;
    const url = normalizeArchiveUrl(storedUrl);
    if (!url || !/^https?:\/\//i.test(url)) continue;

    try {
      const cookieHeader = request.headers.get("cookie") || undefined;
      const res = await fetch(url, {
        headers: {
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
          Accept: "application/octet-stream,application/pdf,*/*",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      const docName = correctDocName((doc as any).docName || "document");
      const contentType = res.headers.get("content-type") || "";
      const looksLikeZip =
        contentType.includes("application/zip") ||
        contentType.includes("application/x-zip") ||
        /\.zip(\?|$)/i.test(storedUrl);

      if (looksLikeZip) {
        try {
          const innerZip = await JSZip.loadAsync(arrayBuffer);
          const entries = Object.values(innerZip.files).filter((f) => !f.dir);

          for (const entry of entries) {
            const innerBuffer = await entry.async("arraybuffer");
            const entryExt = pickExt(entry.name) || ".pdf";
            const zipName = buildDocumentFileName(docName, zipClientCode, `file${entryExt}`);
            zip.file(zipName, innerBuffer);
            successCount++;
          }
          continue;
        } catch {
          // ignore corrupted zip entries and continue
        }
      }

      const ext = pickExt(storedUrl) || ".pdf";
      const zipName = buildDocumentFileName(docName, zipClientCode, `file${ext}`);
      zip.file(zipName, arrayBuffer);
      successCount++;
    } catch {
      // ignore single doc failure
    }
  }

  if (!successCount) {
    return NextResponse.json(
      { message: "تعذر تجميع الملفات، حاول مرة أخرى." },
      { status: 500 }
    );
  }

  const zipBuffer = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
  });

  const body = Buffer.from(
    zipBuffer.buffer,
    zipBuffer.byteOffset,
    zipBuffer.byteLength
  );

  return new Response(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ClientDocs_${zipClientCode}.zip"`,
    },
  });
}
