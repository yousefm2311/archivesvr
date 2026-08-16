import { cookies } from "next/headers";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

export type AuthUser = {
  empId: string;
  name?: string;
  role?: string;
  branch?: string;
  jobCode?: string;
};

export const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "auth_token";
// نعتمد 12 ساعة كافتراضي لعمر الجلسة
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "12h";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
};

export const signAuthToken = async (payload: AuthUser) =>
  await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRES_IN || "7d")
    .sign(getJwtSecret());

export const verifyAuthToken = async (token: string): Promise<AuthUser> => {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as AuthUser;
};

export const getAuthUserFromCookies = async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
};

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: Number.isFinite(Number(process.env.JWT_MAX_AGE))
    ? Number(process.env.JWT_MAX_AGE)
    : 60 * 60 * 12, // 12 ساعة افتراضي
};

const parseBool = (value: string | undefined, fallback = undefined as boolean | undefined) => {
  if (value === undefined) return fallback;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

// Allow overriding the secure flag for deployments behind HTTP (e.g., internal networks)
const cookieSecure =
  parseBool(process.env.AUTH_COOKIE_SECURE, undefined) ?? process.env.NODE_ENV === "production";

authCookieOptions.secure = cookieSecure;
