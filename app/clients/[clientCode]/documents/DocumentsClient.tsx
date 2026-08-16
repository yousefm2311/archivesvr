"use client";

import { useMemo, useState } from "react";
import {
  DOC_TYPES,
  OTHER_DOC_TYPE,
  extractFileUrl,
  correctDocName,
  renameFileWithClientCode,
} from "@/lib/documents";
import { getArchiveUploadErrorMessage, uploadArchiveWithRetry } from "@/lib/archive-upload";
import { logClientEvent } from "@/lib/client-log";
import { ensureArchiveAvailable } from "@/lib/archive-health";

export type DocumentRecord = {
  DocId: string | number;
  DocName: string;
  DocDate?: string | null;
  FilePath?: string;
  filePath?: string;
  UploadedBy?: number | string;
  CreatedAt?: string | Date;
  ClientName?: string;
  Branch?: string;
};

type EditableDoc = DocumentRecord & {
  docType: string;
  customName: string;
  docDateStr: string;
  file?: File;
  fileLabel?: string;
  saving?: boolean;
  error?: string;
};

type Props = {
  docs: DocumentRecord[];
  clientCode: number;
  clientName?: string;
};

const toInputDate = (date?: string | Date | null) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const isPdfFile = (file: File) => {
  const name = file.name?.toLowerCase() ?? "";
  return file.type === "application/pdf" || name.endsWith(".pdf");
};

const isFileSizeOk = (file: File) => file.size <= MAX_FILE_SIZE_BYTES;

const ARCHIVE_MAX_RETRIES = 2;
const ARCHIVE_UNAVAILABLE_MESSAGE =
  "خدمة الأرشفة غير متاحة، حاول لاحقًا";
const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50);
const MAX_FILE_SIZE_BYTES = Number.isFinite(MAX_FILE_SIZE_MB)
  ? MAX_FILE_SIZE_MB * 1024 * 1024
  : 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = Number.isFinite(MAX_FILE_SIZE_MB)
  ? `${MAX_FILE_SIZE_MB}MB`
  : "50MB";
const fileSizeError = `حجم الملف أكبر من الحد المسموح (${MAX_FILE_SIZE_LABEL}).`;

export function DocumentsClient({ docs, clientCode, clientName }: Props) {
  const [documents, setDocuments] = useState<EditableDoc[]>(() =>
    docs.map((doc) => {
      const docName = correctDocName(doc.DocName);
      const isOther = !DOC_TYPES.includes(docName as (typeof DOC_TYPES)[number]);
      return {
        ...doc,
        DocName: docName,
        docType: isOther ? OTHER_DOC_TYPE : docName,
        customName: isOther ? docName : "",
        docDateStr: toInputDate(doc.DocDate),
      };
    })
  );

  const docTypeOptions = useMemo(
    () =>
      DOC_TYPES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      )),
    []
  );

  const updateDocState = (docId: string | number, patch: Partial<EditableDoc>) => {
    setDocuments((prev) =>
      prev.map((d) => (d.DocId === docId ? { ...d, ...patch, error: patch.error ?? d.error } : d))
    );
  };

  const handleFileChange = (docId: string | number, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (file && !isPdfFile(file)) {
      updateDocState(docId, {
        file: undefined,
        fileLabel: undefined,
        error: "يسمح بملفات PDF فقط",
      });
      return;
    }
    if (file && !isFileSizeOk(file)) {
      updateDocState(docId, {
        file: undefined,
        fileLabel: undefined,
        error: fileSizeError,
      });
      return;
    }
    updateDocState(docId, {
      file,
      fileLabel: file ? file.name : undefined,
      error: "",
    });
  };

  const handleDelete = async (docId: string | number) => {
    const ok = window.confirm("سيتم حذف المستند والملف نهائيًا. هل أنت متأكد؟");
    if (!ok) return;

    updateDocState(docId, { saving: true, error: "" });
    try {
      const res = await fetch("/api/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "حدث خطأ أثناء الحذف.");
      }
      setDocuments((prev) => prev.filter((d) => d.DocId !== docId));
    } catch (error) {
      void logClientEvent({
        action: "document.delete",
        status: "failure",
        message: error instanceof Error ? error.message : "حدث خطأ أثناء الحذف.",
        reason: error instanceof TypeError ? "network_error" : "client_error",
        clientCode: String(clientCode),
        docId: docId !== undefined ? String(docId) : undefined,
      });
      updateDocState(
        docId,
        { error: error instanceof Error ? error.message : "حدث خطأ أثناء الحذف." }
      );
    } finally {
      updateDocState(docId, { saving: false });
    }
  };

  const handleSave = async (doc: EditableDoc) => {
    const docId = doc.DocId;
    let docName = "";
    updateDocState(docId, { saving: true, error: "" });
    try {
      docName =
        doc.docType === OTHER_DOC_TYPE ? doc.customName.trim() || OTHER_DOC_TYPE : doc.docType;
      if (!docName) {
        throw new Error("أدخل اسم المستند");
      }

      let fileUrl = doc.FilePath ?? doc.filePath;

      if (doc.file) {
        if (!isPdfFile(doc.file)) {
          throw new Error("يسمح بملفات PDF فقط");
        }
        if (!isFileSizeOk(doc.file)) {
          throw new Error(fileSizeError);
        }
        await ensureArchiveAvailable(ARCHIVE_UNAVAILABLE_MESSAGE);
        const renamedFile = renameFileWithClientCode(doc.file, docName, clientCode);
        const formData = new FormData();
        formData.append("file", renamedFile);
        formData.append("docName", docName);
        if (doc.docDateStr) formData.append("docDate", doc.docDateStr);

        const { data: uploadData } = await uploadArchiveWithRetry({
          clientCode: String(clientCode),
          formData,
          maxRetries: ARCHIVE_MAX_RETRIES,
          defaultErrorMessage: "تعذر رفع الملف أو الاتصال بخدمة الأرشفة.",
          timeoutMessage: "انتهت مهلة الاتصال بخدمة الأرشفة.",
        });
        const uploadedPath = extractFileUrl(uploadData);
        if (!uploadedPath) {
          throw new Error("لم يتم إرجاع رابط الملف من خدمة الأرشفة.");
        }
        fileUrl = uploadedPath;
      }

      if (!fileUrl) {
        throw new Error("لا يوجد ملف مرتبط بالمستند.");
      }

      const saveRes = await fetch(`/api/clients/${clientCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          docId,
          clientName: doc.ClientName || clientName,
          docName,
          docDate: doc.docDateStr || null,
          fileUrl,
          replaceExisting: true,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saveData.message || "تعذر حفظ المستند في قاعدة البيانات.");
      }

      const updated = saveData.document ?? {};
      const newDocName = correctDocName(updated.DocName ?? docName);
      updateDocState(docId, {
        DocName: newDocName,
        docType: DOC_TYPES.includes(newDocName as (typeof DOC_TYPES)[number])
          ? newDocName
          : OTHER_DOC_TYPE,
        customName: DOC_TYPES.includes(newDocName as (typeof DOC_TYPES)[number])
          ? ""
          : newDocName,
        FilePath: updated.FilePath ?? fileUrl,
        docDateStr: toInputDate(updated.DocDate ?? doc.docDateStr),
        file: undefined,
        fileLabel: undefined,
      });
    } catch (error) {
      const errorMessage = getArchiveUploadErrorMessage(error, {
        fileTooLarge: fileSizeError,
      });
      void logClientEvent({
        action: "document.save",
        status: "failure",
        message: errorMessage,
        reason: error instanceof TypeError ? "network_error" : "client_error",
        clientCode: String(clientCode),
        docId: docId !== undefined ? String(docId) : undefined,
        details: { docName },
      });
      updateDocState(docId, { error: errorMessage });
    } finally {
      updateDocState(docId, { saving: false });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {documents.map((doc) => {
        const showOther = doc.docType === OTHER_DOC_TYPE;
        return (
          <div
            key={doc.DocId}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 text-right">
                  اسم المستند
                </label>
                <select
                  value={doc.docType}
                  onChange={(e) =>
                    updateDocState(doc.DocId, {
                      docType: e.target.value,
                      customName: e.target.value === OTHER_DOC_TYPE ? doc.customName : "",
                    })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- اختر المستند --</option>
                  {docTypeOptions}
                </select>
              </div>
              {showOther ? (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 text-right">
                    اسم آخر
                  </label>
                  <input
                    type="text"
                    value={doc.customName}
                    onChange={(e) => updateDocState(doc.DocId, { customName: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="اكتب اسم المستند"
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 text-right">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={doc.docDateStr}
                  onChange={(e) => updateDocState(doc.DocId, { docDateStr: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 text-right">
                  الملف الحالي
                </label>
                <div className="flex items-center gap-2">
                  <a
                    href={`/documents/view/${doc.DocId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sky-700 underline"
                  >
                    عرض الملف
                  </a>
                  <span className="text-xs text-slate-500 break-all">
                    {doc.FilePath ?? doc.filePath ?? ""}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 text-right">
                  استبدال الملف
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => handleFileChange(doc.DocId, e.target.files)}
                  className="text-sm"
                />
                {doc.fileLabel ? (
                  <p className="text-xs text-slate-600">{doc.fileLabel}</p>
                ) : null}
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => handleSave(doc)}
                  disabled={doc.saving}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
                >
                  {doc.saving ? "جارٍ الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.DocId)}
                  disabled={doc.saving}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
                >
                  حذف
                </button>
              </div>
            </div>
            {doc.error ? (
              <p className="text-xs text-rose-600 text-right">{doc.error}</p>
            ) : null}
          </div>
        );
      })}
      {documents.length === 0 ? (
        <p className="text-center text-slate-500">لا توجد مستندات مسجلة بعد</p>
      ) : null}
    </div>
  );
}
