import { redirect } from "next/navigation";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { normalizeBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";

export default async function ViewDocumentPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    redirect("/login");
  }

  const { docId } = await params;

  await connectMongo();
  const doc = await ClientDocumentModel.findById(docId).lean();

  if (!doc) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center text-slate-700 space-y-2">
          <p className="text-lg font-semibold">المستند غير موجود</p>
          <p className="text-sm text-slate-500">
            تأكد من صحة الرابط أو جرّب العودة إلى صفحة العميل.
          </p>
        </div>
      </main>
    );
  }

  const fileUrl = `/api/documents/file?docId=${docId}`;

  const userBranch = normalizeBranch(user.branch);
  const docBranch = normalizeBranch((doc as any).branch);
  const isAdmin = canAccessAllBranches(user);

  if (!isAdmin && docBranch && docBranch !== userBranch) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center text-slate-700 space-y-2">
          <p className="text-lg font-semibold">غير مصرح لك بعرض هذا المستند</p>
          <p className="text-sm text-slate-500">العميل مسجل في فرع مختلف</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-sm text-slate-500">تفاصيل المستند</p>
            <h1 className="text-2xl font-semibold text-slate-900">{doc.docName}</h1>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-semibold hover:bg-sky-700"
          >
            فتح الملف في تبويب جديد
          </a>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <iframe
            src={fileUrl}
            title={doc.docName}
            className="w-full h-[80vh]"
            allow="fullscreen"
          />
        </div>
      </div>
    </main>
  );
}
