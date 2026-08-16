import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME, authCookieOptions, getAuthUserFromCookies } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit-log";

const buildRedirect = (request: Request) => {
  const headers = new Headers(request.headers);
  const host = headers.get("x-forwarded-host") || headers.get("host") || "localhost:9090";
  const proto = headers.get("x-forwarded-proto") || "http";
  const loginUrl = new URL(`${proto}://${host}/login`);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(JWT_COOKIE_NAME, "", { ...authCookieOptions, maxAge: 0 });
  return response;
};

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies();
  await recordAuditLog({
    action: "auth.logout",
    status: "success",
    message: "تم تسجيل الخروج.",
    user: user ?? undefined,
    request,
  });
  return buildRedirect(request);
}

export async function GET(request: Request) {
  const user = await getAuthUserFromCookies();
  await recordAuditLog({
    action: "auth.logout",
    status: "success",
    message: "تم تسجيل الخروج.",
    user: user ?? undefined,
    request,
  });
  return buildRedirect(request);
}
