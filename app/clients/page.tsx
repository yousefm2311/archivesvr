import { redirect } from "next/navigation";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientModel } from "@/models/Client";
import ClientsList from "./ClientsList";
import { getUserBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";

export default async function ClientsPage() {
  const user = await getAuthUserFromCookies();
  if (!user) {
    redirect("/login");
  }

  await connectMongo();
  const canViewAll = canAccessAllBranches(user);
  const branch = getUserBranch(user);
  const filter = canViewAll ? {} : { createdBranch: branch };

  const initialClients = await ClientModel.find(filter)
    .sort({ clientCode: 1 })
    .limit(20)
    .lean();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-sm text-slate-500">قائمة العملاء</p>
            <h1 className="text-2xl font-semibold text-slate-900">العملاء</h1>
          </div>
        </div>
        <ClientsList
          initialClients={initialClients.map((c) => ({
            id: (c._id ?? "").toString(),
            clientCode: c.clientCode,
            clientName: c.clientName,
            createdAt: c.createdAt,
          }))}
        />
      </div>
    </main>
  );
}
