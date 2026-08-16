import { StatsCard } from "@/components/StatsCard";
import { getAuthUserFromCookies } from "@/lib/auth";
import { getAllBranches, getBranchName } from "@/lib/branches";
import { connectMongo } from "@/lib/mongo";
import { getUserBranch, normalizeBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { redirect } from "next/navigation";
import { ClientDocsFilters } from "./ClientDocsFilters";
import { PerClientSection } from "./PerClientSection";

type AggRow = { _id: string; documents: number };
type PerClientRow = AggRow & { clientName?: string; branchName?: string; branchCode?: string };
type PerClientFacet = { page: PerClientRow[]; total: { count: number }[] };

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

type Props = {
  searchParams: Promise<{
    branch?: string;
    page?: string;
    clientCode?: string;
    clientName?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function ClientDocsReportPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getAuthUserFromCookies();
  if (!user) redirect("/login");

  await connectMongo();

  const pageSize = 10;
  const pageParam = Number(params?.page ?? "1");
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const skip = (currentPage - 1) * pageSize;

  const userBranch = normalizeBranch(getUserBranch(user));
  const isAdmin = canAccessAllBranches(user);
  const selectedBranch = normalizeBranch(params?.branch ?? (isAdmin ? "" : userBranch));
  const clientCode = (params?.clientCode ?? "").trim();
  const clientName = (params?.clientName ?? "").trim();
  const dateFrom = params?.dateFrom ?? "";
  const dateTo = params?.dateTo ?? "";

  const branches = await getAllBranches();
  const branchName = userBranch ? await getBranchName(userBranch) : "";

  const docMatch: Record<string, unknown> = isAdmin
    ? selectedBranch
      ? { branch: selectedBranch }
      : {}
    : { branch: userBranch };

  if (clientCode) {
    docMatch.clientCode = { $regex: escapeRegex(clientCode), $options: "i" };
  }

  if (clientName) {
    docMatch.clientName = { $regex: escapeRegex(clientName), $options: "i" };
  }

  const fromDate = parseDateValue(dateFrom, false);
  const toDate = parseDateValue(dateTo, true);
  if (fromDate || toDate) {
    const range: Record<string, Date> = {};
    if (fromDate) range.$gte = fromDate;
    if (toDate) range.$lte = toDate;
    docMatch.docDate = range;
  }

  const [perClientFacet, topClients, topUsers, totalDocs] = await Promise.all([
    ClientDocumentModel.aggregate<PerClientFacet>([
      { $match: docMatch },
      { $group: { _id: "$clientCode", documents: { $sum: 1 } } },
      { $sort: { documents: -1 } },
      {
        $facet: {
          page: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $lookup: {
                from: "clients",
                localField: "_id",
                foreignField: "clientCode",
                as: "client",
              },
            },
            { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                documents: 1,
                clientName: "$client.clientName",
                branchName: "$client.createdBranchName",
                branchCode: "$client.createdBranch",
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]),
    ClientDocumentModel.aggregate<AggRow>([
      { $match: docMatch },
      { $group: { _id: "$clientCode", documents: { $sum: 1 } } },
      { $sort: { documents: -1 } },
      { $limit: 5 },
    ]),
    ClientDocumentModel.aggregate<AggRow>([
      { $match: docMatch },
      { $group: { _id: "$uploadedBy", documents: { $sum: 1 } } },
      { $sort: { documents: -1 } },
      { $limit: 5 },
    ]),
    ClientDocumentModel.countDocuments(docMatch),
  ]);

  const perClient = perClientFacet[0]?.page ?? [];
  const perClientTotal = perClientFacet[0]?.total?.[0]?.count ?? 0;
  const totalClients = perClientTotal;

  const topClient = topClients[0];
  const topUser = topUsers[0];
  const maxClientDocs = Math.max(...topClients.map((r) => r.documents || 0), 1);
  const maxUserDocs = Math.max(...topUsers.map((r) => r.documents || 0), 1);

  return (
    <main
      className="min-h-screen px-6 py-8"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div
          className="rounded-2xl p-6 shadow-lg border"
          style={{
            background: "linear-gradient(120deg, var(--header-from), var(--header-to))",
            color: "var(--header-text)",
            borderColor: "var(--header-border)",
          }}
        >
          <div className="flex flex-col gap-2 text-right">
            <p className="text-x opacity-90">نظرة عامة على مستندات العملاء داخل النظام.</p>
            <h1 className="text-3xl font-bold tracking-tight">تقارير مستندات العملاء</h1>
            <p className="text-lg opacity-90">
              {isAdmin
                ? "يمكنك استعراض جميع الفروع أو تصفية النتائج حسب الفرع."
                : `تقارير المستندات لفرعك: ${branchName || userBranch || "غير متوفر"}`}
            </p>
            <ClientDocsFilters
              branches={branches}
              selectedBranch={selectedBranch}
              clientCode={clientCode}
              clientName={clientName}
              dateFrom={dateFrom}
              dateTo={dateTo}
              canSelectBranch={isAdmin}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="إجمالي المستندات" value={totalDocs} />
          <StatsCard title="إجمالي العملاء" value={totalClients} />
          <StatsCard
            title="أكثر عميل لديه مستندات"
            value={topClient ? topClient._id : "لا توجد بيانات"}
            hint={topClient ? `${topClient.documents} مستند` : "لا توجد بيانات للعملاء"}
          />
          <StatsCard
            title="أكثر موظف رفع مستندات"
            value={topUser ? topUser._id : "لا توجد بيانات"}
            hint={topUser ? `${topUser.documents} مستند` : "لا توجد بيانات للموظفين"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--table-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-right">
                <p className="text-sm text-[var(--text-muted)]">الأكثر رفعاً حسب العملاء</p>
                <h3 className="text-lg font-semibold text-[var(--text-strong)]">أكثر العملاء رفعاً للمستندات</h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">أفضل 5</span>
            </div>
            <div className="space-y-3">
              {topClients.length ? (
                topClients.map((row, idx) => {
                  const percent = Math.round((row.documents / maxClientDocs) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-strong)]">عميل #{row._id ?? "-"}</span>
                        <span>{row.documents} مستند</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: "var(--table-border)" }}>
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percent}%`,
                            background: "linear-gradient(90deg, #0ea5e9, #22c55e)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--text-muted)] text-right">لا توجد بيانات متاحة.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--table-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-right">
                <p className="text-sm text-[var(--text-muted)]">الأكثر رفعاً حسب الموظفين</p>
                <h3 className="text-lg font-semibold text-[var(--text-strong)]">أكثر الموظفين رفعاً للمستندات</h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">أفضل 5</span>
            </div>
            <div className="space-y-3">
              {topUsers.length ? (
                topUsers.map((row, idx) => {
                  const percent = Math.round((row.documents / maxUserDocs) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-strong)]">موظف #{row._id ?? "-"}</span>
                        <span>{row.documents} مستند</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: "var(--table-border)" }}>
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percent}%`,
                            background: "linear-gradient(90deg, #a855f7, #22c55e)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--text-muted)] text-right">لا توجد بيانات متاحة.</p>
              )}
            </div>
          </div>
        </div>

        <PerClientSection
          initialRows={perClient}
          initialTotal={perClientTotal}
          pageSize={pageSize}
          initialPage={currentPage}
          selectedBranch={selectedBranch}
          clientCode={clientCode}
          clientName={clientName}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </div>
    </main>
  );
}
