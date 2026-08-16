import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

const archiveBase =
  process.env.ARCHIVE_SERVICE_URL ||
  process.env.NEXT_PUBLIC_ARCHIVE_SERVICE_URL ||
  "http://localhost:5000";

const HEALTH_TIMEOUT_MS = Number(
  process.env.ARCHIVE_HEALTH_TIMEOUT_MS || 3000
);

export async function GET(request: Request) {
  const controller =
    HEALTH_TIMEOUT_MS > 0 ? new AbortController() : undefined;
  const timeoutId = controller
    ? setTimeout(() => controller?.abort(), HEALTH_TIMEOUT_MS)
    : undefined;

  try {
    const res = await fetch(`${archiveBase}/api/archives/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller?.signal,
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data?.ok === true;
    if (!ok) {
      const user = await getAuthUserFromCookies().catch(() => null);
      await recordAuditLog({
        action: "archive.health",
        status: "failure",
        message: "خدمة الأرشفة غير متاحة.",
        reason: data?.status || `status_${res.status}`,
        user: user ?? undefined,
        request,
      });
    }
    return NextResponse.json(
      { ok, status: data?.status || (ok ? "ok" : "unavailable") },
      { status: ok ? 200 : 503 }
    );
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const user = await getAuthUserFromCookies().catch(() => null);
    await recordAuditLog({
      action: "archive.health",
      status: "failure",
      message: "تعذر الاتصال بخدمة الأرشفة.",
      reason: code || (error instanceof Error ? error.message : "fetch_failed"),
      user: user ?? undefined,
      request,
    });
    return NextResponse.json(
      { ok: false, status: "unavailable", code },
      { status: 503 }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
