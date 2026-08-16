import { NextResponse } from "next/server";
import JSZip from "jszip";
import path from "path";

export const dynamic = "force-dynamic";

const guessContentType = (fileName: string | undefined, fallback?: string) => {
  if (!fileName) return fallback ?? "application/octet-stream";
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".xls") return "application/vnd.ms-excel";
  if (ext === ".xlsx")
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === ".zip") return "application/zip";
  return fallback ?? "application/octet-stream";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const contentType = searchParams.get("contentType") ?? undefined;

  if (!url) {
    return NextResponse.json({ message: "حقل url مطلوب" }, { status: 400 });
  }

  try {
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        { message: "تعذر تحميل الملف" },
        { status: res.status }
      );
    }

    const resContentType = res.headers.get("content-type") || contentType || "";
    const isZip = resContentType.includes("zip") || url.toLowerCase().endsWith(".zip");
    const buffer = Buffer.from(await res.arrayBuffer());

    if (isZip) {
      const zip = await JSZip.loadAsync(buffer);
      const firstFile = zip.file(/.*/)[0];
      if (!firstFile) {
        return NextResponse.json({ message: "الأرشيف فارغ" }, { status: 400 });
      }
      const fileBuffer = Buffer.from(await firstFile.async("arraybuffer"));
      const fileName = firstFile.name;
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": guessContentType(fileName, "application/octet-stream"),
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType ?? resContentType ?? "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Proxy view failed:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء عرض الملف" },
      { status: 500 }
    );
  }
}
