"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileUploadRow } from "@/components/FileUploadRow";
import { DOC_TYPES, OTHER_DOC_TYPE, extractFileUrl, renameFileWithClientCode } from "@/lib/documents";
import { getArchiveUploadErrorMessage, uploadArchiveWithRetry } from "@/lib/archive-upload";
import { logClientEvent } from "@/lib/client-log";
import { ensureArchiveAvailable } from "@/lib/archive-health";

const isPdfFile = (file: File) => {
  const name = file.name?.toLowerCase() ?? "";
  return file.type === "application/pdf" || name.endsWith(".pdf");
};

const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50);
const MAX_FILE_SIZE_BYTES = Number.isFinite(MAX_FILE_SIZE_MB)
  ? MAX_FILE_SIZE_MB * 1024 * 1024
  : 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = Number.isFinite(MAX_FILE_SIZE_MB)
  ? `${MAX_FILE_SIZE_MB}MB`
  : "50MB";
const fileSizeError = `حجم الملف أكبر من الحد المسموح (${MAX_FILE_SIZE_LABEL}).`;
const isFileSizeOk = (file: File) => file.size <= MAX_FILE_SIZE_BYTES;

const ARCHIVE_MAX_RETRIES = 2;
const ARCHIVE_UNAVAILABLE_MESSAGE =
  "خدمة الأرشفة غير متاحة، حاول لاحقًا";

const schema = z
  .object({
    clientName: z.string().optional(),
    docType: z.string(),
    docDate: z.string().optional(),
    file: z
      .custom<FileList>()
      .refine((files) => files && files.length > 0, "يجب اختيار ملف")
      .refine(
        (files) => {
          const file = files?.[0];
          return file ? isPdfFile(file) : true;
        },
        "يسمح بملفات PDF فقط"
      )
      .refine(
        (files) => {
          const file = files?.[0];
          return file ? isFileSizeOk(file) : true;
        },
        fileSizeError
      ),
    replaceExisting: z.boolean().optional(),
    customName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.docType === OTHER_DOC_TYPE && !data.customName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customName"],
        message: "أدخل اسم المستند",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function UploadPage() {
  const params = useParams<{ clientCode: string }>();
  const router = useRouter();
  const clientCode = params.clientCode;

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      docType: DOC_TYPES[0],
      replaceExisting: false,
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const docType = watch("docType");
  const isOther = docType === OTHER_DOC_TYPE;

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setMessage("");

    const docName =
      data.docType === OTHER_DOC_TYPE
        ? data.customName?.trim() || OTHER_DOC_TYPE
        : data.docType;
    try {
      const file = data.file[0];
      await ensureArchiveAvailable(ARCHIVE_UNAVAILABLE_MESSAGE);
      const renamedFile = renameFileWithClientCode(file, docName, clientCode);
      const formData = new FormData();
      formData.append("file", renamedFile);
      formData.append("docName", docName);
      if (data.docDate) formData.append("docDate", data.docDate);

      const { data: uploadData } = await uploadArchiveWithRetry({
        clientCode,
        formData,
        maxRetries: ARCHIVE_MAX_RETRIES,
        defaultErrorMessage: "تعذر رفع الملف أو الاتصال بخدمة الأرشفة.",
        timeoutMessage: "انتهت مهلة الاتصال بخدمة الأرشفة.",
      });

      const fileUrl = extractFileUrl(uploadData);

      if (!fileUrl) {
        throw new Error("لم يتم إرجاع رابط الملف من خدمة الأرشفة.");
      }

      const saveRes = await fetch(`/api/clients/${clientCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientName: data.clientName,
          docName,
          docDate: data.docDate || null,
          fileUrl,
          replaceExisting: data.replaceExisting,
        }),
      });

      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saveData.message || "تعذر حفظ المستند في قاعدة البيانات.");
      }

      setMessage("تم حفظ المستند بنجاح.");
      router.refresh();
    } catch (error) {
      const errorMessage = getArchiveUploadErrorMessage(error, {
        fileTooLarge: fileSizeError,
      });
      setMessage(errorMessage);
      void logClientEvent({
        action: "document.save",
        status: "failure",
        message: errorMessage,
        reason: error instanceof TypeError ? "network_error" : "client_error",
        clientCode,
        details: { docName },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-1 text-right">
          <p className="text-sm text-slate-500">رفع مستند جديد</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            كود العميل {clientCode}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm border border-slate-200"
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">اسم العميل</label>
            <input
              type="text"
              {...register("clientName")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="(اختياري) يستخدم للتحديث"
            />
          </div>

          <FileUploadRow control={control} docTypes={DOC_TYPES} />


          {isOther ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                اسم المستند (أخرى)
              </label>
              <input
                type="text"
                {...register("customName", { required: isOther })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.customName ? (
                <p className="text-xs text-rose-600">{errors.customName.message}</p>
              ) : null}
            </div>
          ) : null}

          {errors.file ? (
            <p className="text-xs text-rose-600 text-right">{errors.file.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-white font-semibold hover:bg-sky-700 disabled:opacity-70"
          >
            {submitting ? "جاري الحفظ..." : "حفظ المستند"}
          </button>

          {message ? (
            <p className="text-center text-lg text-slate-700">{message}</p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
