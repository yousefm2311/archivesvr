import { getAuthUserFromCookies } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Actions } from "./Actions";
import { getBranchName } from "@/lib/branches";

export default async function HomePage() {
  const user = await getAuthUserFromCookies();

  if (!user) {
    redirect("/login");
  }

  const branchName = await getBranchName(user.branch);
  const branchDisplay = branchName || user.branch || "غير متوفر";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header
          className="flex items-center justify-between rounded-2xl p-6 shadow-lg border"
          style={{
            background: "linear-gradient(90deg, var(--header-from), var(--header-to))",
            color: "var(--header-text)",
            borderColor: "var(--header-border)",
          }}
        >
          <div className="flex flex-col text-right" style={{ color: "var(--header-text)" }}>
            <p className="text-sm">مرحباً بعودتك</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {user?.name || "مستخدم"} <span className="text-sm opacity-90">/ {user?.empId}</span>
            </h1>
          </div>
          <div
            className="hidden md:flex items-center gap-3 text-sm"
            style={{ color: "var(--header-text)" }}
          >
            <div className="header-btn px-4 py-2 rounded-full border">
              كود الموظف: <span className="font-semibold">{user?.empId}</span>
            </div>
            <div className="header-btn px-4 py-2 rounded-full border">
              الفرع: <span className="font-semibold">{branchDisplay}</span>
            </div>
          </div>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-[var(--text-muted)]">اختر المهمة المطلوبة</p>
                <h2 className="text-2xl font-semibold text-[var(--text-strong)]">
                  إدارة العملاء ومستنداتهم
                </h2>
              </div>
            </div>
            <Actions />
          </div>
        </div>
      </div>
    </main>
  );
}
