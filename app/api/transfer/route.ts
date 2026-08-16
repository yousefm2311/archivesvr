import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { getUserBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { connectMongo } from "@/lib/mongo";
import { ClientModel } from "@/models/Client";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { getBranchName, normalizeBranchCode } from "@/lib/branches";
import { recordAuditLog } from "@/lib/audit-log";

type TransferBody = {
  clientCode?: string;
  targetBranch?: string;
};

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    await recordAuditLog({
      action: "client.transfer",
      status: "failure",
      message: "الرجاء تسجيل الدخول",
      reason: "unauthorized",
      request,
    });
    return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
  }

  if (!canAccessAllBranches(user)) {
    await recordAuditLog({
      action: "client.transfer",
      status: "failure",
      message: "ليس لديك صلاحية تحويل العملاء.",
      reason: "forbidden",
      user,
      request,
    });
    return NextResponse.json(
      { message: "ليس لديك صلاحية تحويل العملاء." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as TransferBody;
  const clientCode = body.clientCode?.trim() ?? "";
  const targetBranch = normalizeBranchCode(body.targetBranch);

  if (!clientCode || !targetBranch) {
    await recordAuditLog({
      action: "client.transfer",
      status: "failure",
      message: "يرجى إدخال كود العميل والفرع المستهدف.",
      reason: "missing_fields",
      user,
      request,
      details: { clientCode, targetBranch },
    });
    return NextResponse.json(
      { message: "يرجى إدخال كود العميل والفرع المستهدف." },
      { status: 400 }
    );
  }

  await connectMongo();

  const client = await ClientModel.findOne({
    $or: [{ clientCode }, { clientCodeRaw: clientCode }],
  }).lean();

  if (!client) {
    await recordAuditLog({
      action: "client.transfer",
      status: "failure",
      message: "العميل غير موجود.",
      reason: "client_not_found",
      user,
      request,
      clientCode,
    });
    return NextResponse.json(
      { message: "العميل غير موجود." },
      { status: 404 }
    );
  }

  const targetBranchName = await getBranchName(targetBranch);

  // حدث بيانات العميل
  await ClientModel.updateOne(
    { _id: client._id },
    {
      $set: {
        createdBranch: targetBranch,
        createdBranchName: targetBranchName,
        updatedAt: new Date(),
        updatedBy: getUserBranch(user),
      },
    }
  );

  // حدث مستندات العميل لنفس الفرع الجديد
  await ClientDocumentModel.updateMany(
    { clientCode: client.clientCode },
    { $set: { branch: targetBranch } }
  );

  await recordAuditLog({
    action: "client.transfer",
    status: "success",
    message: "تم تحويل العميل للفرع الجديد.",
    user,
    request,
    clientCode: client.clientCode,
    details: {
      fromBranch: (client as any).createdBranch,
      toBranch: targetBranch,
      toBranchName: targetBranchName,
    },
  });

  return NextResponse.json({
    success: true,
    message: "تم تحويل العميل للفرع الجديد.",
    newBranch: targetBranch,
    newBranchName: targetBranchName,
  });
}
