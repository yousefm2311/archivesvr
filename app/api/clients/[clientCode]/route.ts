// // import { NextResponse } from "next/server";
// // import { getAuthUserFromCookies } from "@/lib/auth";
// // import { connectMongo } from "@/lib/mongo";
// // import { ClientDocumentModel } from "@/models/ClientDocument";
// // import { ClientModel } from "@/models/Client";
// // import { correctDocName, normalizeDocName } from "@/lib/documents";
// // import { canAccessAll, getUserBranch, normalizeBranch } from "@/lib/permissions";
// // import { getBranchNames, getBranchName } from "@/lib/branches";

// // type InsertBody = {
// //   clientName?: string;
// //   docName?: string;
// //   docDate?: string | null;
// //   docId?: string | number;
// //   fileUrl?: string;
// //   filePath?: string;
// //   archivePath?: string;
// //   url?: string;
// //   path?: string;
// //   files?: Array<{ path?: string; url?: string; filePath?: string }>;
// //   archive?: { archivePath?: string; path?: string; url?: string };
// //   replaceExisting?: boolean;
// // };

// // type StoredDoc = {
// //   _id?: unknown;
// //   docName: string;
// //   docDate?: Date | null;
// //   fileUrl?: string;
// //   filePath?: string;
// //   uploadedBy?: string | number;
// //   branch?: string;
// //   createdAt?: Date;
// //   clientName?: string;
// //   clientCode: number;
// // };

// // const normalizeDoc = (doc: StoredDoc, branchName?: string) => {
// //   const cleanedName = correctDocName(doc.docName);
// //   return {
// //     DocId: (doc._id ?? "").toString(),
// //     DocName: cleanedName,
// //     DocDate: doc.docDate ?? null,
// //     FilePath: doc.fileUrl ?? doc.filePath,
// //     UploadedBy: doc.uploadedBy,
// //     Branch: doc.branch,
// //     BranchName: branchName,
// //     CreatedAt: doc.createdAt,
// //     ClientName: doc.clientName,
// //     ClientCode: doc.clientCode,
// //   };
// // };

// // export async function GET(
// //   _request: Request,
// //   context: { params: Promise<{ clientCode: string }> }
// // ) {
// //   const user = await getAuthUserFromCookies();
// //   if (!user) {
// //     return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
// //   }

// //   const params = await context.params;
// //   const clientCode = Number(params.clientCode);
// //   if (Number.isNaN(clientCode)) {
// //     return NextResponse.json(
// //       { message: "حقل clientCode غير صالح" },
// //       { status: 400 }
// //     );
// //   }

// //   try {
// //     await connectMongo();
// //     const userBranch = normalizeBranch(getUserBranch(user));
// //     const canViewAll = canAccessAll(user);

// //     const client = await ClientModel.findOne({ clientCode }).lean();
// //     if (!client) {
// //       return NextResponse.json({ documents: [] });
// //     }
// //     const clientBranch = normalizeBranch(client.createdBranch);
// //     if (!canViewAll && clientBranch !== userBranch) {
// //       return NextResponse.json({
// //         documents: [],
// //         unauthorized: true,
// //         denyReason: "العميل مسجل في فرع آخر ولا تملك صلاحية الاطلاع على مستنداته",
// //       });
// //     }

// //     const docs = await ClientDocumentModel.find(
// //       canViewAll ? { clientCode } : { clientCode, branch: userBranch }
// //     )
// //       .sort({ createdAt: -1 })
// //       .lean();

// //     const branchNames = await getBranchNames(docs.map((d) => (d as any).branch));
// //     const clientBranchName = await getBranchName(client.createdBranch);

// //     return NextResponse.json({
// //       documents: docs.map((d) =>
// //         normalizeDoc(d, branchNames.get(normalizeBranch((d as any).branch)))
// //       ),
// //       client: {
// //         id: (client._id ?? "").toString(),
// //         clientCode: client.clientCode,
// //         clientName: client.clientName,
// //         branchName: clientBranchName,
// //         createdAt: client.createdAt,
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Select client docs failed:", error);
// //     return NextResponse.json(
// //       { message: "حدث خطأ أثناء جلب مستندات العميل" },
// //       { status: 500 }
// //     );
// //   }
// // }

// // export async function POST(
// //   request: Request,
// //   context: { params: Promise<{ clientCode: string }> }
// // ) {
// //   const user = await getAuthUserFromCookies();
// //   if (!user) {
// //     return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
// //   }

// //   const params = await context.params;
// //   const clientCode = Number(params.clientCode);
// //   if (Number.isNaN(clientCode)) {
// //     return NextResponse.json(
// //       { message: "حقل clientCode غير صالح" },
// //       { status: 400 }
// //     );
// //   }

// //   const body = (await request.json()) as InsertBody;
// //   const { clientName, docDate, replaceExisting, docId } = body;
// //   const cleanedDocName = correctDocName(body.docName ?? "");
// //   const normalizedDocName = normalizeDocName(cleanedDocName);
// //   const branch = normalizeBranch(getUserBranch(user));
// //   const branchName = await getBranchName(branch);
// //   const canEditAll = canAccessAll(user);

// //   await connectMongo();
// //   const client = await ClientModel.findOne({ clientCode }).lean();
// //   if (!client) {
// //     return NextResponse.json({ message: "العميل غير موجود" }, { status: 404 });
// //   }
// //   const clientBranch = normalizeBranch(client.createdBranch);
// //   if (!canEditAll && clientBranch !== branch) {
// //     return NextResponse.json(
// //       { message: "غير مصرح لك بتعديل مستندات عميل في فرع آخر" },
// //       { status: 403 }
// //     );
// //   }

// //   const fileUrl =
// //     body.fileUrl ||
// //     body.filePath ||
// //     body.archivePath ||
// //     body.url ||
// //     body.path ||
// //     body.archive?.archivePath ||
// //     body.archive?.path ||
// //     body.archive?.url ||
// //     body.files?.[0]?.path ||
// //     body.files?.[0]?.url ||
// //     body.files?.[0]?.filePath;

// //   if (!normalizedDocName || !fileUrl) {
// //     return NextResponse.json(
// //       { message: "يجب إرسال اسم المستند ورابط الملف" },
// //       { status: 400 }
// //     );
// //   }

// //   try {
// //     const now = new Date();
// //     const trimmedClientName = clientName?.trim() ?? "";
// //     const docDateValue = docDate ? new Date(docDate) : null;

// //     if (replaceExisting) {
// //       let updatedDoc: StoredDoc | null = null;

// //       if (docId) {
// //         if (!canEditAll) {
// //           const existing = await ClientDocumentModel.findOne({
// //             _id: docId,
// //             branch,
// //           }).lean();
// //           if (!existing) {
// //             return NextResponse.json(
// //               { message: "غير مصرح لك بتعديل هذا المستند" },
// //               { status: 403 }
// //             );
// //           }
// //         }

// //         updatedDoc = (await ClientDocumentModel.findByIdAndUpdate(
// //           docId,
// //           {
// //             $set: {
// //               clientName: trimmedClientName,
// //               docName: cleanedDocName,
// //               normalizedDocName,
// //               docDate: docDateValue,
// //               fileUrl,
// //               uploadedBy: user.empId,
// //               branch,
// //               branchName,
// //               updatedAt: now,
// //             },
// //             $setOnInsert: { createdAt: now },
// //           },
// //           { new: true }
// //         ).lean()) as StoredDoc | null;
// //       }

// //       if (!updatedDoc) {
// //         updatedDoc = (await ClientDocumentModel.findOneAndUpdate(
// //           canEditAll
// //             ? { clientCode, normalizedDocName }
// //             : { clientCode, normalizedDocName, branch },
// //           {
// //             $set: {
// //               clientName: trimmedClientName,
// //               docName: cleanedDocName,
// //               normalizedDocName,
// //               docDate: docDateValue,
// //               fileUrl,
// //               uploadedBy: user.empId,
// //               branch,
// //               branchName,
// //               updatedAt: now,
// //             },
// //             $setOnInsert: { createdAt: now },
// //           },
// //           { upsert: true, new: true }
// //         ).lean()) as StoredDoc | null;
// //       }

// //       return NextResponse.json({ document: updatedDoc ? normalizeDoc(updatedDoc) : null });
// //     }

// //     const doc = await ClientDocumentModel.create({
// //       clientCode,
// //       clientName: trimmedClientName,
// //       docName: cleanedDocName,
// //       normalizedDocName,
// //       docDate: docDateValue,
// //       fileUrl,
// //       uploadedBy: user.empId,
// //       branch,
// //       branchName,
// //       createdAt: now,
// //     });

// //     return NextResponse.json({
// //       document: normalizeDoc(doc.toObject()),
// //     });
// //   } catch (error) {
// //     console.error("Insert client doc failed:", error);
// //     return NextResponse.json(
// //       { message: "حدث خطأ أثناء حفظ المستند" },
// //       { status: 500 }
// //     );
// //   }
// // }

// // import { NextResponse } from "next/server";
// // import { getAuthUserFromCookies } from "@/lib/auth";
// // import { connectMongo } from "@/lib/mongo";
// // import { ClientDocumentModel } from "@/models/ClientDocument";
// // import { ClientModel } from "@/models/Client";
// // import { correctDocName, normalizeDocName } from "@/lib/documents";
// // import { canAccessAll, getUserBranch, normalizeBranch } from "@/lib/permissions";
// // import { getBranchNames, getBranchName } from "@/lib/branches";

// // type InsertBody = {
// //   clientName?: string;
// //   docName?: string;
// //   docDate?: string | null;
// //   docId?: string | number;
// //   fileUrl?: string;
// //   filePath?: string;
// //   archivePath?: string;
// //   url?: string;
// //   path?: string;
// //   files?: Array<{ path?: string; url?: string; filePath?: string }>;
// //   archive?: { archivePath?: string; path?: string; url?: string };
// //   replaceExisting?: boolean;
// // };

// // type StoredDoc = {
// //   _id?: unknown;
// //   docName: string;
// //   docDate?: Date | null;
// //   fileUrl?: string;
// //   filePath?: string;
// //   uploadedBy?: string | number;
// //   branch?: string;
// //   createdAt?: Date;
// //   clientName?: string;
// //   clientCode: number;
// // };

// // const normalizeDoc = (doc: StoredDoc, branchName?: string) => {
// //   const cleanedName = correctDocName(doc.docName);
// //   return {
// //     DocId: (doc._id ?? "").toString(),
// //     DocName: cleanedName,
// //     DocDate: doc.docDate ?? null,
// //     FilePath: doc.fileUrl ?? doc.filePath,
// //     UploadedBy: doc.uploadedBy,
// //     Branch: doc.branch,
// //     BranchName: branchName,
// //     CreatedAt: doc.createdAt,
// //     ClientName: doc.clientName,
// //     ClientCode: doc.clientCode,
// //   };
// // };

// // export async function GET(
// //   _request: Request,
// //   context: { params: Promise<{ clientCode: string }> }
// // ) {
// //   const user = await getAuthUserFromCookies();
// //   if (!user) {
// //     return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
// //   }

// //   const params = await context.params;
// //   const clientCode = Number(params.clientCode);
// //   if (Number.isNaN(clientCode)) {
// //     return NextResponse.json(
// //       { message: "حقل clientCode غير صالح" },
// //       { status: 400 }
// //     );
// //   }

// //   try {
// //     await connectMongo();
// //     const userBranch = normalizeBranch(getUserBranch(user));
// //     const canViewAll = canAccessAll(user);

// //     const client = await ClientModel.findOne({ clientCode }).lean();
// //     if (!client) {
// //       return NextResponse.json({ documents: [] });
// //     }
// //     const clientBranch = normalizeBranch(client.createdBranch);
// //     if (!canViewAll && clientBranch !== userBranch) {
// //       return NextResponse.json({
// //         documents: [],
// //         unauthorized: true,
// //         denyReason: "العميل مسجل في فرع آخر ولا تملك صلاحية الاطلاع على مستنداته",
// //       });
// //     }

// //     const docs = await ClientDocumentModel.find(
// //       canViewAll ? { clientCode } : { clientCode, branch: userBranch }
// //     )
// //       .sort({ createdAt: -1 })
// //       .lean();

// //     const branchNames = await getBranchNames(docs.map((d) => (d as any).branch));
// //     const clientBranchName = await getBranchName(client.createdBranch);

// //     return NextResponse.json({
// //       documents: docs.map((d) =>
// //         normalizeDoc(d, branchNames.get(normalizeBranch((d as any).branch)))
// //       ),
// //       client: {
// //         id: (client._id ?? "").toString(),
// //         clientCode: client.clientCode,
// //         clientName: client.clientName,
// //         branchName: clientBranchName,
// //         createdAt: client.createdAt,
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Select client docs failed:", error);
// //     return NextResponse.json(
// //       { message: "حدث خطأ أثناء جلب مستندات العميل" },
// //       { status: 500 }
// //     );
// //   }
// // }

// // export async function POST(
// //   request: Request,
// //   context: { params: Promise<{ clientCode: string }> }
// // ) {
// //   const user = await getAuthUserFromCookies();
// //   if (!user) {
// //     return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
// //   }

// //   const params = await context.params;
// //   const clientCode = Number(params.clientCode);
// //   if (Number.isNaN(clientCode)) {
// //     return NextResponse.json(
// //       { message: "حقل clientCode غير صالح" },
// //       { status: 400 }
// //     );
// //   }

// //   const body = (await request.json()) as InsertBody;
// //   const { clientName, docDate, replaceExisting, docId } = body;
// //   const cleanedDocName = correctDocName(body.docName ?? "");
// //   const normalizedDocName = normalizeDocName(cleanedDocName);
// //   const branch = normalizeBranch(getUserBranch(user));
// //   const branchName = await getBranchName(branch);
// //   const canEditAll = canAccessAll(user);

// //   await connectMongo();
// //   const client = await ClientModel.findOne({ clientCode }).lean();
// //   if (!client) {
// //     return NextResponse.json({ message: "العميل غير موجود" }, { status: 404 });
// //   }
// //   const clientBranch = normalizeBranch(client.createdBranch);
// //   if (!canEditAll && clientBranch !== branch) {
// //     return NextResponse.json(
// //       { message: "غير مصرح لك بتعديل مستندات عميل في فرع آخر" },
// //       { status: 403 }
// //     );
// //   }

// //   const fileUrl =
// //     body.fileUrl ||
// //     body.filePath ||
// //     body.archivePath ||
// //     body.url ||
// //     body.path ||
// //     body.archive?.archivePath ||
// //     body.archive?.path ||
// //     body.archive?.url ||
// //     body.files?.[0]?.path ||
// //     body.files?.[0]?.url ||
// //     body.files?.[0]?.filePath;

// //   if (!normalizedDocName || !fileUrl) {
// //     return NextResponse.json(
// //       { message: "يجب إرسال اسم المستند ورابط الملف" },
// //       { status: 400 }
// //     );
// //   }

// //   try {
// //     const now = new Date();
// //     const trimmedClientName = clientName?.trim() ?? "";
// //     const docDateValue = docDate ? new Date(docDate) : null;

// //     if (replaceExisting) {
// //       let updatedDoc: StoredDoc | null = null;

// //       if (docId) {
// //         if (!canEditAll) {
// //           const existing = await ClientDocumentModel.findOne({
// //             _id: docId,
// //             branch,
// //           }).lean();
// //           if (!existing) {
// //             return NextResponse.json(
// //               { message: "غير مصرح لك بتعديل هذا المستند" },
// //               { status: 403 }
// //             );
// //           }
// //         }

// //         updatedDoc = (await ClientDocumentModel.findByIdAndUpdate(
// //           docId,
// //           {
// //             $set: {
// //               clientName: trimmedClientName,
// //               docName: cleanedDocName,
// //               normalizedDocName,
// //               docDate: docDateValue,
// //               fileUrl,
// //               uploadedBy: user.empId,
// //               branch,
// //               branchName,
// //               updatedAt: now,
// //             },
// //             $setOnInsert: { createdAt: now },
// //           },
// //           { new: true }
// //         ).lean()) as StoredDoc | null;
// //       }

// //       if (!updatedDoc) {
// //         updatedDoc = (await ClientDocumentModel.findOneAndUpdate(
// //           canEditAll
// //             ? { clientCode, normalizedDocName }
// //             : { clientCode, normalizedDocName, branch },
// //           {
// //             $set: {
// //               clientName: trimmedClientName,
// //               docName: cleanedDocName,
// //               normalizedDocName,
// //               docDate: docDateValue,
// //               fileUrl,
// //               uploadedBy: user.empId,
// //               branch,
// //               branchName,
// //               updatedAt: now,
// //             },
// //             $setOnInsert: { createdAt: now },
// //           },
// //           { upsert: true, new: true }
// //         ).lean()) as StoredDoc | null;
// //       }

// //       return NextResponse.json({ document: updatedDoc ? normalizeDoc(updatedDoc) : null });
// //     }

// //     // حساب لاحقة رقمية تلقائياً إذا وُجدت مستندات بنفس الاسم
// //     let finalDocName = cleanedDocName;
// //     let finalNormalized = normalizedDocName;
// //     const baseNorm = normalizedDocName;
// //     const escaped = baseNorm.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
// //     // مطابقة لاحقة رقمية سواء كانت بمسافة أو شرطة
// //     const regex = new RegExp(`^${escaped}(?:[\\s-](\\d+))?$`, "i");
// //     const existingDocs = await ClientDocumentModel.find(
// //       canEditAll
// //         ? { clientCode, normalizedDocName: { $regex: regex } }
// //         : { clientCode, branch, normalizedDocName: { $regex: regex } }
// //     )
// //       .select("normalizedDocName")
// //       .lean();

// //     let suffix = 0;
// //     existingDocs.forEach((d) => {
// //       const norm = (d as any).normalizedDocName as string;
// //       if (!norm) return;
// //       const match = norm.match(/[\s-](\d+)$/);
// //       if (match) {
// //         const num = Number(match[1]);
// //         if (!Number.isNaN(num)) suffix = Math.max(suffix, num);
// //       } else {
// //         suffix = Math.max(suffix, 1);
// //       }
// //     });

// //     if (suffix > 0) {
// //       const next = suffix + 1;
// //       finalDocName = `${cleanedDocName} ${next}`;
// //       finalNormalized = `${baseNorm} ${next}`;
// //     }

// //     const doc = await ClientDocumentModel.create({
// //       clientCode,
// //       clientName: trimmedClientName,
// //       docName: finalDocName,
// //       normalizedDocName: finalNormalized,
// //       docDate: docDateValue,
// //       fileUrl,
// //       uploadedBy: user.empId,
// //       branch,
// //       branchName,
// //       createdAt: now,
// //     });

// //     return NextResponse.json({
// //       document: normalizeDoc(doc.toObject()),
// //     });
// //   } catch (error) {
// //     console.error("Insert client doc failed:", error);
// //     return NextResponse.json(
// //       { message: "حدث خطأ أثناء حفظ المستند" },
// //       { status: 500 }
// //     );
// //   }
// // }







// import { NextResponse } from "next/server";
// import { getAuthUserFromCookies } from "@/lib/auth";
// import { connectMongo } from "@/lib/mongo";
// import { ClientDocumentModel } from "@/models/ClientDocument";
// import { ClientModel } from "@/models/Client";
// import { correctDocName, normalizeDocName } from "@/lib/documents";
// import { canAccessAll, getUserBranch, normalizeBranch } from "@/lib/permissions";
// import { getBranchNames, getBranchName } from "@/lib/branches";

// type InsertBody = {
//   clientName?: string;
//   docName?: string;
//   docDate?: string | null;
//   docId?: string | number;
//   fileUrl?: string;
//   filePath?: string;
//   archivePath?: string;
//   url?: string;
//   path?: string;
//   files?: Array<{ path?: string; url?: string; filePath?: string }>;
//   archive?: { archivePath?: string; path?: string; url?: string };
//   replaceExisting?: boolean;
// };

// type StoredDoc = {
//   _id?: unknown;
//   docName: string;
//   docDate?: Date | null;
//   fileUrl?: string;
//   filePath?: string;
//   uploadedBy?: string | number;
//   branch?: string;
//   createdAt?: Date;
//   clientName?: string;
//   clientCode: string;
//   clientCodeRaw?: string;
// };

// const normalizeDoc = (doc: StoredDoc, branchName?: string) => {
//   const cleanedName = correctDocName(doc.docName);
//   return {
//     DocId: (doc._id ?? "").toString(),
//     DocName: cleanedName,
//     DocDate: doc.docDate ?? null,
//     FilePath: doc.fileUrl ?? doc.filePath,
//     UploadedBy: doc.uploadedBy,
//     Branch: doc.branch,
//     BranchName: branchName,
//     CreatedAt: doc.createdAt,
//     ClientName: doc.clientName,
//     ClientCode: doc.clientCodeRaw ?? doc.clientCode,
//   };
// };

// export async function GET(
//   _request: Request,
//   context: { params: Promise<{ clientCode: string }> }
// ) {
//   const user = await getAuthUserFromCookies();
//   if (!user) {
//     return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
//   }

//   const params = await context.params;
//   const rawCode = (params.clientCode ?? "").trim();
//   if (!rawCode) return NextResponse.json({ documents: [] });

//   try {
//     await connectMongo();
//     const userBranch = normalizeBranch(getUserBranch(user));
//     const canViewAll = canAccessAll(user);

//     const client = await ClientModel.findOne({
//       $or: [{ clientCode: rawCode }, { clientCodeRaw: rawCode }],
//     }).lean();
//     if (!client) {
//       return NextResponse.json({ documents: [] });
//     }
//     const clientBranch = normalizeBranch((client as any).createdBranch);
//     if (!canViewAll && clientBranch && clientBranch !== userBranch) {
//       return NextResponse.json({
//         documents: [],
//         unauthorized: true,
//         denyReason: "العميل مسجل في فرع آخر ولا تملك صلاحية الاطلاع على مستنداته",
//       });
//     }

//     const docs = await ClientDocumentModel.find(
//       canViewAll
//         ? { clientCode: (client as any).clientCode }
//         : { clientCode: (client as any).clientCode, branch: userBranch }
//     )
//       .sort({ createdAt: -1 })
//       .lean();

//     const branchNames = await getBranchNames(docs.map((d) => (d as any).branch));
//     const clientBranchName = await getBranchName((client as any).createdBranch);

//     return NextResponse.json({
//       documents: docs.map((d) =>
//         normalizeDoc(d as any, branchNames.get(normalizeBranch((d as any).branch)))
//       ),
//       client: {
//         id: (client._id ?? "").toString(),
//         clientCode: (client as any).clientCodeRaw ?? (client as any).clientCode,
//         clientName: (client as any).clientName,
//         branchName: clientBranchName,
//         createdAt: (client as any).createdAt,
//       },
//     });
//   } catch (error) {
//     console.error("Select client docs failed:", error);
//     return NextResponse.json(
//       { message: "حدث خطأ أثناء جلب مستندات العميل" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(
//   request: Request,
//   context: { params: Promise<{ clientCode: string }> }
// ) {
//   const user = await getAuthUserFromCookies();
//   if (!user) {
//     return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
//   }

//   const params = await context.params;
//   const rawCode = (params.clientCode ?? "").trim();
//   if (!rawCode) {
//     return NextResponse.json({ message: "حقل clientCode غير صالح" }, { status: 400 });
//   }

//   const body = (await request.json()) as InsertBody;
//   const { clientName, docDate, replaceExisting, docId } = body;
//   const cleanedDocName = correctDocName(body.docName ?? "");
//   const normalizedDocName = normalizeDocName(cleanedDocName);
//   const branch = normalizeBranch(getUserBranch(user));
//   const branchName = await getBranchName(branch);
//   const canEditAll = canAccessAll(user);

//   await connectMongo();
//   const client = await ClientModel.findOne({
//     $or: [{ clientCode: rawCode }, { clientCodeRaw: rawCode }],
//   }).lean();
//   if (!client) {
//     return NextResponse.json({ message: "العميل غير موجود" }, { status: 404 });
//   }
//   const clientBranch = normalizeBranch((client as any).createdBranch);
//   if (!canEditAll && clientBranch !== branch) {
//     return NextResponse.json(
//       { message: "غير مصرح لك بتعديل مستندات عميل في فرع آخر" },
//       { status: 403 }
//     );
//   }

//   const fileUrl =
//     body.fileUrl ||
//     body.filePath ||
//     body.archivePath ||
//     body.url ||
//     body.path ||
//     body.archive?.archivePath ||
//     body.archive?.path ||
//     body.archive?.url ||
//     body.files?.[0]?.path ||
//     body.files?.[0]?.url ||
//     body.files?.[0]?.filePath;

//   if (!normalizedDocName || !fileUrl) {
//     return NextResponse.json(
//       { message: "يجب إرسال اسم المستند ورابط الملف" },
//       { status: 400 }
//     );
//   }

//   try {
//     const now = new Date();
//     const trimmedClientName = clientName?.trim() ?? "";
//     const docDateValue = docDate ? new Date(docDate) : null;

//     // تحديث مستند محدد عند توافر docId
//     if (replaceExisting && docId) {
//       if (!canEditAll) {
//         const existing = await ClientDocumentModel.findOne({
//           _id: docId,
//           branch,
//         }).lean();
//         if (!existing) {
//           return NextResponse.json(
//             { message: "غير مصرح لك بتعديل هذا المستند" },
//             { status: 403 }
//           );
//         }
//       }

//       const updatedDoc = (await ClientDocumentModel.findByIdAndUpdate(
//         docId,
//         {
//           $set: {
//             clientName: trimmedClientName,
//             docName: cleanedDocName,
//             normalizedDocName,
//             docDate: docDateValue,
//             fileUrl,
//             uploadedBy: user.empId,
//             branch,
//             branchName,
//             updatedAt: now,
//             clientCode: rawCode,
//             clientCodeRaw: rawCode,
//           },
//           $setOnInsert: { createdAt: now },
//         },
//         { new: true }
//       ).lean()) as StoredDoc | null;

//       return NextResponse.json({ document: updatedDoc ? normalizeDoc(updatedDoc) : null });
//     }

//     // حساب لاحقة رقمية تلقائياً إذا وُجدت مستندات بنفس الاسم
//     let finalDocName = cleanedDocName;
//     let finalNormalized = normalizedDocName;
//     const baseNorm = normalizedDocName;
//     const escaped = baseNorm.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
//     const regex = new RegExp(`^${escaped}(?:[\\s-](\\d+))?$`, "i");
//     const existingDocs = await ClientDocumentModel.find(
//       canEditAll
//         ? { clientCode: rawCode, normalizedDocName: { $regex: regex } }
//         : { clientCode: rawCode, branch, normalizedDocName: { $regex: regex } }
//     )
//       .select("normalizedDocName")
//       .lean();

//     let suffix = 0;
//     existingDocs.forEach((d) => {
//       const norm = (d as any).normalizedDocName as string;
//       if (!norm) return;
//       const match = norm.match(/[\s-](\d+)$/);
//       if (match) {
//         const num = Number(match[1]);
//         if (!Number.isNaN(num)) suffix = Math.max(suffix, num);
//       } else {
//         suffix = Math.max(suffix, 1);
//       }
//     });

//     if (suffix > 0) {
//       const next = suffix + 1;
//       finalDocName = `${cleanedDocName} ${next}`;
//       finalNormalized = `${baseNorm} ${next}`;
//     }

//     const doc = await ClientDocumentModel.create({
//       clientCode: rawCode,
//       clientCodeRaw: rawCode,
//       clientName: trimmedClientName,
//       docName: finalDocName,
//       normalizedDocName: finalNormalized,
//       docDate: docDateValue,
//       fileUrl,
//       uploadedBy: user.empId,
//       branch,
//       branchName,
//       createdAt: now,
//     });

//     return NextResponse.json({
//       document: normalizeDoc(doc.toObject() as StoredDoc),
//     });
//   } catch (error) {
//     console.error("Insert client doc failed:", error);
//     return NextResponse.json(
//       { message: "حدث خطأ أثناء حفظ المستند" },
//       { status: 500 }
//     );
//   }
// }



import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { ClientDocCounterModel } from "@/models/ClientDocCounter";
import { ClientModel } from "@/models/Client";
import { correctDocName, normalizeDocName } from "@/lib/documents";
import { getUserBranch, normalizeBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { getBranchNames, getBranchName } from "@/lib/branches";
import { recordAuditLog } from "@/lib/audit-log";

type InsertBody = {
  clientName?: string;
  docName?: string;
  docDate?: string | null;
  docId?: string | number;
  fileUrl?: string;
  filePath?: string;
  archivePath?: string;
  url?: string;
  path?: string;
  files?: Array<{ path?: string; url?: string; filePath?: string }>;
  archive?: { archivePath?: string; path?: string; url?: string };
  replaceExisting?: boolean;
};

type StoredDoc = {
  _id?: unknown;
  docName: string;
  docDate?: Date | null;
  fileUrl?: string;
  filePath?: string;
  uploadedBy?: string | number;
  branch?: string;
  createdAt?: Date;
  clientName?: string;
  clientCode: string;
  clientCodeRaw?: string;
};

const normalizeDoc = (doc: StoredDoc, branchName?: string) => {
  const cleanedName = correctDocName(doc.docName);
  return {
    DocId: (doc._id ?? "").toString(),
    DocName: cleanedName,
    DocDate: doc.docDate ?? null,
    FilePath: doc.fileUrl ?? doc.filePath,
    UploadedBy: doc.uploadedBy,
    Branch: doc.branch,
    BranchName: branchName,
    CreatedAt: doc.createdAt,
    ClientName: doc.clientName,
    ClientCode: doc.clientCodeRaw ?? doc.clientCode,
  };
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientCode: string }> }
) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
  }

  const params = await context.params;
  const rawCode = (params.clientCode ?? "").trim();
  if (!rawCode) return NextResponse.json({ documents: [] });

  try {
    await connectMongo();
    const userBranch = normalizeBranch(getUserBranch(user));
    const canViewAll = canAccessAllBranches(user);

    const client = await ClientModel.findOne({
      $or: [{ clientCode: rawCode }, { clientCodeRaw: rawCode }],
    }).lean();
    if (!client) {
      return NextResponse.json({ documents: [] });
    }
    const clientBranch = normalizeBranch((client as any).createdBranch);
    if (!canViewAll && clientBranch && clientBranch !== userBranch) {
      return NextResponse.json({
        documents: [],
        unauthorized: true,
        denyReason: "العميل مسجّل بفرع آخر ولا تملك صلاحية الاطلاع على مستنداته.",
      });
    }

    const docs = await ClientDocumentModel.find(
      canViewAll
        ? { clientCode: (client as any).clientCode }
        : { clientCode: (client as any).clientCode, branch: userBranch }
    )
      .sort({ createdAt: -1 })
      .lean();

    const branchNames = await getBranchNames(docs.map((d) => (d as any).branch));
    const clientBranchName = await getBranchName((client as any).createdBranch);

    return NextResponse.json({
      documents: docs.map((d) =>
        normalizeDoc(d as any, branchNames.get(normalizeBranch((d as any).branch)))
      ),
      client: {
        id: (client._id ?? "").toString(),
        clientCode: (client as any).clientCodeRaw ?? (client as any).clientCode,
        clientName: (client as any).clientName,
        branchName: clientBranchName,
        createdAt: (client as any).createdAt,
      },
    });
  } catch (error) {
    console.error("Select client docs failed:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء جلب مستندات العميل." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientCode: string }> }
) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    await recordAuditLog({
      action: "document.save",
      status: "failure",
      message: "الرجاء تسجيل الدخول",
      reason: "unauthorized",
      request,
    });
    return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
  }

  const params = await context.params;
  const rawCode = (params.clientCode ?? "").trim();
  if (!rawCode) {
    await recordAuditLog({
      action: "document.save",
      status: "failure",
      message: "حقل clientCode مفقود",
      reason: "missing_client_code",
      user,
      request,
    });
    return NextResponse.json({ message: "حقل clientCode مفقود" }, { status: 400 });
  }

  const body = (await request.json()) as InsertBody;
  const { clientName, docDate, replaceExisting, docId } = body;
  const cleanedDocName = correctDocName(body.docName ?? "");
  const normalizedDocName = normalizeDocName(cleanedDocName);
  const userBranch = normalizeBranch(getUserBranch(user));
  const canEditAll = canAccessAllBranches(user);

  await connectMongo();
  const client = await ClientModel.findOne({
    $or: [{ clientCode: rawCode }, { clientCodeRaw: rawCode }],
  }).lean();
  if (!client) {
    await recordAuditLog({
      action: "document.save",
      status: "failure",
      message: "العميل غير موجود.",
      reason: "client_not_found",
      user,
      request,
      clientCode: rawCode,
    });
    return NextResponse.json({ message: "العميل غير موجود." }, { status: 404 });
  }

  const clientBranch = normalizeBranch((client as any).createdBranch);
  const branchForDoc = clientBranch || userBranch;
  const branchName = await getBranchName(branchForDoc);

  if (!canEditAll && clientBranch && clientBranch !== userBranch) {
    await recordAuditLog({
      action: "document.save",
      status: "failure",
      message: "غير مصرح بتعديل مستندات عميل في فرع آخر.",
      reason: "forbidden",
      user,
      request,
      clientCode: rawCode,
    });
    return NextResponse.json(
      { message: "غير مصرح بتعديل مستندات عميل في فرع آخر." },
      { status: 403 }
    );
  }

  const fileUrl =
    body.fileUrl ||
    body.filePath ||
    body.archivePath ||
    body.url ||
    body.path ||
    body.archive?.archivePath ||
    body.archive?.path ||
    body.archive?.url ||
    body.files?.[0]?.path ||
    body.files?.[0]?.url ||
    body.files?.[0]?.filePath;

  if (!normalizedDocName || !fileUrl) {
    await recordAuditLog({
      action: "document.save",
      status: "failure",
      message: "يجب إرسال اسم المستند ورابط الملف.",
      reason: "missing_fields",
      user,
      request,
      clientCode: rawCode,
      details: { docName: cleanedDocName, fileUrl: Boolean(fileUrl) },
    });
    return NextResponse.json(
      { message: "يجب إرسال اسم المستند ورابط الملف." },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const trimmedClientName = clientName?.trim() ?? "";
    const docDateValue = docDate ? new Date(docDate) : null;

    if (trimmedClientName && trimmedClientName !== (client as any).clientName) {
      await ClientModel.updateOne({ _id: (client as any)._id }, { $set: { clientName: trimmedClientName } });
    }

    // تعديل مستند موجود
    if (replaceExisting && docId) {
      if (!canEditAll) {
        const existing = await ClientDocumentModel.findOne({
          _id: docId,
          branch: branchForDoc,
        }).lean();
        if (!existing) {
          await recordAuditLog({
            action: "document.update",
            status: "failure",
            message: "غير مصرح بتعديل هذا المستند.",
            reason: "forbidden",
            user,
            request,
            clientCode: rawCode,
            docId,
          });
          return NextResponse.json(
            { message: "غير مصرح بتعديل هذا المستند." },
            { status: 403 }
          );
        }
      }

      const updatedDoc = (await ClientDocumentModel.findByIdAndUpdate(
        docId,
        {
          $set: {
            clientName: trimmedClientName,
            docName: cleanedDocName,
            normalizedDocName,
            docDate: docDateValue,
            fileUrl,
            uploadedBy: user.empId,
            branch: branchForDoc,
            branchName,
            updatedAt: now,
            clientCode: rawCode,
            clientCodeRaw: rawCode,
          },
          $setOnInsert: { createdAt: now },
        },
        { new: true }
      ).lean()) as StoredDoc | null;

      await recordAuditLog({
        action: "document.update",
        status: "success",
        message: "تم تحديث المستند.",
        user,
        request,
        clientCode: rawCode,
        docId,
        details: {
          docName: cleanedDocName,
          fileUrl: Boolean(fileUrl),
        },
      });

      return NextResponse.json({ document: updatedDoc ? normalizeDoc(updatedDoc) : null });
    }

    // إضافة مستند جديد مع لاحقة رقمية عند التكرار
    let finalDocName = cleanedDocName;
    let finalNormalized = normalizedDocName;
    const baseNorm = normalizedDocName;
    const escaped = baseNorm.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`^${escaped}(?:[\\s-](\\d+))?$`, "i");
    const existingDocs = await ClientDocumentModel.find(
      canEditAll
        ? { clientCode: rawCode, normalizedDocName: { $regex: regex } }
        : { clientCode: rawCode, branch: branchForDoc, normalizedDocName: { $regex: regex } }
    )
      .select("normalizedDocName")
      .lean();

    let currentMax = 0;
    existingDocs.forEach((d) => {
      const norm = (d as any).normalizedDocName as string;
      if (!norm) return;
      const match = norm.match(/[\\s-](\\d+)$/);
      if (match) {
        const num = Number(match[1]);
        if (!Number.isNaN(num)) currentMax = Math.max(currentMax, num);
      } else {
        currentMax = Math.max(currentMax, 1);
      }
    });

    const branchKey = branchForDoc || "";
    const counterDoc = await ClientDocCounterModel.findOneAndUpdate(
      { clientCode: rawCode, baseNormalized: baseNorm, branch: branchKey },
      [
        {
          $set: {
            clientCode: { $ifNull: ["$clientCode", rawCode] },
            baseNormalized: { $ifNull: ["$baseNormalized", baseNorm] },
            branch: { $ifNull: ["$branch", branchKey] },
            counter: {
              $add: [
                { $max: [{ $ifNull: ["$counter", 0] }, currentMax] },
                1,
              ],
            },
          },
        },
      ],
      { new: true, upsert: true, updatePipeline: true }
    ).lean();

    const nextNumber = counterDoc?.counter ?? currentMax + 1;
    if (nextNumber > 1) {
      finalDocName = `${cleanedDocName} ${nextNumber}`;
      finalNormalized = `${baseNorm} ${nextNumber}`;
    }

    const doc = await ClientDocumentModel.create({
      clientCode: rawCode,
      clientCodeRaw: rawCode,
      clientName: trimmedClientName,
      docName: finalDocName,
      normalizedDocName: finalNormalized,
      docDate: docDateValue,
      fileUrl,
      uploadedBy: user.empId,
      branch: branchForDoc,
      branchName,
      createdAt: now,
    });

    await recordAuditLog({
      action: "document.create",
      status: "success",
      message: "تم حفظ المستند.",
      user,
      request,
      clientCode: rawCode,
      docId: (doc as any)._id?.toString?.() ?? undefined,
      details: {
        docName: finalDocName,
        fileUrl: Boolean(fileUrl),
        branch: branchForDoc,
      },
    });

    return NextResponse.json({
      document: normalizeDoc(doc.toObject() as StoredDoc),
    });
  } catch (error) {
    console.error("Insert client doc failed:", error);
    await recordAuditLog({
      action: "document.save",
      status: "failure",
      message: "تعذر حفظ المستند في قاعدة البيانات.",
      reason: error instanceof Error ? error.message : "server_error",
      user,
      request,
      clientCode: rawCode,
      docId,
      details: {
        docName: cleanedDocName,
      },
    });
    return NextResponse.json(
      { message: "تعذر حفظ المستند في قاعدة البيانات." },
      { status: 500 }
    );
  }
}
