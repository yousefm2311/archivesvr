"use client";

import { useEffect, useMemo, useState } from "react";

type AuditLogUser = {
  empId?: string;
  name?: string;
  role?: string;
  branch?: string;
  jobCode?: string;
};

type AuditLogRow = {
  id: string;
  action?: string;
  status?: "success" | "failure";
  message?: string;
  reason?: string;
  user?: AuditLogUser;
  clientCode?: string;
  docId?: string;
  details?: Record<string, unknown>;
  meta?: {
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
  };
  createdAt?: string;
};

type ApiResponse = {
  logs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 50;

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-EG");
};

const formatDetails = (details?: Record<string, unknown>) => {
  if (!details || Object.keys(details).length === 0) return "-";
  try {
    const text = JSON.stringify(details);
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  } catch {
    return "-";
  }
};

export default function OwnerLogsClient() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [filters, setFilters] = useState({
    status: "",
    action: "",
    empId: "",
    clientCode: "",
    docId: "",
    query: "",
    dateFrom: "",
    dateTo: "",
  });
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const fetchLogs = async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", String(nextLimit));
      if (filters.status) params.set("status", filters.status);
      if (filters.action) params.set("action", filters.action);
      if (filters.empId) params.set("empId", filters.empId);
      if (filters.clientCode) params.set("clientCode", filters.clientCode);
      if (filters.docId) params.set("docId", filters.docId);
      if (filters.query) params.set("q", filters.query);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const response = await fetch(`/api/owner-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "تعذر تحميل السجلات.");
      }
      setData(payload);
      setPage(payload.page);
      setLimit(payload.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل السجلات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setPage(1);
    void fetchLogs(1, limit);
  };

  const handleReset = () => {
    const reset = {
      status: "",
      action: "",
      empId: "",
      clientCode: "",
      docId: "",
      query: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(reset);
    setPage(1);
    void fetchLogs(1, limit);
  };

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
    void fetchLogs(safePage, limit);
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    setPage(1);
    void fetchLogs(1, value);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div
          className="rounded-2xl p-6 shadow-lg border"
          style={{
            background:
              "linear-gradient(120deg, var(--header-from), var(--header-to))",
            color: "var(--header-text)",
            borderColor: "var(--header-border)",
          }}
        >
          <div className="text-right space-y-2">
            <p className="text-sm opacity-90">
              لوحة مراقبة السجلات الكاملة للنظام.
            </p>
            <h1 className="text-3xl font-bold tracking-tight">سجل العمليات</h1>
            <p className="text-sm opacity-90">
              استعرض كل العمليات الناجحة والفاشلة مع سبب الخطأ ومصدر الطلب.
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl border bg-white p-5 shadow-sm"
          style={{
            borderColor: "var(--header-border)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">بحث عام</label>
              <input
                value={filters.query}
                onChange={(e) =>
                  setFilters({ ...filters, query: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
                placeholder="نص الرسالة أو المسار أو اسم الموظف"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">الحالة</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
              >
                <option value="">الكل</option>
                <option value="success">ناجح</option>
                <option value="failure">فشل</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">الإجراء</label>
              <input
                value={filters.action}
                onChange={(e) =>
                  setFilters({ ...filters, action: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
                placeholder="مثال: document.save"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">رقم الموظف</label>
              <input
                value={filters.empId}
                onChange={(e) =>
                  setFilters({ ...filters, empId: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
                placeholder="مثال: 3425"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">كود العميل</label>
              <input
                value={filters.clientCode}
                onChange={(e) =>
                  setFilters({ ...filters, clientCode: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
                placeholder="مثال: 10012"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">رقم المستند</label>
              <input
                value={filters.docId}
                onChange={(e) =>
                  setFilters({ ...filters, docId: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
                placeholder="DocId"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">من تاريخ</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">إلى تاريخ</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                تحديث السجلات
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                مسح الفلاتر
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>عدد الصفوف:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border bg-white shadow-sm overflow-hidden"
          style={{
            borderColor: "var(--header-border)",
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">السجلات</p>
              <p className="text-xs text-slate-500">
                {data
                  ? `الإجمالي ${data.total} سجل`
                  : "ابدأ بالضغط على تحديث السجلات"}
              </p>
            </div>
            {loading ? (
              <span className="text-xs text-slate-400">جاري التحميل...</span>
            ) : null}
          </div>

          {error ? (
            <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
          ) : null}

          <div className="overflow-auto">
            <table className="min-w-full  text-xs text-right">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">الوقت</th>
                  <th className="px-4 py-3">الإجراء</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">المستند</th>
                  <th className="px-4 py-3">الرسالة</th>
                  <th className="px-4 py-3">السبب</th>
                  <th className="px-4 py-3">المسار</th>
                  <th className="px-4 py-3">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {data?.logs?.length ? (
                  data.logs.map((row) => (
                    <tr key={row.id} className="border-t border-slate-700">
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {row.action || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`status-pill ${
                            row.status === "success"
                              ? "status-pill-success"
                              : row.status === "failure"
                                ? "status-pill-failure"
                                : "status-pill-unknown"
                          }`}
                        >
                          {row.status === "success"
                            ? "ناجح"
                            : row.status === "failure"
                              ? "فشل"
                              : "غير معروف"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>{row.user?.name || "-"}</div>
                        <div className="text-[10px] text-slate-400">
                          {row.user?.empId || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {row.clientCode || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {row.docId || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {row.message || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-rose-600">
                        {row.reason || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {row.meta?.path || "-"}
                      </td>
                      <td
                        className="px-4 py-3 text-xs text-slate-500"
                        title={formatDetails(row.details)}
                      >
                        {formatDetails(row.details)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      لا توجد سجلات بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            <div>
              الصفحة {data?.page ?? page} من {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange((data?.page ?? page) - 1)}
                disabled={(data?.page ?? page) <= 1 || loading}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold disabled:opacity-50"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => handlePageChange((data?.page ?? page) + 1)}
                disabled={(data?.page ?? page) >= totalPages || loading}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
