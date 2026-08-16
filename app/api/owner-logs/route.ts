import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { AuditLogModel } from "@/models/AuditLog";

const OWNER_EMP_IDS = ["3425", "2673"];
export const runtime = "nodejs";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDateValue = (value: string, endOfDay: boolean) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

export async function GET(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json(
      { message: "الرجاء تسجيل الدخول." },
      { status: 401 }
    );
  }

  const currentEmpId = String(user.empId ?? "").trim();

  if (!OWNER_EMP_IDS.includes(currentEmpId)) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = Number(searchParams.get("page") ?? "1");
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = Number.isFinite(limitParam)
    ? Math.min(200, Math.max(10, limitParam))
    : 50;
  const skip = (page - 1) * limit;

  const status = (searchParams.get("status") ?? "").trim();
  const action = (searchParams.get("action") ?? "").trim();
  const empId = (searchParams.get("empId") ?? "").trim();
  const clientCode = (searchParams.get("clientCode") ?? "").trim();
  const docId = (searchParams.get("docId") ?? "").trim();
  const query = (searchParams.get("q") ?? "").trim();
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (action) filter.action = { $regex: escapeRegex(action), $options: "i" };
  if (empId) filter["user.empId"] = empId;
  if (clientCode)
    filter.clientCode = { $regex: escapeRegex(clientCode), $options: "i" };
  if (docId) filter.docId = docId;

  const fromDate = parseDateValue(dateFrom, false);
  const toDate = parseDateValue(dateTo, true);
  if (fromDate || toDate) {
    const range: Record<string, Date> = {};
    if (fromDate) range.$gte = fromDate;
    if (toDate) range.$lte = toDate;
    filter.createdAt = range;
  }

  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    filter.$or = [
      { action: regex },
      { message: regex },
      { reason: regex },
      { "user.name": regex },
      { "user.empId": regex },
      { "meta.path": regex },
    ];
  }

  await connectMongo();

  const [logs, total] = await Promise.all([
    AuditLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  const normalized = logs.map((log) => ({
    id: (log as any)._id?.toString?.() ?? "",
    action: (log as any).action,
    status: (log as any).status,
    message: (log as any).message,
    reason: (log as any).reason,
    user: (log as any).user,
    clientCode: (log as any).clientCode,
    docId: (log as any).docId,
    details: (log as any).details,
    meta: (log as any).meta,
    createdAt: (log as any).createdAt,
  }));

  return NextResponse.json({
    logs: normalized,
    total,
    page,
    limit,
  });
}
