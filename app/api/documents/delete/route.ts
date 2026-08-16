import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { ArchiveModel } from "@/models/Archive";
import { getUserBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { recordAuditLog } from "@/lib/audit-log";

type DeleteBody = {
  docId?: number | string;
};

const archiveBase =
  process.env.ARCHIVE_SERVICE_URL ||
  process.env.NEXT_PUBLIC_ARCHIVE_SERVICE_URL ||
  "http://localhost:5000";

const extractArchiveId = (url: string) => {
  try {
    const match = url.match(/archives\/([^/]+)/i);
    return match?.[1];
  } catch {
    return undefined;
  }
};

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    await recordAuditLog({
      action: "document.delete",
      status: "failure",
      message: "غير مصرح",
      reason: "unauthorized",
      request,
    });
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  const branch = getUserBranch(user);
  const canDeleteAll = canAccessAllBranches(user);

  const body = (await request.json()) as DeleteBody;
  const docId = body.docId;
  if (!docId) {
    await recordAuditLog({
      action: "document.delete",
      status: "failure",
      message: "docId مطلوب",
      reason: "missing_doc_id",
      user,
      request,
    });
    return NextResponse.json({ message: "docId مطلوب" }, { status: 400 });
  }

  try {
    await connectMongo();

    const existing = await ClientDocumentModel.findById(docId).lean();
    if (!existing) {
      await recordAuditLog({
        action: "document.delete",
        status: "failure",
        message: "المستند غير موجود",
        reason: "not_found",
        user,
        request,
        docId,
      });
      return NextResponse.json({ message: "المستند غير موجود" }, { status: 404 });
    }

    const filter: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(String(docId)),
    };
    if (!canDeleteAll) {
      filter.branch = branch;
    }

    const res = await ClientDocumentModel.deleteOne(filter);
    if (res.deletedCount === 0) {
      await recordAuditLog({
        action: "document.delete",
        status: "failure",
        message: "المستند غير موجود أو ليس لديك صلاحية الحذف",
        reason: "not_found_or_forbidden",
        user,
        request,
        docId,
        clientCode: (existing as any).clientCode,
      });
      return NextResponse.json(
        { message: "المستند غير موجود أو ليس لديك صلاحية الحذف" },
        { status: 404 }
      );
    }

    const fileUrl = (existing as any).fileUrl || (existing as any).filePath;
    const archiveId = typeof fileUrl === "string" ? extractArchiveId(fileUrl) : undefined;
    let archiveDeleted = false;

    if (archiveId) {
      try {
        await fetch(`${archiveBase}/api/archives/${archiveId}`, { method: "DELETE" });
        archiveDeleted = true;
      } catch (err) {
        console.error("Failed to delete archive remotely:", err);
        await recordAuditLog({
          action: "archive.delete",
          status: "failure",
          message: "فشل حذف الملف من خدمة الأرشفة.",
          reason: err instanceof Error ? err.message : "archive_delete_failed",
          user,
          request,
          docId,
          clientCode: (existing as any).clientCode,
          details: { archiveId },
        });
      }

      try {
        await ArchiveModel.deleteOne({ archivePath: new RegExp(archiveId) });
      } catch (err) {
        console.error("Failed to delete archive record:", err);
      }
    }

    await recordAuditLog({
      action: "document.delete",
      status: "success",
      message: "تم حذف المستند.",
      user,
      request,
      docId,
      clientCode: (existing as any).clientCode,
      details: { archiveDeleted },
    });

    return NextResponse.json({ success: true, archiveDeleted });
  } catch (error) {
    console.error("DeleteClientDoc failed:", error);
    await recordAuditLog({
      action: "document.delete",
      status: "failure",
      message: "تعذر حذف المستند",
      reason: error instanceof Error ? error.message : "server_error",
      user,
      request,
      docId,
    });
    return NextResponse.json({ message: "تعذر حذف المستند" }, { status: 500 });
  }
}
