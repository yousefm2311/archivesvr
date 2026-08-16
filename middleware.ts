import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];
const UNAUTHORIZED_MESSAGE = "\u063a\u064a\u0631\u0020\u0645\u0635\u0631\u062d";

const buildOrigin = (request: NextRequest) => {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
};

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

const shouldBypass = (pathname: string) =>
  pathname.startsWith("/_next") ||
  pathname.startsWith("/favicon.ico") ||
  pathname.startsWith("/api/health");

const handleUnauthenticated = (request: NextRequest) => {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ message: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  const origin = buildOrigin(request);
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypass(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

  if (!token) {
    return handleUnauthenticated(request);
  }

  try {
    await verifyAuthToken(token);
    return NextResponse.next();
  } catch {
    return handleUnauthenticated(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
