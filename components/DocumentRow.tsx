"use client";

import { useState } from "react";

type DocumentRowProps = {
  doc: {
    DocId: string | number;
    DocName: string;
    DocDate?: string | null;
    FilePath?: string;
    filePath?: string;
    UploadedBy?: number | string;
    CreatedAt?: string | Date;
  };
  onDeleted?: (docId: string | number) => void;
};

export function DocumentRow({ doc, onDeleted }: DocumentRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleView = () => {
    window.open(`/documents/view/${doc.DocId}`, "_blank");
  };

  const handleDelete = async () => {
    const ok = window.confirm("سيتم حذف المستند والملف نهائياً. هل أنت متأكد؟");
    if (!ok) return;

    setError("");
    setIsDeleting(true);
    try {
      const res = await fetch("/api/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.DocId }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "حدث خطأ أثناء الحذف");
      }
      onDeleted?.(doc.DocId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col text-right">
          <span className="text-sm text-slate-500">اسم المستند</span>
          <span className="text-base font-semibold text-slate-900">{doc.DocName}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleView}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            عرض
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700 disabled:opacity-70"
          >
            {isDeleting ? "جارٍ الحذف..." : "حذف"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div className="flex flex-col">
          <span className="text-slate-500">تاريخ المستند</span>
          <span>
            {doc.DocDate ? new Date(doc.DocDate).toLocaleDateString() : "-"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-500">مسار الملف</span>
          <span className="break-all">{doc.FilePath ?? doc.filePath ?? "-"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-500">تم الرفع بواسطة</span>
          <span>{doc.UploadedBy ?? "-"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-500">تاريخ الإنشاء</span>
          <span>
            {doc.CreatedAt ? new Date(doc.CreatedAt).toLocaleString() : "-"}
          </span>
        </div>
      </div>
      {error ? <p className="text-xs text-rose-600 text-right">{error}</p> : null}
    </div>
  );
}
