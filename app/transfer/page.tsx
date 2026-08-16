import { redirect } from "next/navigation";
import { getAuthUserFromCookies } from "@/lib/auth";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { getAllBranches } from "@/lib/branches";
import { TransferClient } from "./TransferClient";

export const metadata = {
  title: "تحويل عميل لفرع آخر",
};

export default async function TransferPage() {
  const user = await getAuthUserFromCookies();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessAllBranches(user)) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p className="text-lg font-semibold text-rose-600">ليست لديك صلاحية الوصول إلى صفحة التحويل.</p>
      </main>
    );
  }

  const branches = await getAllBranches();

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div
          className="rounded-2xl p-6 shadow-lg border"
          style={{
            background: "linear-gradient(120deg, var(--header-from), var(--header-to))",
            color: "var(--header-text)",
            borderColor: "var(--header-border)",
          }}
        >
          <div className="text-right space-y-2">
            <p className="text-base opacity-90">نقل عميل إلى فرع آخر مع تحديث صلاحيات الوصول.</p>
            <h1 className="text-2xl font-bold tracking-tight">تحويل عميل</h1>
            <p className="text-base opacity-90">اختر العميل والفرع الجديد ثم نفّذ التحويل.</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "var(--table-border)" }}>
          <TransferClient branches={branches} />
        </div>
      </div>
    </main>
  );
}
