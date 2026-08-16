import { redirect } from "next/navigation";
import { getAuthUserFromCookies } from "@/lib/auth";
import { ClientHeader } from "@/components/ClientHeader";
import { DocumentsClient, DocumentRecord } from "./DocumentsClient";
import { connectMongo } from "@/lib/mongo";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { ClientModel } from "@/models/Client";
import { correctDocName } from "@/lib/documents";
import { getUserBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";

export default async function DocumentsPage({
  params,
}: {
  params: { clientCode: string };
}) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    redirect("/login");
  }

  const canViewAll = canAccessAllBranches(user);
  const branch = getUserBranch(user);

  const clientCode = Number(params.clientCode);
  if (Number.isNaN(clientCode)) {
    redirect("/home");
  }

  await connectMongo();
  const docs = await ClientDocumentModel.find(
    canViewAll ? { clientCode } : { clientCode, branch }
  )
    .sort({ createdAt: -1 })
    .lean();

  const documents: DocumentRecord[] = docs.map((doc) => ({
    DocId: (doc._id ?? "").toString(),
    DocName: correctDocName(doc.docName),
    DocDate: doc.docDate,
    FilePath: doc.fileUrl as string,
    UploadedBy: doc.uploadedBy as string | number | undefined,
    CreatedAt: doc.createdAt,
    ClientName: doc.clientName,
  }));

  let clientName = documents[0]?.ClientName;
  if (!clientName) {
    const client = await ClientModel.findOne(
      canViewAll ? { clientCode } : { clientCode, createdBranch: branch }
    ).lean();
    clientName = client?.clientName;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <ClientHeader
          clientCode={clientCode}
          clientName={clientName}
          subtitle="تعديل أو استبدال مستندات العميل"
        />
        <DocumentsClient docs={documents} clientCode={clientCode} clientName={clientName} />
      </div>
    </main>
  );
}
