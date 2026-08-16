"use client";

import { useMemo, useState } from "react";

type DocRecord = {
  DocId: string | number;
  DocName: string;
  DocDate?: string | Date | null;
  FilePath?: string;
  filePath?: string;
  Branch?: string;
  BranchName?: string;
  CreatedAt?: string | Date;
};

const toInputDate = (value?: string | Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export default function DocumentsLookupPage() {
  const [clientCode, setClientCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const hasDocs = useMemo(() => docs.length > 0, [docs]);

  const loadDocs = async () => {
    const code = clientCode.trim();
    if (!code) return;

    setLoading(true);
    setMessage("");
    setError("");
    setDocs([]);
    setUnauthorized(false);

    try {
      const clientRes = await fetch(`/api/clients?code=${encodeURIComponent(code)}`, {
        credentials: "include",
      });
      const clientData = await clientRes.json().catch(() => ({}));

      if (!clientData?.client) {
        setMessage("العميل غير موجود.");
        setClientName("");
        return;
      }

      setClientName(clientData.client.clientName || "");

      if (clientData.unauthorized) {
        setUnauthorized(true);
        setMessage(clientData.denyReason || "هذا العميل مسجّل بفرع آخر ولا تملك صلاحية العرض.");
        window.confirm("هذا العميل مسجّل بفرع آخر ولا تملك صلاحية العرض.");
        return;
      }

      const docsRes = await fetch(`/api/clients/${encodeURIComponent(code)}`, {
        credentials: "include",
      });
      const docsData = await docsRes.json().catch(() => ({}));

      if (docsData.unauthorized) {
        setUnauthorized(true);
        setMessage(docsData.denyReason || "هذا العميل مسجّل بفرع آخر ولا تملك صلاحية العرض.");
        window.confirm("هذا العميل مسجّل بفرع آخر ولا تملك صلاحية العرض.");
        return;
      }

      setDocs(docsData.documents ?? []);
      if ((docsData.documents ?? []).length === 0) {
        setMessage("لا توجد مستندات محفوظة لهذا العميل.");
      } else {
        setMessage("تم تحميل مستندات العميل.");
      }
    } catch {
      setError("تعذر تحميل البيانات، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAllAsZip = async () => {
    if (!docs.length) {
      setError("لا توجد مستندات للتحميل.");
      return;
    }

    setError("");
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/documents/download-all?clientCode=${encodeURIComponent(clientCode.trim())}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(async () => {
          try {
            return { message: await res.text() };
          } catch {
            return {};
          }
        });
        throw new Error(data.message || "تعذر تنزيل الأرشيف، حاول مرة أخرى.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ClientDocs_${clientCode}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تنزيل الأرشيف، حاول مرة أخرى.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main
      className="min-h-screen px-4 py-8"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="text-right space-y-1">
            <p className="text-lg text-[var(--text-muted)]">استعلام عن مستندات عميل</p>
            <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
              تحميل مستندات العميل
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-base font-medium text-[var(--text-strong)] text-right">
                كود العميل
              </label>
              <input
                type="text"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    loadDocs();
                  }
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="اكتب كود العميل"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={loadDocs}
                disabled={loading}
                className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
              >
                {loading ? "جاري التحميل..." : "تحميل المستندات"}
              </button>
            </div>
          </div>
          {clientName ? (
            <div className="rounded-lg border border-slate-500 bg-slate-50 px-4 py-3 text-right">
              <p className="text-lg text-[var(--text-strong)]">
                <span className=" text-[var(--text-strong)]">اسم العميل:</span>{"    "}
                {clientName}
              </p>
            </div>
          ) : null}
          {message ? (
            <p className={`text-lg text-right ${unauthorized ? "text-rose-600" : "text-[var(--text-strong)]"}`}>
              {message}
            </p>
          ) : null}
          {error ? <p className="text-sm text-rose-600 text-right">{error}</p> : null}
        </div>

        {!unauthorized && hasDocs ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">مستندات العميل</h2>
              <button
                type="button"
                onClick={downloadAllAsZip}
                disabled={downloading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
              >
                {downloading ? "جاري التحميل..." : "تحميل كل المستندات (ZIP)"}
              </button>
            </div>
            <div
              className="overflow-x-auto rounded-lg border"
              style={{ borderColor: "var(--table-border)" }}
            >
              <table className="min-w-full text-right">
                <thead className="table-head text-sm">
                  <tr>
                    <th className="px-4 text-lg py-2">اسم المستند</th>
                    <th className="px-4 text-lg py-2">الفرع</th>
                    <th className="px-4 text-lg py-2">تاريخ المستند</th>
                    {/* <th className="px-4 text-lg py-2">تاريخ الرفع</th> */}
                    <th className="px-4 text-lg py-2">الملف</th>
                  </tr>
                </thead>
                <tbody className="text-lg">
                  {docs.map((doc) => (
                    <tr key={doc.DocId} className="table-row border-t">
                      <td className="px-4 py-2 table-cell">{doc.DocName}</td>
                      <td className="px-4 py-2 table-cell">
                        {doc.BranchName ?? doc.Branch ?? "-"}
                      </td>
                      <td className="px-4 py-2 table-cell">{toInputDate(doc.DocDate) || "-"}</td>
                      {/* <td className="px-4 py-2 table-cell">
                        {toInputDate(doc.CreatedAt) || "-"}
                      </td> */}
                      <td className="px-4 py-2 table-cell">
                        <a
                          href={`/documents/view/${doc.DocId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="table-link underline"
                        >
                          عرض الملف
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
