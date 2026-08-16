import { NextResponse } from "next/server";
import { authCookieOptions, JWT_COOKIE_NAME, signAuthToken } from "@/lib/auth";
import { getSqlPool, sql } from "@/lib/sql";
import { recordAuditLog } from "@/lib/audit-log";

const messages = {
  invalidPayload:
    "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a\u0020\u0627\u0644\u0645\u0631\u0633\u0644\u0629\u0020\u063a\u064a\u0631\u0020\u0635\u0627\u0644\u062d\u0629",
  missingFields:
    "\u0627\u0644\u0631\u062c\u0627\u0621\u0020\u0625\u062f\u062e\u0627\u0644\u0020\u0631\u0642\u0645\u0020\u0627\u0644\u0645\u0648\u0638\u0641\u0020\u0648\u0631\u0642\u0645\u0020\u0627\u0644\u0647\u0648\u064a\u0629",
  invalidCredentials:
    "\u0628\u064a\u0627\u0646\u0627\u062a\u0020\u0627\u0644\u062f\u062e\u0648\u0644\u0020\u063a\u064a\u0631\u0020\u0635\u062d\u064a\u062d\u0629",
  serverError:
    "\u062d\u062f\u062b\u0020\u062e\u0637\u0623\u0020\u063a\u064a\u0631\u0020\u0645\u062a\u0648\u0642\u0639\u002e\u0020\u062d\u0627\u0648\u0644\u0020\u0645\u0631\u0629\u0020\u0623\u062e\u0631\u0649\u002e",
};

type LoginBody = {
  empId?: string;
  password?: string;
  idCard?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = await request.json();
  } catch {
    await recordAuditLog({
      action: "auth.login",
      status: "failure",
      message: messages.invalidPayload,
      reason: "invalid_payload",
      request,
    });
    return NextResponse.json({ message: messages.invalidPayload }, { status: 400 });
  }

  const empId = body.empId?.trim();
  const password = body.password ?? body.idCard;

  if (!empId || !password) {
    await recordAuditLog({
      action: "auth.login",
      status: "failure",
      message: messages.missingFields,
      reason: "missing_fields",
      user: empId ? { empId } : undefined,
      request,
    });
    return NextResponse.json({ message: messages.missingFields }, { status: 400 });
  }

  try {
    const pool = await getSqlPool();

    const result = await pool
      .request()
      .input("EmpId", sql.VarChar, empId)
      .input("EmpPassword", sql.VarChar, password)
      .execute("Logistic.UserLog");

    const row = result.recordset?.[0];

    if (!row) {
      await recordAuditLog({
        action: "auth.login",
        status: "failure",
        message: messages.invalidCredentials,
        reason: "invalid_credentials",
        user: { empId },
        request,
      });
      return NextResponse.json(
        { message: messages.invalidCredentials },
        { status: 401 }
      );
    }

    const payload = {
      empId: String(row.EmpId ?? row.empId ?? empId),
      name: row.EmpName ?? row.name ?? "",
      role: row.EmpRole ?? row.role ?? "",
      branch: row.BranchCode ?? row.branch ?? "",
      jobCode: row.JobCode ?? row.jobCode ?? "",
    };

    const token = await signAuthToken(payload);
    const response = NextResponse.json({ user: payload });
    response.cookies.set(JWT_COOKIE_NAME, token, authCookieOptions);

    await recordAuditLog({
      action: "auth.login",
      status: "success",
      message: "تم تسجيل الدخول بنجاح.",
      user: payload,
      request,
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    await recordAuditLog({
      action: "auth.login",
      status: "failure",
      message: messages.serverError,
      reason: error instanceof Error ? error.message : "server_error",
      user: empId ? { empId } : undefined,
      request,
    });
    return NextResponse.json(
      {
        message:
          "تعذر الاتصال بقاعدة البيانات أو تنفيذ تسجيل الدخول، يرجى المحاولة لاحقاً.",
      },
      { status: 500 }
    );
  }
}
