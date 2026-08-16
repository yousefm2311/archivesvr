import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientModel } from "@/models/Client";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { getUserBranch, normalizeBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { correctDocName, buildDocumentFileName } from "@/lib/documents";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientCodeParam = searchParams.get("clientCode");
  const clientCode = Number(clientCodeParam);

  if (!clientCodeParam || Number.isNaN(clientCode)) {
    return NextResponse.json({ message: "clientCode غير صحيح" }, { status: 400 });
  }

  await connectMongo();

  const client = await ClientModel.findOne({ clientCode }).lean();
  if (!client) {
    return NextResponse.json({ message: "العميل غير موجود" }, { status: 404 });
  }

  const userBranch = normalizeBranch(getUserBranch(user));
  const canAll = canAccessAllBranches(user);
  const clientBranch = normalizeBranch((client as any).createdBranch);

  if (!canAll && clientBranch && clientBranch !== userBranch) {
    return NextResponse.json(
      { message: "غير مسموح لك بتحميل مستندات هذا العميل (فرع مختلف)." },
      { status: 403 }
    );
  }

  const docs = await ClientDocumentModel.find(
    canAll ? { clientCode } : { clientCode, branch: userBranch }
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
    const url = (doc as any).fileUrl || (doc as any).filePath;
    if (!url || typeof url !== "string") continue;

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
        /\.zip(\?|$)/i.test(url);

      // إذا الملف مضغوط ZIP: فك الملفات داخله وضعها في الـ ZIP النهائي
      if (looksLikeZip) {
        try {
          const innerZip = await JSZip.loadAsync(arrayBuffer);
          const entries = Object.values(innerZip.files);
          for (const entry of entries) {
            if (entry.dir) continue;
            const innerBuffer = await entry.async("arraybuffer");
            const entryExt = entry.name.includes(".")
              ? "." + (entry.name.split(".").pop() || "pdf")
              : ".pdf";
            const safeName = buildDocumentFileName(docName, clientCode, `file${entryExt}`);
            zip.file(safeName, innerBuffer);
            successCount++;
          }
          continue;
        } catch {
          // لو فشل فك الضغط، تابع كملف واحد عادي
        }
      }

      // استخرج الامتداد من الرابط، ولو غير موجود اعتبره PDF
      let ext = "";
      try {
        const parsed = new URL(url);
        const lastPart = parsed.pathname.split("/").pop() || "";
        if (lastPart.includes(".")) {
          ext = "." + (lastPart.split(".").pop() || "");
        }
      } catch {
        const simple = url.split("?")[0];
        if (simple.includes(".")) {
          ext = "." + (simple.split(".").pop() || "");
        }
      }
      if (!ext) ext = ".pdf";

      const safeName = buildDocumentFileName(docName, clientCode, `file${ext}`);
      zip.file(safeName, arrayBuffer);
      successCount++;
    } catch {
      // تجاهل الأخطاء في ملف واحد واستمر في البقية
    }
  }

  if (!successCount) {
    return NextResponse.json(
      { message: "تعذر تحميل الملفات، حاول مرة أخرى." },
      { status: 500 }
    );
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

return new Response(new Uint8Array(zipBuffer), {
  status: 200,
  headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="ClientDocs_${clientCode}.zip"`,
  },
});

}
export const runtime = "nodejs";
