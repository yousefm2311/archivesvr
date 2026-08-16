import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { getSqlPool, sql } from "@/lib/sql";
import { recordAuditLog } from "@/lib/audit-log";

type Body = {
  oldPassword?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    await recordAuditLog({
      action: "auth.change_password",
      status: "failure",
      message: "الرجاء تسجيل الدخول",
      reason: "unauthorized",
      request,
    });
    return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body.oldPassword || !body.newPassword) {
    await recordAuditLog({
      action: "auth.change_password",
      status: "failure",
      message: "يرجى إدخال كلمة المرور الحالية والجديدة",
      reason: "missing_fields",
      user,
      request,
    });
    return NextResponse.json(
      { message: "يرجى إدخال كلمة المرور الحالية والجديدة" },
      { status: 400 }
    );
  }

  try {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("EmpId", sql.VarChar, user.empId)
      .input("OldPassword", sql.VarChar, body.oldPassword)
      .input("NewPassword", sql.VarChar, body.newPassword)
      .execute("UpdateUserPass");

    await recordAuditLog({
      action: "auth.change_password",
      status: "success",
      message: "تم تحديث كلمة المرور.",
      user,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UpdateUserPass failed:", error);
    await recordAuditLog({
      action: "auth.change_password",
      status: "failure",
      message: "حدث خطأ أثناء تحديث كلمة المرور",
      reason: error instanceof Error ? error.message : "server_error",
      user,
      request,
    });
    return NextResponse.json(
      { message: "حدث خطأ أثناء تحديث كلمة المرور" },
      { status: 500 }
    );
  }
}
