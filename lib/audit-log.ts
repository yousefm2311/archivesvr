import type { AuthUser } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { AuditLogModel } from "@/models/AuditLog";

type AuditLogStatus = "success" | "failure";
type AuditLogSource = "server" | "client";

export type AuditLogEntry = {
  action: string;
  status: AuditLogStatus;
  source?: AuditLogSource;
  message?: string;
  reason?: string;
  user?: Partial<AuthUser> | null;
  clientCode?: string;
  docId?: string | number;
  details?: Record<string, unknown>;
  request?: Request;
  meta?: {
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
  };
};

const getRequestMeta = (request?: Request) => {
  if (!request) return {};
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for") || "";
  const ip =
    forwardedFor.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "";
  const userAgent = headers.get("user-agent") || "";
  const path = new URL(request.url).pathname;
  return {
    method: request.method,
    path,
    ip,
    userAgent,
  };
};

const normalizeUser = (user?: Partial<AuthUser> | null) => {
  if (!user) return undefined;
  const empId = user.empId ? String(user.empId).trim() : "";
  const normalized = {
    empId,
    name: user.name ?? "",
    role: user.role ?? "",
    branch: user.branch ?? "",
    jobCode: user.jobCode ?? "",
  };
  const hasValue = Object.values(normalized).some((value) => value);
  return hasValue ? normalized : undefined;
};

export const recordAuditLog = async (entry: AuditLogEntry) => {
  try {
    await connectMongo();
    const meta = entry.meta ?? getRequestMeta(entry.request);
    await AuditLogModel.create({
      action: entry.action,
      status: entry.status,
      source: entry.source ?? "server",
      message: entry.message,
      reason: entry.reason,
      user: normalizeUser(entry.user),
      clientCode: entry.clientCode,
      docId: entry.docId ? String(entry.docId) : undefined,
      details: entry.details,
      meta,
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
};
