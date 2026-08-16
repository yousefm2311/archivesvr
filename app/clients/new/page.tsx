// "use client";

// import {
//   DOC_TYPES,
//   OTHER_DOC_TYPE,
//   correctDocName,
//   extractFileUrl,
//   normalizeDocName,
//   renameFileWithClientCode,
// } from "@/lib/documents";
// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { canAccessUploadPage } from "@/lib/access";

// type DocRowState = {
//   key: string;
//   docId?: string;
//   docType: string;
//   customName: string;
//   docDate: string;
//   file?: File;
//   fileLabel?: string;
//   existingPath?: string;
// };

// type ExistingDoc = {
//   DocId: string;
//   DocName: string;
//   DocDate?: string | null;
//   FilePath?: string;
// };

// const makeId = () =>
//   typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
//     ? crypto.randomUUID()
//     : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// const matchDocType = (name: string) => {
//   const normalized = normalizeDocName(name);
//   return DOC_TYPES.find((t) => normalizeDocName(t) === normalized);
// };

// export default function NewClientPage() {
//   const router = useRouter();
//   const [allowed, setAllowed] = useState<boolean | null>(null);
//   const [clientCode, setClientCode] = useState("");
//   const [clientName, setClientName] = useState("");
//   const [isExisting, setIsExisting] = useState(false);
//   const [canEdit, setCanEdit] = useState(true);
//   const [message, setMessage] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [docs, setDocs] = useState<DocRowState[]>([]);

//   useEffect(() => {
//     setDocs([{ key: makeId(), docType: "", customName: "", docDate: "" }]);
//   }, []);

//   // التحقق من الصلاحيات: يسمح فقط للموظفين 3425 أو 403 مع JobCode = 86
//   useEffect(() => {
//     const checkAccess = async () => {
//       try {
//         const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
//         if (!res.ok) {
//           setAllowed(false);
//           return;
//         }
//         const data = await res.json().catch(() => ({}));
//         const userData = data?.user ?? data;
//         const isAllowed = canAccessUploadPage(userData);
//         setAllowed(isAllowed);
//         if (!isAllowed) {
//           setMessage("غير مصرح لك بفتح هذه الصفحة.");
//           // يمكن تحويله لصفحة أخرى إذا لزم الأمر
//           // router.replace("/home");
//         }
//       } catch {
//         setAllowed(false);
//       }
//     };
//     checkAccess();
//   }, [router]);

//   const addRow = () => {
//     setDocs((prev) => [...prev, { key: makeId(), docType: "", customName: "", docDate: "" }]);
//   };

//   const removeRowLocal = (key: string, allowEmpty = false) => {
//     setDocs((prev) => {
//       const next = prev.filter((d) => d.key !== key);
//       if (next.length === 0 && !allowEmpty) {
//         return [{ key: makeId(), docType: "", customName: "", docDate: "" }];
//       }
//       return next;
//     });
//   };

//   const updateRow = (key: string, patch: Partial<DocRowState>) => {
//     setDocs((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
//   };

//   const loadClient = async () => {
//     if (!clientCode.trim()) return;
//     setLoading(true);
//     setMessage("");
//     setCanEdit(true);
//     try {
//       const res = await fetch(`/api/clients?code=${encodeURIComponent(clientCode.trim())}`, {
//         credentials: "include",
//       });
//       if (!res.ok) throw new Error("تعذر الاتصال بقاعدة البيانات، حاول مرة أخرى.");
//       const data = await res.json().catch(() => ({}));

//       if (data?.client) {
//         const unauthorized = data.unauthorized;
//         setIsExisting(!unauthorized);
//         setClientName(data.client.clientName || "");
//         if (unauthorized) {
//           setMessage(data.denyReason || "هذا العميل مسجّل بفرع آخر ولا تملك صلاحية التعديل.");
//           setCanEdit(false);
//           setDocs([]);
//           return;
//         }
//       } else {
//         setIsExisting(false);
//         setClientName("");
//         setMessage("العميل غير موجود، سيتم إنشاؤه عند الحفظ.");
//       }

//       const docsRes = await fetch(`/api/clients/${clientCode.trim()}`, {
//         credentials: "include",
//       });
//       if (!docsRes.ok) throw new Error("تعذر جلب مستندات العميل، حاول مرة أخرى.");
//       const docsData = await docsRes.json().catch(() => ({}));

//       if (docsData.unauthorized) {
//         setMessage(docsData.denyReason || "هذا العميل مسجّل بفرع آخر ولا تملك صلاحية العرض.");
//         setCanEdit(false);
//         setDocs([]);
//         return;
//       }

//       const existingDocs: ExistingDoc[] = docsData.documents ?? [];
//       if (existingDocs.length > 0) {
//         setDocs(
//           existingDocs.map((d) => {
//             const fixedName = correctDocName(d.DocName);
//             const matchedType = matchDocType(fixedName);
//             const isOther = !matchedType;
//             return {
//               key: makeId(),
//               docId: d.DocId,
//               docType: isOther ? OTHER_DOC_TYPE : matchedType!,
//               customName: isOther ? fixedName : "",
//               docDate: d.DocDate ? new Date(d.DocDate).toISOString().slice(0, 10) : "",
//               file: undefined,
//               fileLabel: undefined,
//               existingPath: d.FilePath,
//             };
//           })
//         );
//         setMessage("تم تحميل مستندات العميل الحالية.");
//       } else {
//         setDocs([{ key: makeId(), docType: "", customName: "", docDate: "" }]);
//       }
//     } catch (err) {
//       setMessage(
//         err instanceof Error
//           ? err.message
//           : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDeleteRow = async (row: DocRowState) => {
//     if (!canEdit) return;
//     if (!row.docId) {
//       removeRowLocal(row.key);
//       return;
//     }
//     const confirm = window.confirm("سيتم حذف المستند نهائياً، هل تريد المتابعة؟");
//     if (!confirm) return;
//     try {
//       const res = await fetch("/api/documents/delete", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify({ docId: row.docId }),
//       });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) throw new Error(data.message || "تعذر حذف المستند.");
//       removeRowLocal(row.key, true);
//       setMessage("تم حذف المستند بنجاح.");
//     } catch (err) {
//       setMessage(err instanceof Error ? err.message : "تعذر حذف المستند، حاول لاحقاً.");
//     }
//   };

//   const handleSave = async () => {
//     if (!clientCode.trim()) {
//       setMessage("يرجى إدخال كود العميل.");
//       return;
//     }
//     if (!clientName.trim() && !isExisting) {
//       setMessage("يرجى إدخال اسم العميل.");
//       return;
//     }
//     if (!canEdit) {
//       setMessage("ليس لديك صلاحية التعديل على هذا العميل.");
//       return;
//     }
//     const rowsToSave = docs.filter((row) => row.docType && (row.file || row.docId));
//     if (rowsToSave.length === 0) {
//       setMessage("أضف مستنداً واحداً على الأقل.");
//       return;
//     }
//     setLoading(true);
//     setMessage("");
//     try {
//       if (!isExisting) {
//         const createRes = await fetch("/api/clients", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({ clientCode, clientName }),
//         });
//         const createData = await createRes.json().catch(() => ({}));
//         if (!createRes.ok) throw new Error(createData.message || "تعذر إنشاء العميل.");
//         setIsExisting(true);
//       }
//       for (const row of rowsToSave) {
//         const baseName = row.docType === OTHER_DOC_TYPE ? row.customName || row.docType : row.docType;
//         const docName = baseName.trim();
//         if (!docName) throw new Error("يرجى إدخال اسم المستند.");
//         let fileUrl: string | undefined;
//         if (row.file) {
//           const formData = new FormData();
//           const renamedFile = renameFileWithClientCode(row.file, docName, clientCode.trim());
//           formData.append("file", renamedFile);
//           formData.append("docName", docName);
//           if (row.docDate) formData.append("docDate", row.docDate);
//           const uploadRes = await fetch(
//             `/api/archives/upload?clientCode=${encodeURIComponent(clientCode.trim())}`,
//             { method: "POST", body: formData }
//           );
//           const uploadData = await uploadRes.json().catch(() => ({}));
//           if (!uploadRes.ok)
//             throw new Error(uploadData.message || "تعذر رفع الملف أو الاتصال بالخدمة.");
//           fileUrl = extractFileUrl(uploadData);
//           if (!fileUrl) throw new Error("لم يتم إرجاع رابط الملف من خدمة الأرشفة.");
//         } else if (row.existingPath) {
//           fileUrl = row.existingPath;
//         } else {
//           throw new Error("أرفق ملفاً للمستند.");
//         }
//         const saveRes = await fetch(`/api/clients/${clientCode.trim()}`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({
//             docId: row.docId,
//             clientName,
//             docName,
//             docDate: row.docDate || null,
//             fileUrl,
//             // تحديث فقط إذا كنا نرسل docId؛ وإلا أضف مستنداً جديداً مع لاحقة رقمية تلقائية
//             replaceExisting: !!row.docId,
//           }),
//         });
//         const saveData = await saveRes.json().catch(() => ({}));
//         if (!saveRes.ok) throw new Error(saveData.message || "تعذر حفظ المستند.");
//       }
//       window.confirm(" تم حفظ المستندات بنجاح");
//       setMessage("تم حفظ المستندات بنجاح.");
//     } catch (err) {
//       setMessage(
//         err instanceof Error ? err.message : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const docTypeOptions = useMemo(
//     () =>
//       DOC_TYPES.map((t) => (
//         <option key={t} value={t}>
//           {t}
//         </option>
//       )),
//     []
//   );

//   return (
//     <main className="min-h-screen bg-[var(--background)] px-4 py-8">
//       {allowed === false ? (
//         <div className="mx-auto max-w-3xl text-center text-rose-600 font-semibold">
//           غير مصرح لك بفتح هذه الصفحة.
//         </div>
//       ) : null}
//       {allowed === false ? null : (
//       <div className="mx-auto max-w-6xl space-y-6">
//         <div className="text-right">
//           <p className="text-sm text-[var(--text-muted)]">إضافة مستندات لعميل</p>
//           <h1 className="text-2xl font-semibold text-[var(--text-strong)]">إنشاء عميل ورفع مستنداته</h1>
//         </div>

//         <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div className="space-y-2 self-start">
//               <label className="block text-sm font-medium text-slate-700 text-right">كود العميل</label>
//               <input
//                 type="text"
//                 value={clientCode}
//                 onChange={(e) => setClientCode(e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     loadClient();
//                   }
//                 }}
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                 placeholder="اكتب كود العميل"
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-sm font-medium text-slate-700 text-right">اسم العميل</label>
//               <input
//                 type="text"
//                 value={clientName}
//                 onChange={(e) => setClientName(e.target.value)}
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                 placeholder="اسم العميل"
//               />
//             </div>
//           </div>

//           <div className="flex flex-wrap gap-3 justify-end">
//             <button
//               type="button"
//               onClick={loadClient}
//               className="rounded-lg load-data border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-[var(--header-btn-hover)]"
//             >
//               تحميل بيانات العميل
//             </button>
//           </div>

//           <div className="space-y-3">
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
//               <div className="flex items-center gap-2">
//                 <h2 className="text-lg font-semibold text-[var(--text-strong)]">المستندات المراد رفعها</h2>
//                 {!canEdit ? (
//                   <span className="text-xs text-rose-600">لا تملك صلاحية التعديل لهذا العميل.</span>
//                 ) : null}
//               </div>
//               {/* ///////////////////// */}
//             </div>

//             <div className="space-y-3">
//               {docs.map((row) => {
//                 const showOther = row.docType === OTHER_DOC_TYPE;
//                 return (
//                   <div
//                     key={row.key}
//                     className="rounded-lg border border-slate-200 bg-slate-50 p-4"
//                   >
//                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
//                       <div className="md:col-span-3 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           نوع المستند
//                         </label>
//                         <select
//                           value={row.docType}
//                           onChange={(e) => updateRow(row.key, { docType: e.target.value })}
//                           disabled={!canEdit}
//                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                         >
//                           <option value="">-- اختر نوع المستند --</option>
//                           {docTypeOptions}
//                         </select>
//                       </div>

//                       {showOther && (
//                         <div className="md:col-span-3 space-y-1">
//                           <label className="block text-base font-medium text-slate-700 text-right">
//                             اسم مخصص
//                           </label>
//                           <input
//                             type="text"
//                             value={row.customName}
//                             onChange={(e) => updateRow(row.key, { customName: e.target.value })}
//                             disabled={!canEdit}
//                             className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                             placeholder="اكتب اسم المستند"
//                           />
//                         </div>
//                       )}

//                       <div className="md:col-span-2 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           التاريخ
//                         </label>
//                         <input
//                           type="date"
//                           value={row.docDate}
//                           onChange={(e) => updateRow(row.key, { docDate: e.target.value })}
//                           disabled={!canEdit}
//                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                         />
//                       </div>

//                       <div className="md:col-span-3 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           الملف
//                         </label>

//                         {row.existingPath && (
//                           <a
//                             href={`/documents/view/${row.docId}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="block text-base text-sky-700 underline font-medium mb-1"
//                           >
//                             عرض الملف الحالي
//                           </a>
//                         )}

//                         <input
//                           id={`file-${row.key}`}
//                           type="file"
//                           disabled={!canEdit}
//                           onChange={(e) => {
//                             const file = e.target.files?.[0];
//                             updateRow(row.key, {
//                               file,
//                               fileLabel: file ? file.name : undefined,
//                             });
//                           }}
//                           className="hidden"
//                         />
//                         <div className="flex items-center gap-2">
//                           <button
//                             type="button"
//                             disabled={!canEdit}
//                             onClick={() => {
//                               const el = document.getElementById(`file-${row.key}`) as HTMLInputElement | null;
//                               el?.click();
//                             }}
//                             className="rounded-lg upload-files border px-4 h-9 text-sm font-semibold shadow-sm hover:shadow disabled:opacity-60"
//                           >
//                             {row.fileLabel ? "تغيير الملف" : "اختر ملف"}
//                           </button>
//                           {row.fileLabel && (
//                             <span className="text-xs text-slate-500 truncate max-w-[140px]">
//                               {row.fileLabel}
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       <div className="md:col-span-1 flex justify-end">
//                         <button
//                           type="button"
//                           onClick={() => handleDeleteRow(row)}
//                           disabled={!canEdit}
//                           className="rounded-lg bg-rose-600 px-4 h-9 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
//                         >
//                           حذف
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="flex flex-wrap gap-3 justify-end">

//             <button
//                 type="button"
//                 onClick={addRow}
//                 disabled={!canEdit}
//                 className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
//               >
//                 إضافة مستند جديد
//               </button>

//             <button
//               type="button"
//               onClick={handleSave}
//               disabled={loading || !canEdit}
//               className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
//             >
//               {loading ? "جاري الحفظ..." : "حفظ المستندات"}
//             </button>
//           </div>

//           {message ? <p className="text-lg text-right text-[var(--text-strong)]">{message}</p> : null}
//         </div>
//       </div>
//       )}
//     </main>
//   );
// }

// // "use client";

// // import {
// //   DOC_TYPES,
// //   OTHER_DOC_TYPE,
// //   correctDocName,
// //   extractFileUrl,
// //   normalizeDocName,
// //   renameFileWithClientCode,
// // } from "@/lib/documents";
// // import { useEffect, useMemo, useState } from "react";

// // type DocRowState = {
// //   key: string;
// //   docId?: string;
// //   docType: string;
// //   customName: string;
// //   docDate: string;
// //   file?: File;
// //   fileLabel?: string;
// //   existingPath?: string;
// // };

// // type ExistingDoc = {
// //   DocId: string;
// //   DocName: string;
// //   DocDate?: string | null;
// //   FilePath?: string;
// // };

// // const makeId = () =>
// //   typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
// //     ? crypto.randomUUID()
// //     : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// // const matchDocType = (name: string) => {
// //   const normalized = normalizeDocName(name);
// //   return DOC_TYPES.find((t) => normalizeDocName(t) === normalized);
// // };

// // export default function NewClientPage() {
// //   const [clientCode, setClientCode] = useState("");
// //   const [clientName, setClientName] = useState("");
// //   const [isExisting, setIsExisting] = useState(false);
// //   const [canEdit, setCanEdit] = useState(true);
// //   const [message, setMessage] = useState("");
// //   const [loading, setLoading] = useState(false);
// //   const [docs, setDocs] = useState<DocRowState[]>([]);

// //   useEffect(() => {
// //     setDocs([{ key: makeId(), docType: "", customName: "", docDate: "" }]);
// //   }, []);

// //   const addRow = () => {
// //     setDocs((prev) => [...prev, { key: makeId(), docType: "", customName: "", docDate: "" }]);
// //   };

// //   const removeRowLocal = (key: string, allowEmpty = false) => {
// //     setDocs((prev) => {
// //       const next = prev.filter((d) => d.key !== key);
// //       if (next.length === 0 && !allowEmpty) {
// //         return [{ key: makeId(), docType: "", customName: "", docDate: "" }];
// //       }
// //       return next;
// //     });
// //   };

// //   const updateRow = (key: string, patch: Partial<DocRowState>) => {
// //     setDocs((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
// //   };

// //   const loadClient = async () => {
// //     if (!clientCode.trim()) return;
// //     setLoading(true);
// //     setMessage("");
// //     setCanEdit(true);
// //     try {
// //       const res = await fetch(`/api/clients?code=${encodeURIComponent(clientCode.trim())}`, {
// //         credentials: "include",
// //       });
// //       if (!res.ok) throw new Error("تعذر الاتصال بقاعدة البيانات، حاول مرة أخرى.");
// //       const data = await res.json().catch(() => ({}));

// //       if (data?.client) {
// //         const unauthorized = data.unauthorized;
// //         setIsExisting(!unauthorized);
// //         setClientName(data.client.clientName || "");
// //         if (unauthorized) {
// //           setMessage(data.denyReason || "هذا العميل مسجّل بفرع آخر ولا تملك صلاحية التعديل.");
// //           setCanEdit(false);
// //           setDocs([]);
// //           return;
// //         }
// //       } else {
// //         setIsExisting(false);
// //         setClientName("");
// //         setMessage("العميل غير موجود، سيتم إنشاؤه عند الحفظ.");
// //       }

// //       const docsRes = await fetch(`/api/clients/${clientCode.trim()}`, {
// //         credentials: "include",
// //       });
// //       if (!docsRes.ok) throw new Error("تعذر جلب مستندات العميل، حاول مرة أخرى.");
// //       const docsData = await docsRes.json().catch(() => ({}));

// //       if (docsData.unauthorized) {
// //         setMessage(docsData.denyReason || "هذا العميل مسجّل بفرع آخر ولا تملك صلاحية العرض.");
// //         setCanEdit(false);
// //         setDocs([]);
// //         return;
// //       }

// //       const existingDocs: ExistingDoc[] = docsData.documents ?? [];
// //       if (existingDocs.length > 0) {
// //         setDocs(
// //           existingDocs.map((d) => {
// //             const fixedName = correctDocName(d.DocName);
// //             const matchedType = matchDocType(fixedName);
// //             const isOther = !matchedType;
// //             return {
// //               key: makeId(),
// //               docId: d.DocId,
// //               docType: isOther ? OTHER_DOC_TYPE : matchedType!,
// //               customName: isOther ? fixedName : "",
// //               docDate: d.DocDate ? new Date(d.DocDate).toISOString().slice(0, 10) : "",
// //               file: undefined,
// //               fileLabel: undefined,
// //               existingPath: d.FilePath,
// //             };
// //           })
// //         );
// //         setMessage("تم تحميل مستندات العميل الحالية.");
// //       } else {
// //         setDocs([{ key: makeId(), docType: "", customName: "", docDate: "" }]);
// //       }
// //     } catch (err) {
// //       setMessage(
// //         err instanceof Error
// //           ? err.message
// //           : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً."
// //       );
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleDeleteRow = async (row: DocRowState) => {
// //     if (!canEdit) return;
// //     if (!row.docId) {
// //       removeRowLocal(row.key);
// //       return;
// //     }
// //     const confirm = window.confirm("سيتم حذف المستند نهائياً، هل تريد المتابعة؟");
// //     if (!confirm) return;
// //     try {
// //       const res = await fetch("/api/documents/delete", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         credentials: "include",
// //         body: JSON.stringify({ docId: row.docId }),
// //       });
// //       const data = await res.json().catch(() => ({}));
// //       if (!res.ok) throw new Error(data.message || "تعذر حذف المستند.");
// //       removeRowLocal(row.key, true);
// //       setMessage("تم حذف المستند بنجاح.");
// //     } catch (err) {
// //       setMessage(err instanceof Error ? err.message : "تعذر حذف المستند، حاول لاحقاً.");
// //     }
// //   };

// //   const handleSave = async () => {
// //     if (!clientCode.trim()) {
// //       setMessage("يرجى إدخال كود العميل.");
// //       return;
// //     }
// //     if (!clientName.trim() && !isExisting) {
// //       setMessage("يرجى إدخال اسم العميل.");
// //       return;
// //     }
// //     if (!canEdit) {
// //       setMessage("ليس لديك صلاحية التعديل على هذا العميل.");
// //       return;
// //     }
// //     const rowsToSave = docs.filter((row) => row.docType && (row.file || row.docId));
// //     if (rowsToSave.length === 0) {
// //       setMessage("أضف مستنداً واحداً على الأقل.");
// //       return;
// //     }
// //     setLoading(true);
// //     setMessage("");
// //     try {
// //       if (!isExisting) {
// //         const createRes = await fetch("/api/clients", {
// //           method: "POST",
// //           headers: { "Content-Type": "application/json" },
// //           credentials: "include",
// //           body: JSON.stringify({ clientCode, clientName }),
// //         });
// //         const createData = await createRes.json().catch(() => ({}));
// //         if (!createRes.ok) throw new Error(createData.message || "تعذر إنشاء العميل.");
// //         setIsExisting(true);
// //       }
// //       for (const row of rowsToSave) {
// //         const baseName = row.docType === OTHER_DOC_TYPE ? row.customName || row.docType : row.docType;
// //         const docName = baseName.trim();
// //         if (!docName) throw new Error("يرجى إدخال اسم المستند.");
// //         let fileUrl: string | undefined;
// //         if (row.file) {
// //           const formData = new FormData();
// //           const renamedFile = renameFileWithClientCode(row.file, docName, clientCode.trim());
// //           formData.append("file", renamedFile);
// //           formData.append("docName", docName);
// //           if (row.docDate) formData.append("docDate", row.docDate);
// //           const uploadRes = await fetch(
// //             `/api/archives/upload?clientCode=${encodeURIComponent(clientCode.trim())}`,
// //             { method: "POST", body: formData }
// //           );
// //           const uploadData = await uploadRes.json().catch(() => ({}));
// //           if (!uploadRes.ok)
// //             throw new Error(uploadData.message || "تعذر رفع الملف أو الاتصال بالخدمة.");
// //           fileUrl = extractFileUrl(uploadData);
// //           if (!fileUrl) throw new Error("لم يتم إرجاع رابط الملف من خدمة الأرشفة.");
// //         } else if (row.existingPath) {
// //           fileUrl = row.existingPath;
// //         } else {
// //           throw new Error("أرفق ملفاً للمستند.");
// //         }
// //         const saveRes = await fetch(`/api/clients/${clientCode.trim()}`, {
// //           method: "POST",
// //           headers: { "Content-Type": "application/json" },
// //           credentials: "include",
// //           body: JSON.stringify({
// //             docId: row.docId,
// //             clientName,
// //             docName,
// //             docDate: row.docDate || null,
// //             fileUrl,
// //             // تحديث فقط إذا كنا نرسل docId؛ وإلا أضف مستنداً جديداً مع لاحقة رقمية تلقائية
// //             replaceExisting: !!row.docId,
// //           }),
// //         });
// //         const saveData = await saveRes.json().catch(() => ({}));
// //         if (!saveRes.ok) throw new Error(saveData.message || "تعذر حفظ المستند.");
// //       }
// //       window.confirm(" تم حفظ المستندات بنجاح");
// //       setMessage("تم حفظ المستندات بنجاح.");
// //     } catch (err) {
// //       setMessage(
// //         err instanceof Error ? err.message : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً."
// //       );
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const docTypeOptions = useMemo(
// //     () =>
// //       DOC_TYPES.map((t) => (
// //         <option key={t} value={t}>
// //           {t}
// //         </option>
// //       )),
// //     []
// //   );

// //   return (
// //     <main className="min-h-screen bg-[var(--background)] px-4 py-8">
// //       <div className="mx-auto max-w-6xl space-y-6">
// //         <div className="text-right">
// //           <p className="text-sm text-[var(--text-muted)]">إضافة مستندات لعميل</p>
// //           <h1 className="text-2xl font-semibold text-[var(--text-strong)]">إنشاء عميل ورفع مستنداته</h1>
// //         </div>

// //         <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
// //           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
// //             <div className="space-y-2 self-start">
// //               <label className="block text-sm font-medium text-slate-700 text-right">كود العميل</label>
// //               <input
// //                 type="text"
// //                 value={clientCode}
// //                 onChange={(e) => setClientCode(e.target.value)}
// //                 onKeyDown={(e) => {
// //                   if (e.key === "Enter") {
// //                     e.preventDefault();
// //                     loadClient();
// //                   }
// //                 }}
// //                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
// //                 placeholder="اكتب كود العميل"
// //               />
// //             </div>
// //             <div className="space-y-2">
// //               <label className="block text-sm font-medium text-slate-700 text-right">اسم العميل</label>
// //               <input
// //                 type="text"
// //                 value={clientName}
// //                 onChange={(e) => setClientName(e.target.value)}
// //                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
// //                 placeholder="اسم العميل"
// //               />
// //             </div>
// //           </div>

// //           <div className="flex flex-wrap gap-3 justify-end">
// //             <button
// //               type="button"
// //               onClick={loadClient}
// //               className="rounded-lg load-data border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-[var(--header-btn-hover)]"
// //             >
// //               تحميل بيانات العميل
// //             </button>
// //           </div>

// //           <div className="space-y-3">
// //             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
// //               <div className="flex items-center gap-2">
// //                 <h2 className="text-lg font-semibold text-[var(--text-strong)]">المستندات المراد رفعها</h2>
// //                 {!canEdit ? (
// //                   <span className="text-xs text-rose-600">لا تملك صلاحية التعديل لهذا العميل.</span>
// //                 ) : null}
// //               </div>
// //               <button
// //                 type="button"
// //                 onClick={addRow}
// //                 disabled={!canEdit}
// //                 className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
// //               >
// //                 إضافة مستند جديد
// //               </button>
// //             </div>

// //             <div className="space-y-3">
// //               {docs.map((row) => {
// //                 const showOther = row.docType === OTHER_DOC_TYPE;
// //                 return (
// //                   <div
// //                     key={row.key}
// //                     className="rounded-lg border border-slate-200 bg-slate-50 p-4"
// //                   >
// //                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
// //                       <div className="md:col-span-3 space-y-1">
// //                         <label className="block text-base font-medium text-slate-700 text-right">
// //                           نوع المستند
// //                         </label>
// //                         <select
// //                           value={row.docType}
// //                           onChange={(e) => updateRow(row.key, { docType: e.target.value })}
// //                           disabled={!canEdit}
// //                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
// //                         >
// //                           <option value="">-- اختر نوع المستند --</option>
// //                           {docTypeOptions}
// //                         </select>
// //                       </div>

// //                       {showOther && (
// //                         <div className="md:col-span-3 space-y-1">
// //                           <label className="block text-base font-medium text-slate-700 text-right">
// //                             اسم مخصص
// //                           </label>
// //                           <input
// //                             type="text"
// //                             value={row.customName}
// //                             onChange={(e) => updateRow(row.key, { customName: e.target.value })}
// //                             disabled={!canEdit}
// //                             className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
// //                             placeholder="اكتب اسم المستند"
// //                           />
// //                         </div>
// //                       )}

// //                       <div className="md:col-span-2 space-y-1">
// //                         <label className="block text-base font-medium text-slate-700 text-right">
// //                           التاريخ
// //                         </label>
// //                         <input
// //                           type="date"
// //                           value={row.docDate}
// //                           onChange={(e) => updateRow(row.key, { docDate: e.target.value })}
// //                           disabled={!canEdit}
// //                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
// //                         />
// //                       </div>

// //                       <div className="md:col-span-3 space-y-1">
// //                         <label className="block text-base font-medium text-slate-700 text-right">
// //                           الملف
// //                         </label>

// //                         {row.existingPath && (
// //                           <a
// //                             href={`/documents/view/${row.docId}`}
// //                             target="_blank"
// //                             rel="noopener noreferrer"
// //                             className="block text-base text-sky-700 underline font-medium mb-1"
// //                           >
// //                             عرض الملف الحالي
// //                           </a>
// //                         )}

// //                         <input
// //                           id={`file-${row.key}`}
// //                           type="file"
// //                           disabled={!canEdit}
// //                           onChange={(e) => {
// //                             const file = e.target.files?.[0];
// //                             updateRow(row.key, {
// //                               file,
// //                               fileLabel: file ? file.name : undefined,
// //                             });
// //                           }}
// //                           className="hidden"
// //                         />
// //                         <div className="flex items-center gap-2">
// //                           <button
// //                             type="button"
// //                             disabled={!canEdit}
// //                             onClick={() => {
// //                               const el = document.getElementById(`file-${row.key}`) as HTMLInputElement | null;
// //                               el?.click();
// //                             }}
// //                             className="rounded-lg upload-files border px-4 h-9 text-sm font-semibold shadow-sm hover:shadow disabled:opacity-60"
// //                           >
// //                             {row.fileLabel ? "تغيير الملف" : "اختر ملف"}
// //                           </button>
// //                           {row.fileLabel && (
// //                             <span className="text-xs text-slate-500 truncate max-w-[140px]">
// //                               {row.fileLabel}
// //                             </span>
// //                           )}
// //                         </div>
// //                       </div>

// //                       <div className="md:col-span-1 flex justify-end">
// //                         <button
// //                           type="button"
// //                           onClick={() => handleDeleteRow(row)}
// //                           disabled={!canEdit}
// //                           className="rounded-lg bg-rose-600 px-4 h-9 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
// //                         >
// //                           حذف
// //                         </button>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 );
// //               })}
// //             </div>
// //           </div>

// //           <div className="flex flex-wrap gap-3 justify-end">
// //             <button
// //               type="button"
// //               onClick={handleSave}
// //               disabled={loading || !canEdit}
// //               className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
// //             >
// //               {loading ? "جاري الحفظ..." : "حفظ المستندات"}
// //             </button>
// //           </div>

// //           {message ? <p className="text-lg text-right text-[var(--text-strong)]">{message}</p> : null}
// //         </div>
// //       </div>
// //     </main>
// //   );
// // }

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   DOC_TYPES,
//   OTHER_DOC_TYPE,
//   correctDocName,
//   extractFileUrl,
//   normalizeDocName,
//   renameFileWithClientCode,
// } from "@/lib/documents";
// import { canAccessUploadPage } from "@/lib/access";
// import { normalizeBranch as normalizeBranchPerm } from "@/lib/permissions";

// type DocRowState = {
//   key: string;
//   docId?: string;
//   docType: string;
//   customName: string;
//   docDate: string;
//   file?: File;
//   fileLabel?: string;
//   existingPath?: string;
// };

// type ExistingDoc = {
//   DocId: string;
//   DocName: string;
//   DocDate?: string | null;
//   FilePath?: string;
// };

// type BranchOption = { code: string; name: string };

// const makeId = () =>
//   typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
//     ? crypto.randomUUID()
//     : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// const matchDocType = (name: string) => {
//   const normalized = normalizeDocName(name);
//   return DOC_TYPES.find((t) => normalizeDocName(t) === normalized);
// };

// export default function NewClientPage() {
//   const router = useRouter();
//   const [allowed, setAllowed] = useState<boolean | null>(null);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [userBranch, setUserBranch] = useState("");
//   const [branches, setBranches] = useState<BranchOption[]>([]);
//   const [selectedBranch, setSelectedBranch] = useState("");
//   const [clientCode, setClientCode] = useState("");
//   const [clientName, setClientName] = useState("");
//   const [isExisting, setIsExisting] = useState(false);
//   const [canEdit, setCanEdit] = useState(true);
//   const [message, setMessage] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [docs, setDocs] = useState<DocRowState[]>([]);

//   useEffect(() => {
//     setDocs([{ key: makeId(), docType: "", customName: "", docDate: "" }]);
//   }, []);

//   // صلاحيات الصفحة + تحميل الفروع للإدمن
//   useEffect(() => {
//     const checkAccess = async () => {
//       try {
//         const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
//         if (!res.ok) {
//           setAllowed(false);
//           return;
//         }
//         const data = await res.json().catch(() => ({}));
//         const userData = data?.user ?? data;
//         const isAllowed = canAccessUploadPage(userData);
//         const branchNorm = normalizeBranchPerm(userData?.branch);
//         const empId = String(userData?.empId ?? "").trim();
//         const adminFlag = branchNorm === "100" || ["403", "3425"].includes(empId);
//         setUserBranch(branchNorm);
//         setIsAdmin(adminFlag);
//         setSelectedBranch(branchNorm);

//         if (adminFlag) {
//           try {
//             const bRes = await fetch("/api/branches", { credentials: "include", cache: "no-store" });
//             const bData = await bRes.json().catch(() => ({}));
//             if (bRes.ok && Array.isArray(bData.branches)) {
//               setBranches(bData.branches);
//             }
//           } catch {
//             /* ignore */
//           }
//         }

//         setAllowed(isAllowed);
//         if (!isAllowed) {
//           setMessage("لا تملك صلاحية الوصول إلى صفحة إضافة العميل.");
//         }
//       } catch {
//         setAllowed(false);
//       }
//     };
//     checkAccess();
//   }, [router]);

//   const addRow = () => {
//     setDocs((prev) => [...prev, { key: makeId(), docType: "", customName: "", docDate: "" }]);
//   };

//   const removeRowLocal = (key: string, allowEmpty = false) => {
//     setDocs((prev) => {
//       const next = prev.filter((d) => d.key !== key);
//       if (next.length === 0 && !allowEmpty) {
//         return [{ key: makeId(), docType: "", customName: "", docDate: "" }];
//       }
//       return next;
//     });
//   };

//   const updateRow = (key: string, patch: Partial<DocRowState>) => {
//     setDocs((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
//   };

//   const loadClient = async () => {
//     if (!clientCode.trim()) return;
//     setLoading(true);
//     setMessage("");
//     setCanEdit(true);
//     try {
//       const res = await fetch(`/api/clients?code=${encodeURIComponent(clientCode.trim())}`, {
//         credentials: "include",
//       });
//       if (!res.ok) throw new Error("تعذر الاتصال بقاعدة البيانات، حاول مرة أخرى.");
//       const data = await res.json().catch(() => ({}));

//       if (data?.client) {
//         const unauthorized = data.unauthorized;
//         setIsExisting(!unauthorized);
//         setClientName(data.client.clientName || "");
//         if (unauthorized) {
//           setMessage(data.denyReason || "هذا العميل في فرع آخر ولا تملك صلاحية التعديل.");
//           setCanEdit(false);
//           setDocs([]);
//           return;
//         }
//       } else {
//         setIsExisting(false);
//         setClientName("");
//         setMessage("العميل غير موجود، سيتم إنشاؤه عند الحفظ.");
//       }

//       const docsRes = await fetch(`/api/clients/${clientCode.trim()}`, {
//         credentials: "include",
//       });
//       if (!docsRes.ok) throw new Error("تعذر جلب مستندات العميل، حاول مرة أخرى.");
//       const docsData = await docsRes.json().catch(() => ({}));

//       if (docsData.unauthorized) {
//         setMessage(docsData.denyReason || "هذا العميل في فرع آخر ولا تملك صلاحية العرض.");
//         setCanEdit(false);
//         setDocs([]);
//         return;
//       }

//       const existingDocs: ExistingDoc[] = docsData.documents ?? [];
//       if (existingDocs.length > 0) {
//         setDocs(
//           existingDocs.map((d) => {
//             const fixedName = correctDocName(d.DocName);
//             const matchedType = matchDocType(fixedName);
//             const isOther = !matchedType;
//             return {
//               key: makeId(),
//               docId: d.DocId,
//               docType: isOther ? OTHER_DOC_TYPE : matchedType!,
//               customName: isOther ? fixedName : "",
//               docDate: d.DocDate ? new Date(d.DocDate).toISOString().slice(0, 10) : "",
//               file: undefined,
//               fileLabel: undefined,
//               existingPath: d.FilePath,
//             };
//           })
//         );
//         setMessage("تم تحميل مستندات العميل.");
//       } else {
//         setDocs([{ key: makeId(), docType: "", customName: "", docDate: "" }]);
//       }
//     } catch (err) {
//       setMessage(
//         err instanceof Error
//           ? err.message
//           : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDeleteRow = async (row: DocRowState) => {
//     if (!canEdit) return;
//     if (!row.docId) {
//       removeRowLocal(row.key);
//       return;
//     }
//     const confirmDelete = window.confirm("سيتم حذف المستند نهائياً، هل تريد المتابعة؟");
//     if (!confirmDelete) return;
//     try {
//       const res = await fetch("/api/documents/delete", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify({ docId: row.docId }),
//       });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) throw new Error(data.message || "تعذر حذف المستند.");
//       removeRowLocal(row.key, true);
//       setMessage("تم حذف المستند بنجاح.");
//     } catch (err) {
//       setMessage(err instanceof Error ? err.message : "تعذر حذف المستند، حاول لاحقاً.");
//     }
//   };

//   const handleSave = async () => {
//     if (!clientCode.trim()) {
//       setMessage("يرجى إدخال كود العميل.");
//       return;
//     }
//     if (!clientName.trim() && !isExisting) {
//       setMessage("يرجى إدخال اسم العميل.");
//       return;
//     }
//     if (!canEdit) {
//       setMessage("ليس لديك صلاحية التعديل على هذا العميل.");
//       return;
//     }
//     const rowsToSave = docs.filter((row) => row.docType && (row.file || row.docId));
//     if (rowsToSave.length === 0) {
//       setMessage("أضف مستنداً واحداً على الأقل.");
//       return;
//     }
//     setLoading(true);
//     setMessage("");
//     try {
//       if (!isExisting) {
//         const createRes = await fetch("/api/clients", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({
//             clientCode,
//             clientName,
//             branch: isAdmin ? selectedBranch || userBranch : undefined,
//           }),
//         });
//         const createData = await createRes.json().catch(() => ({}));
//         if (!createRes.ok) throw new Error(createData.message || "تعذر إنشاء العميل.");
//         setIsExisting(true);
//       }
//       for (const row of rowsToSave) {
//         const baseName = row.docType === OTHER_DOC_TYPE ? row.customName || row.docType : row.docType;
//         const docName = baseName.trim();
//         if (!docName) throw new Error("يرجى إدخال اسم المستند.");
//         let fileUrl: string | undefined;
//         if (row.file) {
//           const formData = new FormData();
//           const renamedFile = renameFileWithClientCode(row.file, docName, clientCode.trim());
//           formData.append("file", renamedFile);
//           formData.append("docName", docName);
//           if (row.docDate) formData.append("docDate", row.docDate);
//           const uploadRes = await fetch(
//             `/api/archives/upload?clientCode=${encodeURIComponent(clientCode.trim())}`,
//             { method: "POST", body: formData }
//           );
//           const uploadData = await uploadRes.json().catch(() => ({}));
//           if (!uploadRes.ok)
//             throw new Error(uploadData.message || "تعذر رفع الملف أو الاتصال بالخدمة.");
//           fileUrl = extractFileUrl(uploadData);
//           if (!fileUrl) throw new Error("لم يتم إرجاع رابط الملف من خدمة الأرشفة.");
//         } else if (row.existingPath) {
//           fileUrl = row.existingPath;
//         } else {
//           throw new Error("أرفق ملفاً للمستند.");
//         }
//         const saveRes = await fetch(`/api/clients/${clientCode.trim()}`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({
//             docId: row.docId,
//             clientName,
//             docName,
//             docDate: row.docDate || null,
//             fileUrl,
//             replaceExisting: true,
//           }),
//         });
//         const saveData = await saveRes.json().catch(() => ({}));
//         if (!saveRes.ok) throw new Error(saveData.message || "تعذر حفظ المستند.");
//       }
//       setMessage("تم حفظ المستندات بنجاح.");
//       await loadClient();
//     } catch (err) {
//       setMessage(
//         err instanceof Error ? err.message : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const docTypeOptions = useMemo(
//     () =>
//       DOC_TYPES.map((t) => (
//         <option key={t} value={t}>
//           {t}
//         </option>
//       )),
//     []
//   );

//   if (allowed === false) {
//     return (
//       <main className="min-h-screen flex items-center justify-center">
//         <p className="text-lg font-semibold text-rose-600">ليس لديك صلاحية الوصول.</p>
//       </main>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-[var(--background)] px-4 py-8">
//       <div className="mx-auto max-w-6xl space-y-6">
//         <div className="text-right">
//           <p className="text-sm text-[var(--text-muted)]">إضافة مستندات لعميل</p>
//           <h1 className="text-2xl font-semibold text-[var(--text-strong)]">إنشاء عميل ورفع مستنداته</h1>
//         </div>

//         <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div className="space-y-2 self-start">
//               <label className="block text-sm font-medium text-slate-700 text-right">كود العميل</label>
//               <input
//                 type="text"
//                 value={clientCode}
//                 onChange={(e) => setClientCode(e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     loadClient();
//                   }
//                 }}
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                 placeholder="اكتب كود العميل"
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-sm font-medium text-slate-700 text-right">اسم العميل</label>
//               <input
//                 type="text"
//                 value={clientName}
//                 onChange={(e) => setClientName(e.target.value)}
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                 placeholder="اسم العميل"
//               />
//             </div>
//             {isAdmin ? (
//               <div className="space-y-2">
//                 <label className="block text-sm font-medium text-slate-700 text-right">اختر الفرع</label>
//                 <select
//                   value={selectedBranch}
//                   onChange={(e) => setSelectedBranch(e.target.value)}
//                   className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
//                 >
//                   <option value="">-- اختر الفرع --</option>
//                   {branches.map((b) => (
//                     <option key={b.code} value={b.code}>
//                       {b.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             ) : null}
//           </div>

//           <div className="flex flex-wrap gap-3 justify-end">
//             <button
//               type="button"
//               onClick={loadClient}
//               className="rounded-lg load-data border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-[var(--header-btn-hover)]"
//             >
//               تحميل بيانات العميل
//             </button>
//           </div>

//           <div className="space-y-3">
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
//               <div className="flex items-center gap-2">
//                 <h2 className="text-lg font-semibold text-[var(--text-strong)]">المستندات المراد رفعها</h2>
//                 {!canEdit ? (
//                   <span className="text-xs text-rose-600">لا تملك صلاحية التعديل لهذا العميل.</span>
//                 ) : null}
//               </div>

//             </div>

//             <div className="space-y-3">
//               {docs.map((row) => {
//                 const showOther = row.docType === OTHER_DOC_TYPE;
//                 return (
//                   <div
//                     key={row.key}
//                     className="rounded-lg border border-slate-200 bg-slate-50 p-4"
//                   >
//                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
//                       <div className="md:col-span-3 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           نوع المستند
//                         </label>
//                         <select
//                           value={row.docType}
//                           onChange={(e) => updateRow(row.key, { docType: e.target.value })}
//                           disabled={!canEdit}
//                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                         >
//                           <option value="">-- اختر نوع المستند --</option>
//                           {docTypeOptions}
//                         </select>
//                       </div>

//                       {showOther && (
//                         <div className="md:col-span-3 space-y-1">
//                           <label className="block text-base font-medium text-slate-700 text-right">
//                             اسم مخصص
//                           </label>
//                           <input
//                             type="text"
//                             value={row.customName}
//                             onChange={(e) => updateRow(row.key, { customName: e.target.value })}
//                             disabled={!canEdit}
//                             className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                             placeholder="اكتب اسم المستند"
//                           />
//                         </div>
//                       )}

//                       <div className="md:col-span-2 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           التاريخ
//                         </label>
//                         <input
//                           type="date"
//                           value={row.docDate}
//                           onChange={(e) => updateRow(row.key, { docDate: e.target.value })}
//                           disabled={!canEdit}
//                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                         />
//                       </div>

//                       <div className="md:col-span-3 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           الملف
//                         </label>

//                         {row.existingPath && (
//                           <a
//                             href={`/documents/view/${row.docId}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="block text-base text-sky-700 underline font-medium mb-1"
//                           >
//                             عرض الملف الحالي
//                           </a>
//                         )}

//                         <input
//                           id={`file-${row.key}`}
//                           type="file"
//                           disabled={!canEdit}
//                           onChange={(e) => {
//                             const file = e.target.files?.[0];
//                             updateRow(row.key, {
//                               file,
//                               fileLabel: file ? file.name : undefined,
//                             });
//                           }}
//                           className="hidden"
//                         />
//                         <div className="flex items-center gap-2">
//                           <button
//                             type="button"
//                             disabled={!canEdit}
//                             onClick={() => {
//                               const el = document.getElementById(`file-${row.key}`) as HTMLInputElement | null;
//                               el?.click();
//                             }}
//                             className="rounded-lg upload-files border px-4 h-9 text-sm font-semibold shadow-sm hover:shadow disabled:opacity-60"
//                           >
//                             {row.fileLabel ? "تغيير الملف" : "اختر ملف"}
//                           </button>
//                           {row.fileLabel && (
//                             <span className="text-xs text-slate-500 truncate max-w-[140px]">
//                               {row.fileLabel}
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       <div className="md:col-span-1 flex justify-end">
//                         <button
//                           type="button"
//                           onClick={() => handleDeleteRow(row)}
//                           disabled={!canEdit}
//                           className="rounded-lg bg-rose-600 px-4 h-9 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
//                         >
//                           حذف
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="flex flex-wrap gap-3 justify-end">
//             <button
//                 type="button"
//                 onClick={addRow}
//                 disabled={!canEdit}
//                 className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
//               >
//                 إضافة مستند جديد
//               </button>
//             <button
//               type="button"
//               onClick={handleSave}
//               disabled={loading || !canEdit}
//               className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
//             >
//               {loading ? "جاري الحفظ..." : "حفظ المستندات"}
//             </button>
//           </div>

//           {message ? <p className="text-sm text-right text-[var(--text-strong)]">{message}</p> : null}
//         </div>
//       </div>
//     </main>
//   );
// }








































///////////////////////////////////////////////////////////////***************** */
"use client";

import {
  DOC_TYPES,
  OTHER_DOC_TYPE,
  correctDocName,
  extractFileUrl,
  normalizeDocName,
  renameFileWithClientCode,
} from "@/lib/documents";
import { getArchiveUploadErrorMessage, uploadArchiveWithRetry } from "@/lib/archive-upload";
import { logClientEvent } from "@/lib/client-log";
import { ensureArchiveAvailable } from "@/lib/archive-health";
import { normalizeBranch as normalizeBranchPerm } from "@/lib/permissions";
import {
  canAccessAllBranches,
  canCreateClient,
} from "@/lib/permissions-special";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DocRowStatus = "idle" | "uploading" | "saving" | "success" | "error";

type DocRowState = {
  key: string;
  docId?: string;
  docType: string;
  customName: string;
  docDate: string;
  file?: File;
  fileLabel?: string;
  existingPath?: string;
  originalDocName?: string;
  originalDocDate?: string;
  originalPath?: string;
  status?: DocRowStatus;
  error?: string;
  retryCount?: number;
};

type ExistingDoc = {
  DocId: string;
  DocName: string;
  DocDate?: string | null;
  FilePath?: string;
};

type BranchOption = { code: string; name: string };

type SaveProgress = {
  total: number;
  done: number;
  success: number;
  failed: number;
};

type PreparedRow = {
  row: DocRowState;
  docName: string;
  docDateValue: string;
};

const MAX_PARALLEL_UPLOADS_DEFAULT = 3;
const MAX_PARALLEL_UPLOADS_SETTING = Number(
  process.env.NEXT_PUBLIC_MAX_PARALLEL_UPLOADS ?? MAX_PARALLEL_UPLOADS_DEFAULT,
);
const MAX_PARALLEL_UPLOADS =
  Number.isFinite(MAX_PARALLEL_UPLOADS_SETTING) &&
  MAX_PARALLEL_UPLOADS_SETTING > 0
    ? MAX_PARALLEL_UPLOADS_SETTING
    : MAX_PARALLEL_UPLOADS_DEFAULT;
const ARCHIVE_MAX_RETRIES = 2;
const ARCHIVE_MAX_ATTEMPTS = ARCHIVE_MAX_RETRIES + 1;
const ARCHIVE_UNAVAILABLE_MESSAGE =
  "خدمة الأرشفة غير متاحة، حاول لاحقًا";
const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50);
const MAX_FILE_SIZE_BYTES = Number.isFinite(MAX_FILE_SIZE_MB)
  ? MAX_FILE_SIZE_MB * 1024 * 1024
  : 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = Number.isFinite(MAX_FILE_SIZE_MB)
  ? `${MAX_FILE_SIZE_MB}MB`
  : "50MB";

const makeId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const matchDocType = (name: string) => {
  const normalized = normalizeDocName(name);
  return DOC_TYPES.find((t) => normalizeDocName(t) === normalized);
};

const isPdfFile = (file: File) => {
  const name = file.name?.toLowerCase() ?? "";
  return file.type === "application/pdf" || name.endsWith(".pdf");
};

const isFileSizeOk = (file: File) => file.size <= MAX_FILE_SIZE_BYTES;
const fileSizeError = `حجم الملف أكبر من الحد المسموح (${MAX_FILE_SIZE_LABEL}).`;

const runWithConcurrency = async <T,>(
  tasks: Array<() => Promise<T>>,
  limit: number,
) => {
  if (tasks.length === 0) return [];
  const results: T[] = new Array(tasks.length);
  const concurrency = Math.max(1, Math.min(limit, tasks.length));
  let index = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (index < tasks.length) {
      const current = index;
      index += 1;
      results[current] = await tasks[current]();
    }
  });

  await Promise.all(workers);
  return results;
};

export default function NewClientPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userBranch, setUserBranch] = useState("");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientLoaded, setClientLoaded] = useState(false);
  const [clientNameHint, setClientNameHint] = useState("");
  const [isExisting, setIsExisting] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocRowState[]>([]);
  const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);

  const today = () => new Date().toISOString().slice(0, 10);
const makeEmptyRow = (): DocRowState => ({
  key: makeId(),
  docType: "",
  customName: "",
  docDate: today(),
  originalDocName: "",
  originalDocDate: "",
  originalPath: "",
  status: "idle",
  error: "",
});


  useEffect(() => {
    setDocs([makeEmptyRow()]);
  }, []);

  useEffect(() => {
    setClientLoaded(false);
    setClientName("");
    setClientNameHint("");
    setIsExisting(false);
    setSaveProgress(null);
  }, [clientCode]);

  // صلاحيات الصفحة + تحميل الفروع للإدمن
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          setAllowed(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const userData = data?.user ?? data;
        const isAllowed = canCreateClient(userData);
        const branchNorm = normalizeBranchPerm(userData?.branch);
        const adminFlag = canAccessAllBranches(userData);
        setUserBranch(branchNorm);
        setIsAdmin(adminFlag);
        setSelectedBranch(branchNorm);

        if (adminFlag) {
          try {
            const bRes = await fetch("/api/branches", {
              credentials: "include",
              cache: "no-store",
            });
            const bData = await bRes.json().catch(() => ({}));
            if (bRes.ok && Array.isArray(bData.branches)) {
              setBranches(bData.branches);
            }
          } catch {
            /* ignore */
          }
        }

        setAllowed(isAllowed);
        if (!isAllowed) {
          setMessage("لا تملك صلاحية الوصول إلى صفحة إضافة العميل.");
        }
      } catch {
        setAllowed(false);
      }
    };
    checkAccess();
  }, [router]);

  const addRow = () => {
    setDocs((prev) => [...prev, makeEmptyRow()]);
  };

  const removeRowLocal = (key: string, allowEmpty = false) => {
    setDocs((prev) => {
      const next = prev.filter((d) => d.key !== key);
      if (next.length === 0 && !allowEmpty) {
        return [makeEmptyRow()];
      }
      return next;
    });
  };

  const updateRow = (key: string, patch: Partial<DocRowState>) => {
    setDocs((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const handleClientNameHint = () => {
    if (!clientLoaded) {
      setClientNameHint("برجاء تحميل بيانات العميل اولا");
    }
  };

  const loadClient = async () => {
    if (!clientCode.trim()) return;
    setLoading(true);
    setMessage("");
    setClientNameHint("");
    setCanEdit(true);
    setClientLoaded(false);
    setSaveProgress(null);
    try {
      const res = await fetch(
        `/api/clients?code=${encodeURIComponent(clientCode.trim())}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok)
        throw new Error("تعذر الاتصال بقاعدة البيانات، حاول مرة أخرى.");
      const data = await res.json().catch(() => ({}));
      setClientLoaded(true);

      if (data?.client) {
        const unauthorized = data.unauthorized;
        setIsExisting(!unauthorized);
        setClientName(data.client.clientName || "");
        if (unauthorized) {
          setMessage(
            data.denyReason || "هذا العميل في فرع آخر ولا تملك صلاحية التعديل.",
          );
          setCanEdit(false);
          setDocs([]);
          return;
        }
      } else {
        setIsExisting(false);
        setClientName("");
        setMessage("العميل غير موجود، سيتم إنشاؤه عند الحفظ.");
      }

      const docsRes = await fetch(`/api/clients/${clientCode.trim()}`, {
        credentials: "include",
      });
      if (!docsRes.ok)
        throw new Error("تعذر جلب مستندات العميل، حاول مرة أخرى.");
      const docsData = await docsRes.json().catch(() => ({}));

      if (docsData.unauthorized) {
        setMessage(
          docsData.denyReason || "هذا العميل في فرع آخر ولا تملك صلاحية العرض.",
        );
        setCanEdit(false);
        setDocs([]);
        return;
      }

      const existingDocs: ExistingDoc[] = docsData.documents ?? [];
      if (existingDocs.length > 0) {
        setDocs(
          existingDocs.map((d) => {
            const fixedName = correctDocName(d.DocName);
            const matchedType = matchDocType(fixedName);
            const isOther = !matchedType;
            return {
              key: makeId(),
              docId: d.DocId,
              docType: isOther ? OTHER_DOC_TYPE : matchedType!,
              customName: isOther ? fixedName : "",
              docDate: d.DocDate
                ? new Date(d.DocDate).toISOString().slice(0, 10)
                : "",
              file: undefined,
              fileLabel: undefined,
              existingPath: d.FilePath,
              originalDocName: fixedName,
              originalDocDate: d.DocDate
                ? new Date(d.DocDate).toISOString().slice(0, 10)
                : "",
              originalPath: d.FilePath,
              status: "idle",
              error: "",
            };
          }),
        );
        setMessage("تم تحميل مستندات العميل.");
      } else {
        setDocs([makeEmptyRow()]);
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRow = async (row: DocRowState) => {
    if (loading) return;
    if (!canEdit) return;
    if (!row.docId) {
      removeRowLocal(row.key);
      return;
    }
    const confirmDelete = window.confirm(
      "سيتم حذف المستند نهائياً، هل تريد المتابعة؟",
    );
    if (!confirmDelete) return;
    try {
      const res = await fetch("/api/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ docId: row.docId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "تعذر حذف المستند.");
      removeRowLocal(row.key, true);
      setMessage("تم حذف المستند بنجاح.");
    } catch (err) {
      void logClientEvent({
        action: "document.delete",
        status: "failure",
        message: err instanceof Error ? err.message : "تعذر حذف المستند، حاول لاحقاً.",
        reason: err instanceof TypeError ? "network_error" : "client_error",
        clientCode: clientCode.trim(),
        docId: row.docId !== undefined ? String(row.docId) : undefined,
      });
      setMessage(
        err instanceof Error ? err.message : "تعذر حذف المستند، حاول لاحقاً.",
      );
    }
  };

  const performSave = async (rowsOverride?: DocRowState[]) => {
    const trimmedClientCode = clientCode.trim();
    const trimmedClientName = clientName.trim();
    setSaveProgress(null);

    if (!trimmedClientCode) {
      setMessage("يرجى إدخال كود العميل.");
      return;
    }
    if (!trimmedClientName && !isExisting) {
      setMessage("يرجى إدخال اسم العميل.");
      return;
    }
    if (!canEdit) {
      setMessage("ليس لديك صلاحية التعديل على هذا العميل.");
      return;
    }

    const sourceRows = rowsOverride ?? docs;
    const rowsToProcess = sourceRows.filter(
      (row) => row.docType || row.file || row.customName || row.existingPath,
    );
    if (rowsToProcess.length === 0) {
      setMessage("أضف مستنداً واحداً على الأقل.");
      return;
    }

    const preparedRows = rowsToProcess.map((row) => {
      const baseName =
        row.docType === OTHER_DOC_TYPE
          ? row.customName || row.docType
          : row.docType;
      const docName = baseName.trim();
      const docDateValue =
        row.docDate || (row.docId || row.existingPath ? "" : today());
      let error = "";

      if (!row.docType) {
        error = "اختر نوع المستند.";
      } else if (!docName) {
        error = "يرجى إدخال اسم المستند.";
      } else if (!row.file && !row.existingPath) {
        error = "أرفق ملفاً للمستند.";
      }

      return { row, docName, docDateValue, error };
    });

    const invalidRows = preparedRows.filter((item) => item.error);
    if (invalidRows.length > 0) {
      invalidRows.forEach((item) =>
        updateRow(item.row.key, { error: item.error, status: "error" }),
      );
    }

    const rowsToSave: PreparedRow[] = preparedRows
      .filter((item) => {
        if (item.error) return false;
        const row = item.row;
        const isExisting = Boolean(row.docId || row.existingPath);
        if (!isExisting) return true;
        if (row.file) return true;
        const originalName = (row.originalDocName ?? "").trim();
        const originalDate = row.originalDocDate ?? "";
        return (
          (item.docName && item.docName !== originalName) ||
          item.docDateValue !== originalDate
        );
      })
      .map(({ row, docName, docDateValue }) => ({
        row,
        docName,
        docDateValue,
      }));

    if (rowsToSave.length === 0) {
      setMessage(
        invalidRows.length > 0
          ? "يرجى تصحيح الأخطاء أولاً."
          : "لا توجد تغييرات لحفظها.",
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setSaveProgress({
      total: rowsToSave.length,
      done: 0,
      success: 0,
      failed: 0,
    });
    try {
      if (!isExisting) {
        const createRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            clientCode: trimmedClientCode,
            clientName: trimmedClientName,
            branch: isAdmin ? selectedBranch || userBranch : undefined,
          }),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok)
          throw new Error(createData.message || "تعذر إنشاء العميل.");
        setIsExisting(true);
      }

      rowsToSave.forEach(({ row }) =>
        updateRow(row.key, { error: "", status: "idle" }),
      );

      const updateProgress = (ok: boolean) => {
        setSaveProgress((prev) => {
          if (!prev) return prev;
          return {
            total: prev.total,
            done: prev.done + 1,
            success: prev.success + (ok ? 1 : 0),
            failed: prev.failed + (ok ? 0 : 1),
          };
        });
      };

      let archiveUnavailableHit = false;

      const processRow = async ({
        row,
        docName,
        docDateValue,
      }: PreparedRow) => {
        try {
          let fileUrl: string | undefined = row.existingPath;

          if (row.file) {
            if (!isPdfFile(row.file)) {
              throw new Error("يسمح بملفات PDF فقط");
            }
            if (!isFileSizeOk(row.file)) {
              throw new Error(fileSizeError);
            }
            await ensureArchiveAvailable(ARCHIVE_UNAVAILABLE_MESSAGE);
            const formData = new FormData();
            const renamedFile = renameFileWithClientCode(
              row.file,
              docName,
              trimmedClientCode,
            );
            formData.append("file", renamedFile);
            formData.append("docName", docName);
            formData.append("docDate", docDateValue);
            const { data: uploadData } = await uploadArchiveWithRetry({
              clientCode: trimmedClientCode,
              formData,
              maxRetries: ARCHIVE_MAX_RETRIES,
              defaultErrorMessage: "تعذر رفع الملف أو الاتصال بخدمة الأرشفة.",
              timeoutMessage: "انتهت مهلة الاتصال بخدمة الأرشفة.",
              onAttempt: (attempt) =>
                updateRow(row.key, {
                  status: "uploading",
                  error: "",
                  retryCount: attempt,
                }),
            });
            fileUrl = extractFileUrl(uploadData);
            if (!fileUrl)
              throw new Error("لم يتم إرجاع رابط الملف من خدمة الأرشفة.");
          }

          if (!fileUrl) {
            throw new Error("أرفق ملفاً للمستند.");
          }

          updateRow(row.key, {
            status: "saving",
            error: "",
            retryCount: undefined,
          });
          const saveRes = await fetch(`/api/clients/${trimmedClientCode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              docId: row.docId,
              clientName: trimmedClientName || clientName,
              docName,
              docDate: docDateValue,
              fileUrl,
              replaceExisting: true,
            }),
          });
          const saveData = await saveRes.json().catch(() => ({}));
          if (!saveRes.ok)
            throw new Error(saveData.message || "تعذر حفظ المستند.");

          const updatedDoc = saveData.document ?? {};
          const savedName = correctDocName(updatedDoc.DocName ?? docName);
          const matchedType = matchDocType(savedName);
          const docDateResult = updatedDoc.DocDate
            ? new Date(updatedDoc.DocDate).toISOString().slice(0, 10)
            : docDateValue;

          updateRow(row.key, {
            docId: updatedDoc.DocId ?? row.docId,
            existingPath: updatedDoc.FilePath ?? fileUrl,
            docType: matchedType ? matchedType : OTHER_DOC_TYPE,
            customName: matchedType ? "" : savedName,
            docDate: docDateResult,
            originalDocName: savedName,
            originalDocDate: docDateResult,
            originalPath: updatedDoc.FilePath ?? fileUrl,
            file: undefined,
            fileLabel: undefined,
            status: "success",
            error: "",
            retryCount: undefined,
          });

          return { ok: true };
        } catch (err) {
          const errorMessage = getArchiveUploadErrorMessage(err, {
            fileTooLarge: fileSizeError,
          });
          void logClientEvent({
            action: row.docId ? "document.update" : "document.save",
            status: "failure",
            message: errorMessage,
            reason: err instanceof TypeError ? "network_error" : "client_error",
            clientCode: trimmedClientCode,
            docId: row.docId !== undefined ? String(row.docId) : undefined,
            details: { docName },
          });
          if (errorMessage.startsWith(ARCHIVE_UNAVAILABLE_MESSAGE)) {
            archiveUnavailableHit = true;
          }
          updateRow(row.key, {
            status: "error",
            error: errorMessage,
            retryCount:
              err && typeof (err as { attempts?: number }).attempts === "number"
                ? (err as { attempts?: number }).attempts
                : undefined,
          });
          return { ok: false };
        }
      };

      const grouped = new Map<string, PreparedRow[]>();
      rowsToSave.forEach((item) => {
        const key = normalizeDocName(item.docName) || item.docName.toLowerCase();
        const group = grouped.get(key);
        if (group) {
          group.push(item);
        } else {
          grouped.set(key, [item]);
        }
      });

      const groupTasks = Array.from(grouped.values()).map((group) => async () => {
        const groupResults: Array<{ ok: boolean }> = [];
        for (const item of group) {
          const result = await processRow(item);
          updateProgress(result.ok);
          groupResults.push(result);
        }
        return groupResults;
      });

      const groupedResults = await runWithConcurrency(
        groupTasks,
        MAX_PARALLEL_UPLOADS,
      );
      const results = groupedResults.flat();
      const successCount = results.filter((r) => r.ok).length;
      const failedCount = results.length - successCount;

      if (failedCount === 0 && invalidRows.length === 0) {
        setMessage("تم حفظ المستندات بنجاح.");
        await loadClient();
      } else {
        const parts = [];
        if (successCount) parts.push(`تم حفظ ${successCount} مستند`);
        if (failedCount) parts.push(`فشل حفظ ${failedCount} مستند`);
        if (invalidRows.length)
          parts.push(`يوجد ${invalidRows.length} مستندات غير مكتملة`);
        const summary = `${parts.join("، ")}.`;
        setMessage(
          archiveUnavailableHit
            ? `${summary} ${ARCHIVE_UNAVAILABLE_MESSAGE}`
            : summary,
        );
      }
    } catch (err) {
      setSaveProgress(null);
      const fallbackMessage =
        "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقًا.";
      const resolvedMessage =
        err instanceof TypeError
          ? "تعذر الاتصال بالخادم، حاول لاحقًا."
          : err instanceof Error
            ? err.message
            : fallbackMessage;
      setMessage(resolvedMessage);
      void logClientEvent({
        action: "document.save",
        status: "failure",
        message: resolvedMessage,
        reason: err instanceof TypeError ? "network_error" : "client_error",
        clientCode: trimmedClientCode,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (loading) return;
    void performSave();
  };

  const handleRetryFailed = () => {
    if (loading) return;
    const failedRows = docs.filter((row) => row.status === "error");
    if (failedRows.length === 0) {
      setMessage("لا توجد مستندات فاشلة لإعادة المحاولة.");
      return;
    }
    void performSave(failedRows);
  };

  const docTypeOptions = useMemo(
    () =>
      DOC_TYPES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      )),
    [],
  );

  const failedRowsCount = docs.filter((row) => row.status === "error").length;

  const progressPercent =
    saveProgress && saveProgress.total > 0
      ? Math.round((saveProgress.done / saveProgress.total) * 100)
      : 0;

  if (allowed === false) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold text-rose-600">
          ليس لديك صلاحية الوصول.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-right">
          <p className="text-sm text-[var(--text-muted)]">
            إضافة مستندات لعميل
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            إنشاء عميل ورفع مستنداته
          </h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 self-start">
              <label className="block text-sm font-medium text-slate-700 text-right">
                كود العميل
              </label>
              <input
                type="text"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    loadClient();
                  }
                }}
                className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500`}
                placeholder="اكتب كود العميل"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 text-right">
                اسم العميل
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                readOnly={!clientLoaded}
                onFocus={handleClientNameHint}
                onClick={handleClientNameHint}
                disabled={!canEdit || loading}
                className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  clientLoaded
                    ? "border-slate-300 focus:ring-sky-500"
                    : "border-rose-500 focus:ring-rose-500"
                }`}
                placeholder="اسم العميل"
              />
              {clientNameHint && !clientLoaded ? (
                <p className="text-base font-semibold !text-rose-600 text-right">
                  {clientNameHint}
                </p>
              ) : null}
            </div>
            {isAdmin ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 text-right">
                  اختر الفرع
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- اختر الفرع --</option>
                  {branches.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={loadClient}
              disabled={loading}
              className="rounded-lg load-data border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-[var(--header-btn-hover)] disabled:opacity-60"
            >
              تحميل بيانات العميل
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  المستندات المراد رفعها
                </h2>
                {!canEdit ? (
                  <span className="text-xs text-rose-600">
                    لا تملك صلاحية التعديل لهذا العميل.
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              {docs.map((row) => {
                const showOther = row.docType === OTHER_DOC_TYPE;
                const rowBusy =
                  loading ||
                  row.status === "uploading" ||
                  row.status === "saving";
                return (
                  <div
                    key={row.key}
                    className={`rounded-lg border p-4 ${
                      row.status === "error"
                        ? "border-rose-900 bg-slate-900 dark:border-rose-900 dark:bg-rose-950/40"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-3 space-y-1">
                        <label className="block text-base font-medium text-slate-700 text-right">
                          نوع المستند
                        </label>
                        <select
                          value={row.docType}
                          onChange={(e) =>
                            updateRow(row.key, {
                              docType: e.target.value,
                              error: "",
                              status: "idle",
                            })
                          }
                          disabled={!canEdit || rowBusy}
                          className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">-- اختر نوع المستند --</option>
                          {docTypeOptions}
                        </select>
                      </div>

                      {showOther && (
                        <div className="md:col-span-3 space-y-1">
                          <label className="block text-base font-medium text-slate-700 text-right">
                            اسم مخصص
                          </label>
                          <input
                            type="text"
                            value={row.customName}
                            onChange={(e) =>
                              updateRow(row.key, {
                                customName: e.target.value,
                                error: "",
                                status: "idle",
                              })
                            }
                            disabled={!canEdit || rowBusy}
                            className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                            placeholder="اكتب اسم المستند"
                          />
                        </div>
                      )}

                      <div className="md:col-span-2 space-y-1 hidden">
                        <label className="block text-base font-medium text-slate-700 text-right">
                          التاريخ
                        </label>
                        <input
                          type="date"
                          value={row.docDate}
                          onChange={(e) =>
                            updateRow(row.key, {
                              docDate: e.target.value,
                              error: "",
                              status: "idle",
                            })
                          }
                          disabled={!canEdit || rowBusy}
                          className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="block text-base font-medium text-slate-700 text-right">
                          الملف
                        </label>

                        {row.existingPath && (
                          <a
                            href={`/documents/view/${row.docId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-base text-sky-700 underline font-medium mb-1"
                          >
                            عرض الملف الحالي
                          </a>
                        )}

                        <input
                          id={`file-${row.key}`}
                          type="file"
                          accept=".pdf,application/pdf"
                          disabled={!canEdit || rowBusy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && !isPdfFile(file)) {
                              updateRow(row.key, {
                                file: undefined,
                                fileLabel: undefined,
                                error: "يسمح بملفات PDF فقط",
                                status: "error",
                              });
                              e.target.value = "";
                              return;
                            }
                            if (file && !isFileSizeOk(file)) {
                              updateRow(row.key, {
                                file: undefined,
                                fileLabel: undefined,
                                error: fileSizeError,
                                status: "error",
                              });
                              e.target.value = "";
                              return;
                            }
                            updateRow(row.key, {
                              file,
                              fileLabel: file ? file.name : undefined,
                              error: "",
                              status: "idle",
                            });
                          }}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!canEdit || rowBusy}
                            onClick={() => {
                              const el = document.getElementById(
                                `file-${row.key}`,
                              ) as HTMLInputElement | null;
                              el?.click();
                            }}
                            className="rounded-lg upload-files border px-4 h-9 text-sm font-semibold shadow-sm hover:shadow disabled:opacity-60"
                          >
                            {row.fileLabel ? "تغيير الملف" : "اختر ملف"}
                          </button>
                          {row.fileLabel && (
                            <span className="text-xs text-slate-500 truncate max-w-[140px]">
                              {row.fileLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row)}
                          disabled={!canEdit || rowBusy}
                          className="rounded-lg bg-rose-600 px-4 h-9 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                    {row.status && row.status !== "idle" ? (
                      <p
                        className={`mt-2 text-xs text-right ${
                          row.status === "success"
                            ? "text-emerald-600"
                            : row.status === "error"
                              ? "text-rose-600"
                              : "text-slate-600"
                        }`}
                      >
                        {row.status === "uploading"
                          ? `جارٍ رفع الملف...${
                              row.retryCount
                                ? ` (محاولة ${row.retryCount}/${ARCHIVE_MAX_ATTEMPTS})`
                                : ""
                            }`
                          : row.status === "saving"
                            ? "جارٍ حفظ البيانات..."
                            : row.status === "success"
                              ? "تم الحفظ"
                              : row.status === "error"
                                ? "فشل الحفظ"
                                : ""}
                      </p>
                    ) : null}
                    {row.error ? (
                      <p className="mt-1 text-xs text-rose-600 text-right">
                        {row.error}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={addRow}
              disabled={!canEdit || loading}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 attention-nudge"
            >
              إضافة مستند جديد
            </button>
            <button
              type="button"
              onClick={handleRetryFailed}
              disabled={loading || failedRowsCount === 0}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              إعادة المحاولة للصفوف الفاشلة
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !canEdit}
              className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
            >
              {loading ? "جاري الحفظ..." : "حفظ المستندات"}
            </button>
          </div>

          {saveProgress ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-right">
              <div className="flex items-center justify-between">
                <span>
                  {saveProgress.done < saveProgress.total
                    ? "جاري حفظ المستندات..."
                    : "اكتمل حفظ المستندات"}
                </span>
                <span>
                  {saveProgress.done}/{saveProgress.total}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                نجح {saveProgress.success}، فشل {saveProgress.failed}
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="text-lg text-right text-[var(--text-strong)]">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}


















///////////////////////////


// "use client";

// import {
//   DOC_TYPES,
//   OTHER_DOC_TYPE,
//   correctDocName,
//   extractFileUrl,
//   normalizeDocName,
//   renameFileWithClientCode,
// } from "@/lib/documents";
// import { getArchiveUploadErrorMessage, uploadArchiveWithRetry } from "@/lib/archive-upload";
// import { logClientEvent } from "@/lib/client-log";
// import { checkArchiveHealth, ensureArchiveAvailable } from "@/lib/archive-health";
// import { normalizeBranch as normalizeBranchPerm } from "@/lib/permissions";
// import {
//   canAccessAllBranches,
//   canCreateClient,
// } from "@/lib/permissions-special";
// import { useRouter } from "next/navigation";
// import { useEffect, useMemo, useState } from "react";

// type DocRowStatus = "idle" | "uploading" | "saving" | "success" | "error";

// type DocRowState = {
//   key: string;
//   docId?: string;
//   docType: string;
//   customName: string;
//   docDate: string;
//   file?: File;
//   fileLabel?: string;
//   existingPath?: string;
//   originalDocName?: string;
//   originalDocDate?: string;
//   originalPath?: string;
//   status?: DocRowStatus;
//   error?: string;
//   retryCount?: number;
// };

// type ExistingDoc = {
//   DocId: string;
//   DocName: string;
//   DocDate?: string | null;
//   FilePath?: string;
// };

// type BranchOption = { code: string; name: string };

// type SaveProgress = {
//   total: number;
//   done: number;
//   success: number;
//   failed: number;
// };

// type UploadStats = {
//   totalBytes: number;
//   completedBytes: number;
//   startedAt: number;
//   speedBps: number;
// };

// type PreparedRow = {
//   row: DocRowState;
//   docName: string;
//   docDateValue: string;
// };

// const MAX_PARALLEL_UPLOADS_DEFAULT = 3;
// const MAX_PARALLEL_UPLOADS_SETTING = Number(
//   process.env.NEXT_PUBLIC_MAX_PARALLEL_UPLOADS ?? MAX_PARALLEL_UPLOADS_DEFAULT,
// );
// const MAX_PARALLEL_UPLOADS =
//   Number.isFinite(MAX_PARALLEL_UPLOADS_SETTING) &&
//   MAX_PARALLEL_UPLOADS_SETTING > 0
//     ? MAX_PARALLEL_UPLOADS_SETTING
//     : MAX_PARALLEL_UPLOADS_DEFAULT;
// const ARCHIVE_MAX_RETRIES = 2;
// const ARCHIVE_MAX_ATTEMPTS = ARCHIVE_MAX_RETRIES + 1;
// const ARCHIVE_UNAVAILABLE_MESSAGE =
//   "خدمة الأرشفة غير متاحة، حاول لاحقًا";
// const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50);
// const MAX_FILE_SIZE_BYTES = Number.isFinite(MAX_FILE_SIZE_MB)
//   ? MAX_FILE_SIZE_MB * 1024 * 1024
//   : 50 * 1024 * 1024;
// const MAX_FILE_SIZE_LABEL = Number.isFinite(MAX_FILE_SIZE_MB)
//   ? `${MAX_FILE_SIZE_MB}MB`
//   : "50MB";

// const makeId = () =>
//   typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
//     ? crypto.randomUUID()
//     : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// const matchDocType = (name: string) => {
//   const normalized = normalizeDocName(name);
//   return DOC_TYPES.find((t) => normalizeDocName(t) === normalized);
// };

// const isPdfFile = (file: File) => {
//   const name = file.name?.toLowerCase() ?? "";
//   return file.type === "application/pdf" || name.endsWith(".pdf");
// };

// const isFileSizeOk = (file: File) => file.size <= MAX_FILE_SIZE_BYTES;
// const fileSizeError = `حجم الملف أكبر من الحد المسموح (${MAX_FILE_SIZE_LABEL}).`;
// const formatBytes = (bytes: number) => {
//   if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
//   const units = ["B", "KB", "MB", "GB"];
//   let size = bytes;
//   let index = 0;
//   while (size >= 1024 && index < units.length - 1) {
//     size /= 1024;
//     index += 1;
//   }
//   const fixed = size >= 100 ? 0 : size >= 10 ? 1 : 2;
//   return `${size.toFixed(fixed)} ${units[index]}`;
// };
// const formatSpeed = (bps: number) => {
//   if (!Number.isFinite(bps) || bps <= 0) return "0 KB/s";
//   return `${formatBytes(bps)}/s`;
// };
// const DEFAULT_API_TIMEOUT_MS = Number(
//   process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 20000,
// );
// const fetchWithTimeout = async (
//   input: RequestInfo | URL,
//   init: RequestInit = {},
//   timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
// ) => {
//   if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
//     return fetch(input, init);
//   }
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
//   try {
//     return await fetch(input, { ...init, signal: controller.signal });
//   } finally {
//     clearTimeout(timeoutId);
//   }
// };

// const runWithConcurrency = async <T,>(
//   tasks: Array<() => Promise<T>>,
//   limit: number,
// ) => {
//   if (tasks.length === 0) return [];
//   const results: T[] = new Array(tasks.length);
//   const concurrency = Math.max(1, Math.min(limit, tasks.length));
//   let index = 0;

//   const workers = Array.from({ length: concurrency }, async () => {
//     while (index < tasks.length) {
//       const current = index;
//       index += 1;
//       results[current] = await tasks[current]();
//     }
//   });

//   await Promise.all(workers);
//   return results;
// };

// export default function NewClientPage() {
//   const router = useRouter();
//   const [allowed, setAllowed] = useState<boolean | null>(null);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [userBranch, setUserBranch] = useState("");
//   const [branches, setBranches] = useState<BranchOption[]>([]);
//   const [selectedBranch, setSelectedBranch] = useState("");
//   const [clientCode, setClientCode] = useState("");
//   const [clientName, setClientName] = useState("");
//   const [clientLoaded, setClientLoaded] = useState(false);
//   const [clientNameHint, setClientNameHint] = useState("");
//   const [isExisting, setIsExisting] = useState(false);
//   const [canEdit, setCanEdit] = useState(true);
//   const [message, setMessage] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [docs, setDocs] = useState<DocRowState[]>([]);
//   const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);
//   const [isSaving, setIsSaving] = useState(false);
//   const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
//   const [uploadNotice, setUploadNotice] = useState("");
//   const [isOnline, setIsOnline] = useState(true);
//   const [mounted, setMounted] = useState(false);
//   const [dialogDismissed, setDialogDismissed] = useState(false);

//   const today = () => new Date().toISOString().slice(0, 10);
// const makeEmptyRow = (): DocRowState => ({
//   key: makeId(),
//   docType: "",
//   customName: "",
//   docDate: today(),
//   originalDocName: "",
//   originalDocDate: "",
//   originalPath: "",
//   status: "idle",
//   error: "",
// });


//   useEffect(() => {
//     setDocs([makeEmptyRow()]);
//   }, []);

//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     setMounted(true);
//     const handleStatus = () => setIsOnline(navigator.onLine);
//     handleStatus();
//     window.addEventListener("online", handleStatus);
//     window.addEventListener("offline", handleStatus);
//     return () => {
//       window.removeEventListener("online", handleStatus);
//       window.removeEventListener("offline", handleStatus);
//     };
//   }, []);

//   useEffect(() => {
//     setClientLoaded(false);
//     setClientName("");
//     setClientNameHint("");
//     setIsExisting(false);
//     setSaveProgress(null);
//     setIsSaving(false);
//     setUploadStats(null);
//     setUploadNotice("");
//     setDialogDismissed(false);
//   }, [clientCode]);

//   // صلاحيات الصفحة + تحميل الفروع للإدمن
//   useEffect(() => {
//     const checkAccess = async () => {
//       try {
//         const res = await fetch("/api/auth/me", {
//           credentials: "include",
//           cache: "no-store",
//         });
//         if (!res.ok) {
//           setAllowed(false);
//           return;
//         }
//         const data = await res.json().catch(() => ({}));
//         const userData = data?.user ?? data;
//         const isAllowed = canCreateClient(userData);
//         const branchNorm = normalizeBranchPerm(userData?.branch);
//         const adminFlag = canAccessAllBranches(userData);
//         setUserBranch(branchNorm);
//         setIsAdmin(adminFlag);
//         setSelectedBranch(branchNorm);

//         if (adminFlag) {
//           try {
//             const bRes = await fetch("/api/branches", {
//               credentials: "include",
//               cache: "no-store",
//             });
//             const bData = await bRes.json().catch(() => ({}));
//             if (bRes.ok && Array.isArray(bData.branches)) {
//               setBranches(bData.branches);
//             }
//           } catch {
//             /* ignore */
//           }
//         }

//         setAllowed(isAllowed);
//         if (!isAllowed) {
//           setMessage("لا تملك صلاحية الوصول إلى صفحة إضافة العميل.");
//         }
//       } catch {
//         setAllowed(false);
//       }
//     };
//     checkAccess();
//   }, [router]);

//   const addRow = () => {
//     setDocs((prev) => [...prev, makeEmptyRow()]);
//   };

//   const removeRowLocal = (key: string, allowEmpty = false) => {
//     setDocs((prev) => {
//       const next = prev.filter((d) => d.key !== key);
//       if (next.length === 0 && !allowEmpty) {
//         return [makeEmptyRow()];
//       }
//       return next;
//     });
//   };

//   const updateRow = (key: string, patch: Partial<DocRowState>) => {
//     setDocs((prev) =>
//       prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
//     );
//   };

//   const handleClientNameHint = () => {
//     if (!clientLoaded) {
//       setClientNameHint("برجاء تحميل بيانات العميل اولا");
//     }
//   };

//   const loadClient = async () => {
//     if (!clientCode.trim()) return;
//     setLoading(true);
//     setIsSaving(false);
//     setUploadStats(null);
//     setUploadNotice("");
//     setMessage("");
//     setClientNameHint("");
//     setCanEdit(true);
//     setClientLoaded(false);
//     setSaveProgress(null);
//     try {
//       const res = await fetch(
//         `/api/clients?code=${encodeURIComponent(clientCode.trim())}`,
//         {
//           credentials: "include",
//         },
//       );
//       if (!res.ok)
//         throw new Error("تعذر الاتصال بقاعدة البيانات، حاول مرة أخرى.");
//       const data = await res.json().catch(() => ({}));
//       setClientLoaded(true);

//       if (data?.client) {
//         const unauthorized = data.unauthorized;
//         setIsExisting(!unauthorized);
//         setClientName(data.client.clientName || "");
//         if (unauthorized) {
//           setMessage(
//             data.denyReason || "هذا العميل في فرع آخر ولا تملك صلاحية التعديل.",
//           );
//           setCanEdit(false);
//           setDocs([]);
//           return;
//         }
//       } else {
//         setIsExisting(false);
//         setClientName("");
//         setMessage("العميل غير موجود، سيتم إنشاؤه عند الحفظ.");
//       }

//       const docsRes = await fetch(`/api/clients/${clientCode.trim()}`, {
//         credentials: "include",
//       });
//       if (!docsRes.ok)
//         throw new Error("تعذر جلب مستندات العميل، حاول مرة أخرى.");
//       const docsData = await docsRes.json().catch(() => ({}));

//       if (docsData.unauthorized) {
//         setMessage(
//           docsData.denyReason || "هذا العميل في فرع آخر ولا تملك صلاحية العرض.",
//         );
//         setCanEdit(false);
//         setDocs([]);
//         return;
//       }

//       const existingDocs: ExistingDoc[] = docsData.documents ?? [];
//       if (existingDocs.length > 0) {
//         setDocs(
//           existingDocs.map((d) => {
//             const fixedName = correctDocName(d.DocName);
//             const matchedType = matchDocType(fixedName);
//             const isOther = !matchedType;
//             return {
//               key: makeId(),
//               docId: d.DocId,
//               docType: isOther ? OTHER_DOC_TYPE : matchedType!,
//               customName: isOther ? fixedName : "",
//               docDate: d.DocDate
//                 ? new Date(d.DocDate).toISOString().slice(0, 10)
//                 : "",
//               file: undefined,
//               fileLabel: undefined,
//               existingPath: d.FilePath,
//               originalDocName: fixedName,
//               originalDocDate: d.DocDate
//                 ? new Date(d.DocDate).toISOString().slice(0, 10)
//                 : "",
//               originalPath: d.FilePath,
//               status: "idle",
//               error: "",
//             };
//           }),
//         );
//         setMessage("تم تحميل مستندات العميل.");
//       } else {
//         setDocs([makeEmptyRow()]);
//       }
//     } catch (err) {
//       setMessage(
//         err instanceof Error
//           ? err.message
//           : "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقاً.",
//       );
//     } finally {
//       setIsSaving(false);
//       setUploadStats(null);
//       setLoading(false);
//     }
//   };

//   const handleDeleteRow = async (row: DocRowState) => {
//     if (loading) return;
//     if (!canEdit) return;
//     if (!row.docId) {
//       removeRowLocal(row.key);
//       return;
//     }
//     const confirmDelete = window.confirm(
//       "سيتم حذف المستند نهائياً، هل تريد المتابعة؟",
//     );
//     if (!confirmDelete) return;
//     try {
//       const res = await fetch("/api/documents/delete", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify({ docId: row.docId }),
//       });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) throw new Error(data.message || "تعذر حذف المستند.");
//       removeRowLocal(row.key, true);
//       setMessage("تم حذف المستند بنجاح.");
//     } catch (err) {
//       void logClientEvent({
//         action: "document.delete",
//         status: "failure",
//         message: err instanceof Error ? err.message : "تعذر حذف المستند، حاول لاحقاً.",
//         reason: err instanceof TypeError ? "network_error" : "client_error",
//         clientCode: clientCode.trim(),
//         docId: row.docId !== undefined ? String(row.docId) : undefined,
//       });
//       setMessage(
//         err instanceof Error ? err.message : "تعذر حذف المستند، حاول لاحقاً.",
//       );
//     }
//   };

//   const performSave = async (rowsOverride?: DocRowState[]) => {
//     const trimmedClientCode = clientCode.trim();
//     const trimmedClientName = clientName.trim();
//     setSaveProgress(null);

//     if (!trimmedClientCode) {
//       setMessage("يرجى إدخال كود العميل.");
//       return;
//     }
//     if (!trimmedClientName && !isExisting) {
//       setMessage("يرجى إدخال اسم العميل.");
//       return;
//     }
//     if (!canEdit) {
//       setMessage("ليس لديك صلاحية التعديل على هذا العميل.");
//       return;
//     }

//     const sourceRows = rowsOverride ?? docs;
//     const rowsToProcess = sourceRows.filter(
//       (row) => row.docType || row.file || row.customName || row.existingPath,
//     );
//     if (rowsToProcess.length === 0) {
//       setMessage("أضف مستنداً واحداً على الأقل.");
//       return;
//     }

//     const preparedRows = rowsToProcess.map((row) => {
//       const baseName =
//         row.docType === OTHER_DOC_TYPE
//           ? row.customName || row.docType
//           : row.docType;
//       const docName = baseName.trim();
//       const docDateValue =
//         row.docDate || (row.docId || row.existingPath ? "" : today());
//       let error = "";

//       if (!row.docType) {
//         error = "اختر نوع المستند.";
//       } else if (!docName) {
//         error = "يرجى إدخال اسم المستند.";
//       } else if (!row.file && !row.existingPath) {
//         error = "أرفق ملفاً للمستند.";
//       }

//       return { row, docName, docDateValue, error };
//     });

//     const invalidRows = preparedRows.filter((item) => item.error);
//     if (invalidRows.length > 0) {
//       invalidRows.forEach((item) =>
//         updateRow(item.row.key, { error: item.error, status: "error" }),
//       );
//     }

//     const rowsToSave: PreparedRow[] = preparedRows
//       .filter((item) => {
//         if (item.error) return false;
//         const row = item.row;
//         const isExisting = Boolean(row.docId || row.existingPath);
//         if (!isExisting) return true;
//         if (row.file) return true;
//         const originalName = (row.originalDocName ?? "").trim();
//         const originalDate = row.originalDocDate ?? "";
//         return (
//           (item.docName && item.docName !== originalName) ||
//           item.docDateValue !== originalDate
//         );
//       })
//       .map(({ row, docName, docDateValue }) => ({
//         row,
//         docName,
//         docDateValue,
//       }));

//     if (rowsToSave.length === 0) {
//       setMessage(
//         invalidRows.length > 0
//           ? "يرجى تصحيح الأخطاء أولاً."
//           : "لا توجد تغييرات لحفظها.",
//       );
//       return;
//     }

//     const uploadRows = rowsToSave.filter((item) => Boolean(item.row.file));
//     const totalBytes = uploadRows.reduce(
//       (sum, item) => sum + (item.row.file?.size ?? 0),
//       0,
//     );
//     const hasUploads = uploadRows.length > 0;
//     if (hasUploads) {
//       try {
//         const health = await checkArchiveHealth({ force: true });
//         if (!health.ok) {
//           setUploadNotice(ARCHIVE_UNAVAILABLE_MESSAGE);
//           setMessage(ARCHIVE_UNAVAILABLE_MESSAGE);
//           setIsSaving(false);
//           return;
//         }
//       } catch {
//         setUploadNotice("تعذر الاتصال بالخادم أو الإنترنت غير مستقر.");
//         setMessage("تعذر الاتصال بالخادم أو الإنترنت غير مستقر.");
//         setIsSaving(false);
//         return;
//       }
//     }
//     setIsSaving(hasUploads);
//     setDialogDismissed(false);
//     setUploadNotice("");
//     setUploadStats(
//       hasUploads
//         ? {
//             totalBytes,
//             completedBytes: 0,
//             startedAt: Date.now(),
//             speedBps: 0,
//           }
//         : null,
//     );

//     setLoading(true);
//     setMessage("");
//     setSaveProgress({
//       total: rowsToSave.length,
//       done: 0,
//       success: 0,
//       failed: 0,
//     });
//     try {
//       if (!isExisting) {
//         const createRes = await fetchWithTimeout("/api/clients", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({
//             clientCode: trimmedClientCode,
//             clientName: trimmedClientName,
//             branch: isAdmin ? selectedBranch || userBranch : undefined,
//           }),
//         });
//         const createData = await createRes.json().catch(() => ({}));
//         if (!createRes.ok)
//           throw new Error(createData.message || "تعذر إنشاء العميل.");
//         setIsExisting(true);
//       }

//       rowsToSave.forEach(({ row }) =>
//         updateRow(row.key, { error: "", status: "idle" }),
//       );

//       const updateProgress = (ok: boolean) => {
//         setSaveProgress((prev) => {
//           if (!prev) return prev;
//           return {
//             total: prev.total,
//             done: prev.done + 1,
//             success: prev.success + (ok ? 1 : 0),
//             failed: prev.failed + (ok ? 0 : 1),
//           };
//         });
//       };
//       const recordUploadedBytes = (bytes: number) => {
//         if (!bytes) return;
//         setUploadStats((prev) => {
//           if (!prev) return prev;
//           const completedBytes = Math.min(
//             prev.completedBytes + bytes,
//             prev.totalBytes || prev.completedBytes + bytes,
//           );
//           const elapsedSeconds = (Date.now() - prev.startedAt) / 1000;
//           const speedBps = elapsedSeconds > 0 ? completedBytes / elapsedSeconds : 0;
//           return { ...prev, completedBytes, speedBps };
//         });
//       };

//       let archiveUnavailableHit = false;

//       const processRow = async ({
//         row,
//         docName,
//         docDateValue,
//       }: PreparedRow) => {
//         try {
//           let fileUrl: string | undefined = row.existingPath;

//           if (row.file) {
//             if (!isPdfFile(row.file)) {
//               throw new Error("يسمح بملفات PDF فقط");
//             }
//             if (!isFileSizeOk(row.file)) {
//               throw new Error(fileSizeError);
//             }
//             await ensureArchiveAvailable(ARCHIVE_UNAVAILABLE_MESSAGE);
//             const formData = new FormData();
//             const renamedFile = renameFileWithClientCode(
//               row.file,
//               docName,
//               trimmedClientCode,
//             );
//             formData.append("file", renamedFile);
//             formData.append("docName", docName);
//             formData.append("docDate", docDateValue);
//             const { data: uploadData } = await uploadArchiveWithRetry({
//               clientCode: trimmedClientCode,
//               formData,
//               maxRetries: ARCHIVE_MAX_RETRIES,
//               defaultErrorMessage: "تعذر رفع الملف أو الاتصال بخدمة الأرشفة.",
//               timeoutMessage: "انتهت مهلة الاتصال بخدمة الأرشفة.",
//               onAttempt: (attempt) =>
//                 updateRow(row.key, {
//                   status: "uploading",
//                   error: "",
//                   retryCount: attempt,
//                 }),
//             });
//             fileUrl = extractFileUrl(uploadData);
//             if (!fileUrl)
//               throw new Error("لم يتم إرجاع رابط الملف من خدمة الأرشفة.");
//           }

//           if (!fileUrl) {
//             throw new Error("أرفق ملفاً للمستند.");
//           }

//           updateRow(row.key, {
//             status: "saving",
//             error: "",
//             retryCount: undefined,
//           });
//           const saveRes = await fetchWithTimeout(
//             `/api/clients/${trimmedClientCode}`,
//             {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               credentials: "include",
//               body: JSON.stringify({
//                 docId: row.docId,
//                 clientName: trimmedClientName || clientName,
//                 docName,
//                 docDate: docDateValue,
//                 fileUrl,
//                 replaceExisting: true,
//               }),
//             },
//           );
//           const saveData = await saveRes.json().catch(() => ({}));
//           if (!saveRes.ok)
//             throw new Error(saveData.message || "تعذر حفظ المستند.");

//           const updatedDoc = saveData.document ?? {};
//           const savedName = correctDocName(updatedDoc.DocName ?? docName);
//           const matchedType = matchDocType(savedName);
//           const docDateResult = updatedDoc.DocDate
//             ? new Date(updatedDoc.DocDate).toISOString().slice(0, 10)
//             : docDateValue;

//           updateRow(row.key, {
//             docId: updatedDoc.DocId ?? row.docId,
//             existingPath: updatedDoc.FilePath ?? fileUrl,
//             docType: matchedType ? matchedType : OTHER_DOC_TYPE,
//             customName: matchedType ? "" : savedName,
//             docDate: docDateResult,
//             originalDocName: savedName,
//             originalDocDate: docDateResult,
//             originalPath: updatedDoc.FilePath ?? fileUrl,
//             file: undefined,
//             fileLabel: undefined,
//             status: "success",
//             error: "",
//             retryCount: undefined,
//           });

//           return { ok: true };
//         } catch (err) {
//           const errorMessage = getArchiveUploadErrorMessage(err, {
//             fileTooLarge: fileSizeError,
//           });
//           const isNetworkFailure =
//             err instanceof TypeError ||
//             (err instanceof Error && err.name === "AbortError") ||
//             errorMessage.includes("الإنترنت") ||
//             errorMessage.includes("الاتصال") ||
//             errorMessage.includes("مهلة") ||
//             errorMessage.startsWith(ARCHIVE_UNAVAILABLE_MESSAGE);
//           if (isNetworkFailure) {
//             const notice = errorMessage.startsWith(ARCHIVE_UNAVAILABLE_MESSAGE)
//               ? ARCHIVE_UNAVAILABLE_MESSAGE
//               : err instanceof TypeError ||
//                   (err instanceof Error && err.name === "AbortError")
//                 ? "تعذر الاتصال بالخادم أو الإنترنت غير مستقر."
//                 : "الإنترنت فيه مشكلة أو الاتصال اتقطع أثناء الرفع.";
//             setUploadNotice(notice);
//             setIsSaving(false);
//           }
//           void logClientEvent({
//             action: row.docId ? "document.update" : "document.save",
//             status: "failure",
//             message: errorMessage,
//             reason: err instanceof TypeError ? "network_error" : "client_error",
//             clientCode: trimmedClientCode,
//             docId: row.docId !== undefined ? String(row.docId) : undefined,
//             details: { docName },
//           });
//           if (errorMessage.startsWith(ARCHIVE_UNAVAILABLE_MESSAGE)) {
//             archiveUnavailableHit = true;
//           }
//           updateRow(row.key, {
//             status: "error",
//             error: errorMessage,
//             retryCount:
//               err && typeof (err as { attempts?: number }).attempts === "number"
//                 ? (err as { attempts?: number }).attempts
//                 : undefined,
//           });
//           return { ok: false };
//         }
//       };

//       const grouped = new Map<string, PreparedRow[]>();
//       rowsToSave.forEach((item) => {
//         const key = normalizeDocName(item.docName) || item.docName.toLowerCase();
//         const group = grouped.get(key);
//         if (group) {
//           group.push(item);
//         } else {
//           grouped.set(key, [item]);
//         }
//       });

//       const groupTasks = Array.from(grouped.values()).map((group) => async () => {
//         const groupResults: Array<{ ok: boolean }> = [];
//         for (const item of group) {
//           const result = await processRow(item);
//           updateProgress(result.ok);
//           recordUploadedBytes(item.row.file?.size ?? 0);
//           groupResults.push(result);
//         }
//         return groupResults;
//       });

//       const groupedResults = await runWithConcurrency(
//         groupTasks,
//         MAX_PARALLEL_UPLOADS,
//       );
//       const results = groupedResults.flat();
//       const successCount = results.filter((r) => r.ok).length;
//       const failedCount = results.length - successCount;

//       if (failedCount === 0 && invalidRows.length === 0) {
//         setMessage("تم حفظ المستندات بنجاح.");
//         await loadClient();
//       } else {
//         const parts = [];
//         if (successCount) parts.push(`تم حفظ ${successCount} مستند`);
//         if (failedCount) parts.push(`فشل حفظ ${failedCount} مستند`);
//         if (invalidRows.length)
//           parts.push(`يوجد ${invalidRows.length} مستندات غير مكتملة`);
//         const summary = `${parts.join("، ")}.`;
//         setMessage(
//           archiveUnavailableHit
//             ? `${summary} ${ARCHIVE_UNAVAILABLE_MESSAGE}`
//             : summary,
//         );
//       }
//     } catch (err) {
//       setSaveProgress(null);
//       const fallbackMessage =
//         "تعذر الاتصال بالخادم أو قاعدة البيانات، حاول لاحقًا.";
//       const resolvedMessage =
//         err instanceof TypeError
//           ? "تعذر الاتصال بالخادم، حاول لاحقًا."
//           : err instanceof Error && err.name === "AbortError"
//             ? "انتهت مهلة الاتصال بالخادم، حاول لاحقًا."
//           : err instanceof Error
//             ? err.message
//             : fallbackMessage;
//       if (err instanceof TypeError) {
//         setUploadNotice("تعذر الاتصال بالخادم أو الإنترنت غير مستقر.");
//       } else if (err instanceof Error && err.name === "AbortError") {
//         setUploadNotice("انتهت مهلة الاتصال بالخادم، حاول لاحقًا.");
//       } else if (resolvedMessage.includes("الاتصال")) {
//         setUploadNotice("الإنترنت فيه مشكلة أو الاتصال اتقطع أثناء الرفع.");
//       }
//       setMessage(resolvedMessage);
//       void logClientEvent({
//         action: "document.save",
//         status: "failure",
//         message: resolvedMessage,
//         reason: err instanceof TypeError ? "network_error" : "client_error",
//         clientCode: trimmedClientCode,
//       });
//     } finally {
//       setIsSaving(false);
//       setUploadStats(null);
//       setDialogDismissed(false);
//       setLoading(false);
//     }
//   };

//   const handleSave = () => {
//     if (loading) return;
//     void performSave();
//   };

//   const handleRetryFailed = () => {
//     if (loading) return;
//     const failedRows = docs.filter((row) => row.status === "error");
//     if (failedRows.length === 0) {
//       setMessage("لا توجد مستندات فاشلة لإعادة المحاولة.");
//       return;
//     }
//     void performSave(failedRows);
//   };

//   const docTypeOptions = useMemo(
//     () =>
//       DOC_TYPES.map((t) => (
//         <option key={t} value={t}>
//           {t}
//         </option>
//       )),
//     [],
//   );

//   const failedRowsCount = docs.filter((row) => row.status === "error").length;

//   const progressPercent =
//     saveProgress && saveProgress.total > 0
//       ? Math.round((saveProgress.done / saveProgress.total) * 100)
//       : 0;
//   const bytesPercent =
//     uploadStats && uploadStats.totalBytes > 0
//       ? Math.min(
//           100,
//           Math.round((uploadStats.completedBytes / uploadStats.totalBytes) * 100),
//         )
//       : progressPercent;
//   const speedLabel = uploadStats
//     ? uploadStats.completedBytes > 0
//       ? formatSpeed(uploadStats.speedBps)
//       : "جاري القياس..."
//     : "";
//   const bytesLabel =
//     uploadStats && uploadStats.totalBytes > 0
//       ? `${formatBytes(uploadStats.completedBytes)} / ${formatBytes(
//           uploadStats.totalBytes,
//         )}`
//       : "";
//   const showUploadDialog = Boolean(
//     mounted && isSaving && saveProgress && !dialogDismissed,
//   );
//   const showUploadReopen = Boolean(
//     mounted && isSaving && saveProgress && dialogDismissed,
//   );

//   if (allowed === false) {
//     return (
//       <main className="min-h-screen flex items-center justify-center">
//         <p className="text-lg font-semibold text-rose-600">
//           ليس لديك صلاحية الوصول.
//         </p>
//       </main>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-[var(--background)] px-4 py-8">
//       {showUploadDialog ? (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
//           <div
//             role="dialog"
//             aria-modal="true"
//             className="relative w-[92%] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
//           >
//             <div className="flex items-center justify-between gap-3">
//               <div className="text-right">
//                 <p className="text-xs text-slate-500">جاري رفع الملفات</p>
//                 <p className="text-lg font-semibold text-slate-900">
//                   من فضلك انتظر...
//                 </p>
//               </div>
//               <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin" />
//             </div>
//             <div className="mt-4 space-y-2">
//               <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
//                 <div
//                   className="h-full bg-sky-500 transition-all"
//                   style={{ width: `${bytesPercent}%` }}
//                 />
//               </div>
//               <div className="flex items-center justify-between text-xs text-slate-500">
//                 <span>تحميل {bytesPercent}%</span>
//                 <span>
//                   {bytesLabel ||
//                     `${saveProgress?.done ?? 0}/${saveProgress?.total ?? 0}`}
//                 </span>
//               </div>
//               <div className="text-xs text-slate-500">
//                 سرعة الرفع:{" "}
//                 <span className="font-semibold text-slate-700">
//                   {speedLabel || "..."}
//                 </span>
//               </div>
//               {!isOnline ? (
//                 <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
//                   الإنترنت فيه مشكلة أو الاتصال اتقطع أثناء الرفع.
//                 </div>
//               ) : uploadNotice ? (
//                 <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
//                   {uploadNotice}
//                 </div>
//               ) : null}
//             </div>
//             <div className="mt-4 archive-scene">
//               <div className="cabinet">
//                 <div className="cabinet-top" />
//                 <div className="cabinet-shell" />
//                 <div className="cabinet-divider" />
//                 <div className="cabinet-drawer">
//                   <div className="drawer-tray" />
//                   <div className="drawer-front">
//                     <div className="drawer-label" />
//                     <div className="drawer-handle" />
//                   </div>
//                 </div>
//               </div>
//               <div className="doc doc-one">
//                 <span className="doc-line" />
//                 <span className="doc-line short" />
//               </div>
//               <div className="doc doc-two">
//                 <span className="doc-line" />
//                 <span className="doc-line short" />
//               </div>
//               <div className="doc doc-three">
//                 <span className="doc-line" />
//                 <span className="doc-line short" />
//               </div>
//             </div>
//             <div className="mt-4 flex justify-end">
//               <button
//                 type="button"
//                 onClick={() => setDialogDismissed(true)}
//                 className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-0"
//               >
//                 <span className="text-sm leading-none">x</span>
//                 إخفاء
//               </button>
//             </div>
//           </div>
//         </div>
//       ) : null}
//       {showUploadReopen ? (
//         <button
//           type="button"
//           onClick={() => setDialogDismissed(false)}
//           className="fixed bottom-6 right-6 z-40 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
//         >
//           عرض حالة الرفع
//         </button>
//       ) : null}
//       <div className="mx-auto max-w-6xl space-y-6">
//         <div className="text-right">
//           <p className="text-sm text-[var(--text-muted)]">
//             إضافة مستندات لعميل
//           </p>
//           <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
//             إنشاء عميل ورفع مستنداته
//           </h1>
//         </div>

//         <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div className="space-y-2 self-start">
//               <label className="block text-sm font-medium text-slate-700 text-right">
//                 كود العميل
//               </label>
//               <input
//                 type="text"
//                 value={clientCode}
//                 onChange={(e) => setClientCode(e.target.value)}
//                 disabled={loading}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     loadClient();
//                   }
//                 }}
//                 className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500`}
//                 placeholder="اكتب كود العميل"
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-sm font-medium text-slate-700 text-right">
//                 اسم العميل
//               </label>
//               <input
//                 type="text"
//                 value={clientName}
//                 onChange={(e) => setClientName(e.target.value)}
//                 readOnly={!clientLoaded}
//                 onFocus={handleClientNameHint}
//                 onClick={handleClientNameHint}
//                 disabled={!canEdit || loading}
//                 className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-rose-500 ${
//                   clientLoaded
//                     ? "border-slate-300 focus:ring-sky-500"
//                     : "border-rose-500 focus:ring-rose-500"
//                 }`}
//                 placeholder="اسم العميل"
//               />
//               {clientNameHint && !clientLoaded ? (
//                 <p className="text-base font-semibold !text-rose-600 text-right">
//                   {clientNameHint}
//                 </p>
//               ) : null}
//             </div>
//             {isAdmin ? (
//               <div className="space-y-2">
//                 <label className="block text-sm font-medium text-slate-700 text-right">
//                   اختر الفرع
//                 </label>
//                 <select
//                   value={selectedBranch}
//                   onChange={(e) => setSelectedBranch(e.target.value)}
//                   disabled={loading}
//                   className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
//                 >
//                   <option value="">-- اختر الفرع --</option>
//                   {branches.map((b) => (
//                     <option key={b.code} value={b.code}>
//                       {b.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             ) : null}
//           </div>

//           <div className="flex flex-wrap gap-3 justify-end">
//             <button
//               type="button"
//               onClick={loadClient}
//               disabled={loading}
//               className="rounded-lg load-data border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-[var(--header-btn-hover)] disabled:opacity-60"
//             >
//               تحميل بيانات العميل
//             </button>
//           </div>

//           <div className="space-y-3">
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
//               <div className="flex items-center gap-2">
//                 <h2 className="text-lg font-semibold text-[var(--text-strong)]">
//                   المستندات المراد رفعها
//                 </h2>
//                 {!canEdit ? (
//                   <span className="text-xs text-rose-600">
//                     لا تملك صلاحية التعديل لهذا العميل.
//                   </span>
//                 ) : null}
//               </div>
//             </div>

//             <div className="space-y-3">
//               {docs.map((row) => {
//                 const showOther = row.docType === OTHER_DOC_TYPE;
//                 const rowBusy =
//                   loading ||
//                   row.status === "uploading" ||
//                   row.status === "saving";
//                 return (
//                   <div
//                     key={row.key}
//                     className={`rounded-lg border p-4 ${
//                       row.status === "error"
//                         ? "border-rose-900 bg-slate-900 dark:border-rose-900 dark:bg-rose-950/40"
//                         : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
//                     }`}
//                   >
//                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
//                       <div className="md:col-span-3 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           نوع المستند
//                         </label>
//                         <select
//                           value={row.docType}
//                           onChange={(e) =>
//                             updateRow(row.key, {
//                               docType: e.target.value,
//                               error: "",
//                               status: "idle",
//                             })
//                           }
//                           disabled={!canEdit || rowBusy}
//                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                         >
//                           <option value="">-- اختر نوع المستند --</option>
//                           {docTypeOptions}
//                         </select>
//                       </div>

//                       {showOther && (
//                         <div className="md:col-span-3 space-y-1">
//                           <label className="block text-base font-medium text-slate-700 text-right">
//                             اسم مخصص
//                           </label>
//                           <input
//                             type="text"
//                             value={row.customName}
//                             onChange={(e) =>
//                               updateRow(row.key, {
//                                 customName: e.target.value,
//                                 error: "",
//                                 status: "idle",
//                               })
//                             }
//                             disabled={!canEdit || rowBusy}
//                             className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                             placeholder="اكتب اسم المستند"
//                           />
//                         </div>
//                       )}

//                       <div className="md:col-span-2 space-y-1 hidden">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           التاريخ
//                         </label>
//                         <input
//                           type="date"
//                           value={row.docDate}
//                           onChange={(e) =>
//                             updateRow(row.key, {
//                               docDate: e.target.value,
//                               error: "",
//                               status: "idle",
//                             })
//                           }
//                           disabled={!canEdit || rowBusy}
//                           className="w-full rounded-lg border border-slate-300 px-3 h-9 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
//                         />
//                       </div>

//                       <div className="md:col-span-3 space-y-1">
//                         <label className="block text-base font-medium text-slate-700 text-right">
//                           الملف
//                         </label>

//                         {row.existingPath && (
//                           <a
//                             href={`/documents/view/${row.docId}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="block text-base text-sky-700 underline font-medium mb-1"
//                           >
//                             عرض الملف الحالي
//                           </a>
//                         )}

//                         <input
//                           id={`file-${row.key}`}
//                           type="file"
//                           accept=".pdf,application/pdf"
//                           disabled={!canEdit || rowBusy}
//                           onChange={(e) => {
//                             const file = e.target.files?.[0];
//                             if (file && !isPdfFile(file)) {
//                               updateRow(row.key, {
//                                 file: undefined,
//                                 fileLabel: undefined,
//                                 error: "يسمح بملفات PDF فقط",
//                                 status: "error",
//                               });
//                               e.target.value = "";
//                               return;
//                             }
//                             if (file && !isFileSizeOk(file)) {
//                               updateRow(row.key, {
//                                 file: undefined,
//                                 fileLabel: undefined,
//                                 error: fileSizeError,
//                                 status: "error",
//                               });
//                               e.target.value = "";
//                               return;
//                             }
//                             updateRow(row.key, {
//                               file,
//                               fileLabel: file ? file.name : undefined,
//                               error: "",
//                               status: "idle",
//                             });
//                           }}
//                           className="hidden"
//                         />
//                         <div className="flex items-center gap-2">
//                           <button
//                             type="button"
//                             disabled={!canEdit || rowBusy}
//                             onClick={() => {
//                               const el = document.getElementById(
//                                 `file-${row.key}`,
//                               ) as HTMLInputElement | null;
//                               el?.click();
//                             }}
//                             className="rounded-lg upload-files border px-4 h-9 text-sm font-semibold shadow-sm hover:shadow disabled:opacity-60"
//                           >
//                             {row.fileLabel ? "تغيير الملف" : "اختر ملف"}
//                           </button>
//                           {row.fileLabel && (
//                             <span className="text-xs text-slate-500 truncate max-w-[140px]">
//                               {row.fileLabel}
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       <div className="md:col-span-1 flex justify-end">
//                         <button
//                           type="button"
//                           onClick={() => handleDeleteRow(row)}
//                           disabled={!canEdit || rowBusy}
//                           className="rounded-lg bg-rose-600 px-4 h-9 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
//                         >
//                           حذف
//                         </button>
//                       </div>
//                     </div>
//                     {row.status && row.status !== "idle" ? (
//                       <p
//                         className={`mt-2 text-xs text-right ${
//                           row.status === "success"
//                             ? "text-emerald-600"
//                             : row.status === "error"
//                               ? "text-rose-600"
//                               : "text-slate-600"
//                         }`}
//                       >
//                         {row.status === "uploading"
//                           ? `جارٍ رفع الملف...${
//                               row.retryCount
//                                 ? ` (محاولة ${row.retryCount}/${ARCHIVE_MAX_ATTEMPTS})`
//                                 : ""
//                             }`
//                           : row.status === "saving"
//                             ? "جارٍ حفظ البيانات..."
//                             : row.status === "success"
//                               ? "تم الحفظ"
//                               : row.status === "error"
//                                 ? "فشل الحفظ"
//                                 : ""}
//                       </p>
//                     ) : null}
//                     {row.error ? (
//                       <p className="mt-1 text-xs text-rose-600 text-right">
//                         {row.error}
//                       </p>
//                     ) : null}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="flex flex-wrap gap-3 justify-end">
//             <button
//               type="button"
//               onClick={addRow}
//               disabled={!canEdit || loading}
//               className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 attention-nudge"
//             >
//               إضافة مستند جديد
//             </button>
//             <button
//               type="button"
//               onClick={handleRetryFailed}
//               disabled={loading || failedRowsCount === 0}
//               className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
//             >
//               إعادة المحاولة للصفوف الفاشلة
//             </button>
//             <button
//               type="button"
//               onClick={handleSave}
//               disabled={loading || !canEdit}
//               className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
//             >
//               {loading ? "جاري الحفظ..." : "حفظ المستندات"}
//             </button>
//           </div>

//           {saveProgress ? (
//             <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-right">
//               <div className="flex items-center justify-between">
//                 <span>
//                   {saveProgress.done < saveProgress.total
//                     ? "جاري حفظ المستندات..."
//                     : "اكتمل حفظ المستندات"}
//                 </span>
//                 <span>
//                   {saveProgress.done}/{saveProgress.total}
//                 </span>
//               </div>
//               <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
//                 <div
//                   className="h-full bg-sky-500 transition-all"
//                   style={{ width: `${progressPercent}%` }}
//                 />
//               </div>
//               <div className="mt-1 text-xs text-slate-500">
//                 نجح {saveProgress.success}، فشل {saveProgress.failed}
//               </div>
//             </div>
//           ) : null}

//           {message ? (
//             <p className="text-lg text-right text-[var(--text-strong)]">
//               {message}
//             </p>
//           ) : null}
//         </div>
//       </div>
//       <style jsx>{`
//         .archive-scene {
//           position: relative;
//           height: 170px;
//           background: radial-gradient(
//               circle at 70% 10%,
//               rgba(148, 163, 184, 0.18),
//               transparent 55%
//             ),
//             radial-gradient(
//               circle at 20% 90%,
//               rgba(59, 130, 246, 0.08),
//               transparent 60%
//             );
//           border-radius: 18px;
//         }
//         .cabinet {
//           position: absolute;
//           left: 50%;
//           bottom: 12px;
//           width: 220px;
//           height: 130px;
//           transform: translateX(-50%);
//         }
//         .cabinet-shell {
//           position: absolute;
//           inset: 8px 0 0;
//           border-radius: 20px;
//           background: linear-gradient(180deg, #f1f5f9 0%, #d7dde6 100%);
//           border: 1px solid #d0d7e2;
//           box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
//         }
//         .cabinet-top {
//           position: absolute;
//           top: 0;
//           left: 12px;
//           width: 196px;
//           height: 12px;
//           border-radius: 999px;
//           background: #cbd5e1;
//           box-shadow: inset 0 -2px 0 #b6c2d1;
//         }
//         .cabinet-divider {
//           position: absolute;
//           left: 14px;
//           right: 14px;
//           top: 48px;
//           height: 2px;
//           background: rgba(148, 163, 184, 0.5);
//         }
//         .cabinet-drawer {
//           position: absolute;
//           left: 16px;
//           bottom: 18px;
//           width: 188px;
//           height: 56px;
//           transform-origin: center bottom;
//           animation: drawer-move 3s ease-in-out infinite;
//         }
//         .drawer-front {
//           position: absolute;
//           inset: 0;
//           border-radius: 14px;
//           background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%);
//           border: 1px solid #c5ceda;
//           box-shadow: inset 0 -4px 0 #b6c2d1;
//         }
//         .drawer-tray {
//           position: absolute;
//           top: 6px;
//           left: 10px;
//           right: 10px;
//           height: 16px;
//           border-radius: 8px;
//           background: rgba(148, 163, 184, 0.35);
//           box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6);
//         }
//         .drawer-handle {
//           position: absolute;
//           left: 50%;
//           bottom: 10px;
//           width: 46px;
//           height: 10px;
//           border-radius: 999px;
//           transform: translateX(-50%);
//           background: #94a3b8;
//         }
//         .drawer-label {
//           position: absolute;
//           left: 20px;
//           top: 12px;
//           width: 52px;
//           height: 10px;
//           border-radius: 6px;
//           background: #e2e8f0;
//           box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.5);
//         }
//         .doc {
//           position: absolute;
//           top: 32px;
//           left: calc(50% - 210px);
//           width: 70px;
//           height: 48px;
//           padding: 8px 10px;
//           border-radius: 12px;
//           background: #ffffff;
//           border: 1px solid #e2e8f0;
//           box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
//           display: flex;
//           flex-direction: column;
//           gap: 6px;
//           animation: doc-archive 3s ease-in-out infinite;
//         }
//         .doc-two {
//           animation-delay: 1s;
//         }
//         .doc-three {
//           animation-delay: 2s;
//         }
//         .doc-line {
//           display: block;
//           height: 4px;
//           border-radius: 999px;
//           background: #94a3b8;
//         }
//         .doc-line.short {
//           width: 60%;
//         }
//         @keyframes doc-archive {
//           0% {
//             transform: translateX(-20px) translateY(-4px) rotate(-2deg) scale(0.9);
//             opacity: 0;
//           }
//           20% {
//             opacity: 1;
//           }
//           50% {
//             transform: translateX(160px) translateY(0) rotate(0deg) scale(1);
//             opacity: 1;
//           }
//           68% {
//             transform: translateX(172px) translateY(20px) rotate(1deg) scale(0.9);
//             opacity: 0.9;
//           }
//           100% {
//             transform: translateX(184px) translateY(36px) rotate(2deg) scale(0.8);
//             opacity: 0;
//           }
//         }
//         @keyframes drawer-move {
//           0%,
//           40% {
//             transform: translateY(0) scale(1);
//           }
//           60% {
//             transform: translateY(6px) scale(1.02);
//           }
//           80% {
//             transform: translateY(0) scale(1);
//           }
//           100% {
//             transform: translateY(0) scale(1);
//           }
//         }
//       `}</style>
//     </main>
//   );
// }
