"use client";

import { useEffect, useState } from "react";

type AggRow = {
  _id: string;
  documents: number;
  clientName?: string;
  branchName?: string;
  branchCode?: string;
};

type Props = {
  initialRows: AggRow[];
  initialTotal: number;
  pageSize: number;
  initialPage: number;
  selectedBranch: string;
  clientCode: string;
  clientName: string;
  dateFrom: string;
  dateTo: string;
};

type PageResponse = {
  items: AggRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function PerClientSection({
  initialRows,
  initialTotal,
  pageSize,
  initialPage,
  selectedBranch,
  clientCode,
  clientName,
  dateFrom,
  dateTo,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialRows, initialTotal, initialPage, selectedBranch, clientCode, clientName, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPagination = total > pageSize;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const buildQuery = (nextPage: number) => {
    const query = new URLSearchParams();
    if (selectedBranch) query.set("branch", selectedBranch);
    if (clientCode) query.set("clientCode", clientCode);
    if (clientName) query.set("clientName", clientName);
    if (dateFrom) query.set("dateFrom", dateFrom);
    if (dateTo) query.set("dateTo", dateTo);
    if (nextPage > 1) query.set("page", String(nextPage));
    return query.toString();
  };

  const updateUrl = (nextPage: number) => {
    if (typeof window === "undefined") return;
    const qs = buildQuery(nextPage);
    const nextUrl = qs ? `/reports/client-docs?${qs}` : "/reports/client-docs";
    window.history.replaceState(null, "", nextUrl);
  };

  const fetchPage = async (nextPage: number) => {
    if (loading || nextPage === page) return;
    setLoading(true);
    try {
      const qs = buildQuery(nextPage);
      const res = await fetch(`/api/reports/client-docs/per-client${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load per-client data.");
      }

      const data = (await res.json()) as PageResponse;
      const items = Array.isArray(data.items) ? data.items : [];
      const totalCount = typeof data.total === "number" ? data.total : 0;
      const resolvedPage = typeof data.page === "number" ? data.page : nextPage;

      setRows(items);
      setTotal(totalCount);
      setPage(resolvedPage);
      updateUrl(resolvedPage);
    } catch (error) {
      console.error("Load per-client page failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (canPrev) fetchPage(page - 1);
  };

  const handleNext = () => {
    if (canNext) fetchPage(page + 1);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-strong)]">
          تفاصيل المستندات حسب العميل
        </h2>
        <span className="text-sm text-[var(--text-muted)]">
          إجمالي {total} | صفحة {page}/{totalPages}
        </span>
      </div>
      {rows.length > 0 ? (
        <div
          className="overflow-x-auto rounded-xl border bg-white shadow-sm"
          style={{ borderColor: "var(--table-border)" }}
        >
          <table className="min-w-full text-right">
            <thead className="table-head text-sm">
              <tr>
                <th className="px-4 py-3">كود العميل</th>
                <th className="px-4 py-3">اسم العميل</th>
                <th className="px-4 py-3">الفرع</th>
                <th className="px-4 py-3">عدد المستندات</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((row, idx) => (
                <tr key={idx} className="table-row border-t">
                  <td className="px-4 py-2 table-cell">{row._id ?? "-"}</td>
                  <td className="px-4 py-2 table-cell">
                    {row.clientName ?? "-"}
                  </td>
                  <td className="px-4 py-2 table-cell">
                    {row.branchName ?? row.branchCode ?? "-"}
                  </td>
                  <td className="px-4 py-2 table-cell">
                    {row.documents ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] text-right">
          لا توجد بيانات متاحة لتفاصيل العملاء.
        </p>
      )}
      {hasPagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[var(--text-muted)]">10 لكل صفحة</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canPrev || loading}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold next-btn ${
                !canPrev || loading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              السابق
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext || loading}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold next-btn ${
                !canNext || loading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              التالي
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
