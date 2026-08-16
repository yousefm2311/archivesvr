import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

type ClientLogBody = {
  action?: string;
  status?: "success" | "failure";
  message?: string;
  reason?: string;
  clientCode?: string;
  docId?: string;
  details?: Record<string, unknown>;
  clientTime?: string;
  clientPath?: string;
};

const sanitizeString = (value?: string, max = 240) => {
  if (!value) return "";
  return value.trim().slice(0, max);
};

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "الرجاء تسجيل الدخول." }, { status: 401 });
  }

  let body: ClientLogBody;
  try {
    body = (await request.json()) as ClientLogBody;
  } catch {
    return NextResponse.json({ message: "بيانات غير صالحة." }, { status: 400 });
  }

  const action = sanitizeString(body.action, 80);
  const status = body.status;
  if (!action || (status !== "success" && status !== "failure")) {
    return NextResponse.json({ message: "بيانات غير مكتملة." }, { status: 400 });
  }

  await recordAuditLog({
    action,
    status,
    source: "client",
    message: sanitizeString(body.message, 500),
    reason: sanitizeString(body.reason, 200),
    user,
    request,
    clientCode: sanitizeString(body.clientCode, 60) || undefined,
    docId: sanitizeString(body.docId, 60) || undefined,
    details: {
      ...(body.details ?? {}),
      clientTime: sanitizeString(body.clientTime, 40),
      clientPath: sanitizeString(body.clientPath, 200),
    },
  });

  return NextResponse.json({ success: true });
}
