type ArchiveHealthResponse = {
  ok?: boolean;
  status?: string;
};

type ArchiveHealthResult = {
  ok: boolean;
  status: string;
};

const DEFAULT_TTL_MS = 15000;
const HEALTH_TTL_RAW = Number(
  process.env.NEXT_PUBLIC_ARCHIVE_HEALTH_TTL_MS ?? DEFAULT_TTL_MS,
);
const HEALTH_TTL_MS =
  Number.isFinite(HEALTH_TTL_RAW) && HEALTH_TTL_RAW > 0 ? HEALTH_TTL_RAW : 0;

let lastCheckedAt = 0;
let lastResult: ArchiveHealthResult | null = null;
let inFlight: Promise<ArchiveHealthResult> | null = null;

const normalizeResult = (ok: boolean, status?: string): ArchiveHealthResult => ({
  ok,
  status: typeof status === "string" && status ? status : ok ? "ok" : "unavailable",
});

const fetchHealth = async (): Promise<ArchiveHealthResult> => {
  try {
    const res = await fetch("/api/archives/health", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as ArchiveHealthResponse;
    return normalizeResult(res.ok && data.ok === true, data.status);
  } catch {
    return normalizeResult(false, "unavailable");
  }
};

export const checkArchiveHealth = async (options?: { force?: boolean }) => {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force) {
    if (inFlight) return inFlight;
    if (
      HEALTH_TTL_MS > 0 &&
      lastResult &&
      now - lastCheckedAt < HEALTH_TTL_MS
    ) {
      return lastResult;
    }
  }

  inFlight = fetchHealth().finally(() => {
    inFlight = null;
  });

  const result = await inFlight;
  lastResult = result;
  lastCheckedAt = Date.now();
  return result;
};

export const ensureArchiveAvailable = async (
  message = "Archive service is unavailable.",
) => {
  const { ok } = await checkArchiveHealth();
  if (!ok) {
    throw new Error(message);
  }
};
