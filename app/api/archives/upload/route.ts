import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

const archiveBase =
  process.env.ARCHIVE_SERVICE_URL ||
  process.env.NEXT_PUBLIC_ARCHIVE_SERVICE_URL ||
  "http://localhost:5000";

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const PROXY_MAX_RETRIES = Number(process.env.ARCHIVE_PROXY_MAX_RETRIES || 1);
const PROXY_RETRY_DELAY_MS = Number(
  process.env.ARCHIVE_PROXY_RETRY_DELAY_MS || 700
);
const PROXY_RETRY_MAX_DELAY_MS = Number(
  process.env.ARCHIVE_PROXY_RETRY_MAX_DELAY_MS || 3000
);
const PROXY_TIMEOUT_MS = Number(
  process.env.ARCHIVE_PROXY_TIMEOUT_MS || 120000
);
const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50);
const MAX_FILE_SIZE_BYTES = Number.isFinite(MAX_FILE_SIZE_MB)
  ? MAX_FILE_SIZE_MB * 1024 * 1024
  : 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = Number.isFinite(MAX_FILE_SIZE_MB)
  ? `${MAX_FILE_SIZE_MB}MB`
  : "50MB";
const FILE_SIZE_ERROR_MESSAGE = `حجم الملف أكبر من الحد المسموح (${MAX_FILE_SIZE_LABEL}).`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isPdfFile = (file: File) => {
  const name = file.name?.toLowerCase() ?? "";
  return file.type === "application/pdf" || name.endsWith(".pdf");
};

const parseErrorPayload = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return { message: "", code: "" };
  }
  const data = payload as Record<string, unknown>;
  const errorObj = data.error as Record<string, unknown> | undefined;
  const message =
    (typeof data.message === "string" ? data.message : "") ||
    (typeof errorObj?.message === "string" ? errorObj.message : "");
  const code =
    (typeof data.code === "string" ? data.code : "") ||
    (typeof errorObj?.code === "string" ? errorObj.code : "");
  return { message, code };
};

export async function POST(request: Request) {
  let clientCodeForLog: string | null = null;
  let userForLog: Awaited<ReturnType<typeof getAuthUserFromCookies>> | null = null;
  try {
    const { searchParams } = new URL(request.url);
    const clientCode = searchParams.get("clientCode");
    clientCodeForLog = clientCode;
    if (!clientCode) {
      await recordAuditLog({
        action: "archive.upload",
        status: "failure",
        message: "حقل كود العميل مطلوب.",
        reason: "missing_client_code",
        request,
      });
      return NextResponse.json(
        { message: "حقل كود العميل مطلوب.", code: "INVALID_CLIENT_ID" },
        { status: 400 }
      );
    }

    const incomingForm = await request.formData();
    const filesFromFile = incomingForm
      .getAll("file")
      .filter((item): item is File => item instanceof File);
    const filesFromFiles = incomingForm
      .getAll("files")
      .filter((item): item is File => item instanceof File);
    const allFiles = [...filesFromFile, ...filesFromFiles];

    if (allFiles.length === 0) {
      await recordAuditLog({
        action: "archive.upload",
        status: "failure",
        message: "يجب إرسال ملف واحد على الأقل.",
        reason: "missing_file",
        request,
        clientCode,
      });
      return NextResponse.json(
        { message: "يجب إرسال ملف واحد على الأقل.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    if (allFiles.length > 1) {
      await recordAuditLog({
        action: "archive.upload",
        status: "failure",
        message: "يسمح برفع ملف واحد في كل مرة.",
        reason: "upload_limit",
        request,
        clientCode,
        details: { filesCount: allFiles.length },
      });
      return NextResponse.json(
        { message: "يسمح برفع ملف واحد في كل مرة.", code: "UPLOAD_LIMIT" },
        { status: 400 }
      );
    }

    const file = allFiles[0];
    if (!isPdfFile(file)) {
      await recordAuditLog({
        action: "archive.upload",
        status: "failure",
        message: "يسمح بملفات PDF فقط.",
        reason: "invalid_file_type",
        request,
        clientCode,
        details: { fileName: file.name, fileType: file.type },
      });
      return NextResponse.json(
        { message: "يسمح بملفات PDF فقط.", code: "INVALID_FILE_TYPE" },
        { status: 415 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      await recordAuditLog({
        action: "archive.upload",
        status: "failure",
        message: FILE_SIZE_ERROR_MESSAGE,
        reason: "file_too_large",
        request,
        clientCode,
        details: { size: file.size, max: MAX_FILE_SIZE_BYTES },
      });
      return NextResponse.json(
        { message: FILE_SIZE_ERROR_MESSAGE, code: "UPLOAD_LIMIT" },
        { status: 413 }
      );
    }

    const forwardedFor =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";

    const buildProxyForm = () => {
      const proxyForm = new FormData();
      proxyForm.append("files", file);
      return proxyForm;
    };

    const maxAttempts = Math.max(1, PROXY_MAX_RETRIES + 1);
    const user = await getAuthUserFromCookies().catch(() => null);
    userForLog = user;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let archiveRes: Response;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const controller =
          PROXY_TIMEOUT_MS > 0 ? new AbortController() : undefined;
        timeoutId = controller
          ? setTimeout(() => controller?.abort(), PROXY_TIMEOUT_MS)
          : undefined;

        archiveRes = await fetch(
          `${archiveBase}/api/archives/${clientCode}/upload`,
          {
            method: "POST",
            body: buildProxyForm(),
            headers: {
              ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
              "x-client-code": clientCode,
            },
            signal: controller?.signal,
          }
        );
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        if (attempt >= maxAttempts) {
          throw error;
        }
        const delayMs = Math.min(
          PROXY_RETRY_MAX_DELAY_MS,
          PROXY_RETRY_DELAY_MS * 2 ** (attempt - 1)
        );
        await sleep(delayMs);
        continue;
      }
      if (timeoutId) clearTimeout(timeoutId);

      const data =
        (await archiveRes.json().catch(async () => {
          try {
            const text = await archiveRes.text();
            return { raw: text };
          } catch {
            return {};
          }
        })) || {};

      if (archiveRes.ok) {
        await recordAuditLog({
          action: "archive.upload",
          status: "success",
          message: "تم رفع الملف إلى خدمة الأرشفة.",
          user: user ?? undefined,
          request,
          clientCode,
          details: {
            fileName: file.name,
            size: file.size,
          },
        });
        return NextResponse.json(data);
      }

      const { message, code } = parseErrorPayload(data);
      const canRetry =
        RETRYABLE_STATUSES.has(archiveRes.status) && attempt < maxAttempts;

      if (!canRetry) {
        await recordAuditLog({
          action: "archive.upload",
          status: "failure",
          message: message || "تعذر رفع الملف إلى خدمة الأرشفة.",
          reason: code || `status_${archiveRes.status}`,
          user: user ?? undefined,
          request,
          clientCode,
          details: { status: archiveRes.status },
        });
        return NextResponse.json(
          {
            message:
              message ||
              "تعذر رفع الملف إلى خدمة الأرشفة.",
            code,
          },
          { status: archiveRes.status }
        );
      }

      const retryAfter = archiveRes.headers.get("retry-after");
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
      const delayMs = Number.isFinite(retryAfterMs)
        ? Math.min(PROXY_RETRY_MAX_DELAY_MS, retryAfterMs)
        : Math.min(
            PROXY_RETRY_MAX_DELAY_MS,
            PROXY_RETRY_DELAY_MS * 2 ** (attempt - 1)
          );
      await sleep(delayMs);
    }

    await recordAuditLog({
      action: "archive.upload",
      status: "failure",
      message: "تعذر رفع الملف إلى خدمة الأرشفة.",
      reason: "max_retries_exceeded",
      user: user ?? undefined,
      request,
      clientCode,
    });
    return NextResponse.json(
      { message: "تعذر رفع الملف إلى خدمة الأرشفة." },
      { status: 502 }
    );
  } catch (error) {
    console.error("Archive upload proxy failed:", error);
    await recordAuditLog({
      action: "archive.upload",
      status: "failure",
      message: "حدث خطأ أثناء رفع الملف لخدمة الأرشفة.",
      reason: error instanceof Error ? error.message : "server_error",
      user: userForLog ?? undefined,
      request,
      clientCode: clientCodeForLog ?? undefined,
    });
    return NextResponse.json(
      { message: "حدث خطأ أثناء رفع الملف لخدمة الأرشفة." },
      { status: 500 }
    );
  }
}

