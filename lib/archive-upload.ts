export type ArchiveUploadError = Error & {
  status?: number;
  code?: string;
  attempts?: number;
};

type UploadAttemptCallback = (attempt: number, maxAttempts: number) => void;

type UploadOptions = {
  clientCode: string;
  formData: FormData;
  maxRetries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  defaultErrorMessage?: string;
  timeoutMs?: number;
  timeoutMessage?: string;
  onAttempt?: UploadAttemptCallback;
};

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const NON_RETRYABLE_CODES = new Set([
  "INVALID_FILE_TYPE",
  "UPLOAD_LIMIT",
  "VALIDATION_ERROR",
  "INVALID_CLIENT_ID",
]);
const TIMEOUT_ERROR_CODE = "TIMEOUT";
const NETWORK_ERROR_CODE = "NETWORK_ERROR";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

const buildError = (message: string, details: Partial<ArchiveUploadError>) =>
  Object.assign(new Error(message), details) as ArchiveUploadError;

const DEFAULT_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_ARCHIVE_UPLOAD_TIMEOUT_MS ?? 120000
);

export async function uploadArchiveWithRetry({
  clientCode,
  formData,
  maxRetries = 2,
  minDelayMs = 700,
  maxDelayMs = 3000,
  defaultErrorMessage = "Archive upload failed.",
  timeoutMs,
  timeoutMessage,
  onAttempt,
}: UploadOptions) {
  const maxAttempts = Math.max(1, maxRetries + 1);
  let attempt = 0;
  let lastError: ArchiveUploadError = buildError(defaultErrorMessage, {});
  const requestTimeoutMs = Number.isFinite(timeoutMs)
    ? (timeoutMs as number)
    : DEFAULT_TIMEOUT_MS;
  const resolvedTimeoutMessage = timeoutMessage || defaultErrorMessage;

  while (attempt < maxAttempts) {
    attempt += 1;
    onAttempt?.(attempt, maxAttempts);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    try {
      if (requestTimeoutMs > 0) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller?.abort(), requestTimeoutMs);
      }
      const res = await fetch(
        `/api/archives/upload?clientCode=${encodeURIComponent(clientCode)}`,
        { method: "POST", body: formData, signal: controller?.signal },
      );
      if (timeoutId) clearTimeout(timeoutId);
      const data =
        (await res.json().catch(async () => {
          try {
            const text = await res.text();
            return { raw: text };
          } catch {
            return {};
          }
        })) || {};

      if (res.ok) {
        return { data, attempts: attempt };
      }

      const { message, code } = parseErrorPayload(data);
      lastError = buildError(message || defaultErrorMessage, {
        status: res.status,
        code,
        attempts: attempt,
      });

      const retryable =
        RETRYABLE_STATUSES.has(res.status) && !NON_RETRYABLE_CODES.has(code);
      if (!retryable || attempt >= maxAttempts) {
        throw lastError;
      }

      const retryAfter = res.headers.get("retry-after");
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
      const delayMs = Number.isFinite(retryAfterMs)
        ? Math.min(maxDelayMs, retryAfterMs)
        : Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1));
      await sleep(delayMs);
      continue;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      const isAbort = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof TypeError && !isAbort;
      const existingError =
        error && typeof error === "object"
          ? (error as ArchiveUploadError)
          : undefined;
      lastError = buildError(
        isAbort
          ? resolvedTimeoutMessage
          : error instanceof Error
            ? error.message
            : defaultErrorMessage,
        {
          attempts: attempt,
          status: existingError?.status,
          code:
            existingError?.code ??
            (isAbort
              ? TIMEOUT_ERROR_CODE
              : isNetworkError
                ? NETWORK_ERROR_CODE
                : undefined),
        },
      );
      if (attempt >= maxAttempts) {
        throw lastError;
      }
      const delayMs = Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1));
      await sleep(delayMs);
    }
  }

  throw lastError;
}

type ArchiveUploadErrorMessages = {
  invalidFileType: string;
  uploadLimit: string;
  validation: string;
  invalidClient: string;
  timeout: string;
  network: string;
  rateLimit: string;
  server: string;
  unauthorized: string;
  forbidden: string;
  notFound: string;
  fileTooLarge: string;
  unknown: string;
};

const DEFAULT_UPLOAD_ERROR_MESSAGES: ArchiveUploadErrorMessages = {
  invalidFileType: "نوع الملف غير مدعوم. المسموح ملفات PDF فقط.",
  uploadLimit: "تجاوزت الحد الأقصى لعدد الملفات أو حجمها. قلّل العدد أو الحجم ثم أعد المحاولة.",
  validation: "بيانات الملف غير مكتملة أو غير صحيحة. تأكد من اختيار المستند والملف.",
  invalidClient: "كود العميل غير صحيح أو غير موجود.",
  timeout: "انتهت مهلة الاتصال بخدمة الأرشفة. حاول مرة أخرى.",
  network: "تعذر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.",
  rateLimit: "تم تجاوز الحد المسموح للطلبات. انتظر قليلًا ثم أعد المحاولة.",
  server: "حدث خطأ في خدمة الأرشفة. حاول لاحقًا.",
  unauthorized: "غير مصرح لك برفع الملفات.",
  forbidden: "ليس لديك صلاحية رفع الملفات.",
  notFound: "خدمة الأرشفة غير متاحة حاليًا.",
  fileTooLarge: "حجم الملف أكبر من الحد المسموح.",
  unknown: "تعذر رفع الملف.",
};

export const getArchiveUploadErrorMessage = (
  error: unknown,
  overrides?: Partial<ArchiveUploadErrorMessages>,
) => {
  const messages = { ...DEFAULT_UPLOAD_ERROR_MESSAGES, ...overrides };
  const err =
    error && typeof error === "object" ? (error as ArchiveUploadError) : undefined;
  const code = err?.code;
  const status = err?.status;
  let message = "";

  if (code) {
    switch (code) {
      case "INVALID_FILE_TYPE":
        message = messages.invalidFileType;
        break;
      case "UPLOAD_LIMIT":
        message = messages.uploadLimit;
        break;
      case "VALIDATION_ERROR":
        message = messages.validation;
        break;
      case "INVALID_CLIENT_ID":
        message = messages.invalidClient;
        break;
      case TIMEOUT_ERROR_CODE:
        message = messages.timeout;
        break;
      case NETWORK_ERROR_CODE:
        message = messages.network;
        break;
      default:
        break;
    }
  }

  if (!message && typeof status === "number") {
    if (status === 401) message = messages.unauthorized;
    else if (status === 403) message = messages.forbidden;
    else if (status === 404) message = messages.notFound;
    else if (status === 408) message = messages.timeout;
    else if (status === 413) message = messages.fileTooLarge;
    else if (status === 415) message = messages.invalidFileType;
    else if (status === 429) message = messages.rateLimit;
    else if (status >= 500) message = messages.server;
  }

  if (!message && error instanceof TypeError) {
    message = messages.network;
  }

  if (!message && err?.message) {
    message = err.message;
  }

  if (!message) {
    message = messages.unknown;
  }

  const attempts =
    err && typeof err.attempts === "number" ? err.attempts : undefined;
  return attempts && attempts > 1 ? `${message} (بعد ${attempts} محاولات)` : message;
};
