// // import { NextResponse } from "next/server";
// // import { getAuthUserFromCookies } from "@/lib/auth";
// // import { connectMongo } from "@/lib/mongo";
// // import { ClientModel } from "@/models/Client";
// // import { canAccessAll, getUserBranch } from "@/lib/permissions";
// // import { getBranchName } from "@/lib/branches";

// // type CreateBody = {
// //   clientCode?: number | string;
// //   clientName?: string;
// // };

// // export async function GET(request: Request) {
// //   const user = await getAuthUserFromCookies();
// //   if (!user) {
// //     return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
// //   }

// //   const userBranch = getUserBranch(user);
// //   const canViewAll = canAccessAll(user);

// //   const { searchParams } = new URL(request.url);
// //   const q = searchParams.get("q") ?? "";
// //   const codeParam = searchParams.get("code");
// //   const code = codeParam ? Number(codeParam) : null;

// //   if (codeParam && (code === null || Number.isNaN(code))) {
// //     return NextResponse.json({ message: "clientCode غير صحيح" }, { status: 400 });
// //   }

// //   try {
// //     await connectMongo();
// //     if (code !== null) {
// //       const client = await ClientModel.findOne({ clientCode: code }).lean();
// //       if (!client) {
// //         return NextResponse.json({ client: null });
// //       }
// //       const branchName = await getBranchName((client as any).createdBranch);
// //       if (!canViewAll && client.createdBranch && client.createdBranch !== userBranch) {
// //         return NextResponse.json({
// //           client: {
// //             id: (client._id ?? "").toString(),
// //             clientCode: client.clientCode,
// //             clientName: client.clientName,
// //             branchName,
// //             createdAt: client.createdAt,
// //           },
// //           unauthorized: true,
// //           denyReason: "غير مسموح بعرض بيانات هذا العميل لأنه مسجل على فرع آخر.",
// //         });
// //       }
// //       return NextResponse.json({
// //         client: {
// //           id: (client._id ?? "").toString(),
// //           clientCode: client.clientCode,
// //           clientName: client.clientName,
// //           branchName,
// //           createdAt: client.createdAt,
// //         },
// //       });
// //     }

// //     const filter: Record<string, unknown> = q ? { clientName: { $regex: q, $options: "i" } } : {};
// //     if (!canViewAll) {
// //       filter.createdBranch = userBranch;
// //     }

// //     const clients = await ClientModel.find(filter)
// //       .sort({ clientCode: 1 })
// //       .limit(50)
// //       .lean();

// //     const clientsWithBranch = await Promise.all(
// //       clients.map(async (c) => ({
// //         id: (c._id ?? "").toString(),
// //         clientCode: c.clientCode,
// //         clientName: c.clientName,
// //         branchName: await getBranchName((c as any).createdBranch),
// //         createdAt: c.createdAt,
// //       }))
// //     );

// //     return NextResponse.json({
// //       clients: clientsWithBranch,
// //     });
// //   } catch (error) {
// //     console.error("List clients failed:", error);
// //     return NextResponse.json(
// //       { message: "تعذر جلب بيانات العملاء" },
// //       { status: 500 }
// //     );
// //   }
// // }

// // export async function POST(request: Request) {
// //   const user = await getAuthUserFromCookies();
// //   if (!user) {
// //     return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
// //   }

// //   const body = (await request.json()) as CreateBody;
// //   const clientCode = Number(body.clientCode);
// //   const clientName = body.clientName?.trim();
// //   const branch = getUserBranch(user);

// //   if (!clientCode || Number.isNaN(clientCode) || !clientName) {
// //     return NextResponse.json(
// //       { message: "الرجاء إدخال كود واسم العميل" },
// //       { status: 400 }
// //     );
// //   }

// //   try {
// //     await connectMongo();
// //     const existing = await ClientModel.findOne({ clientCode }).lean();
// //     if (existing) {
// //       return NextResponse.json(
// //         { message: "العميل مسجل بالفعل" },
// //         { status: 409 }
// //       );
// //     }

// //     const branchName = await getBranchName(branch);
// //     const doc = await ClientModel.create({
// //       clientCode,
// //       clientName,
// //       createdBy: user.empId,
// //       createdBranch: branch,
// //       createdBranchName: branchName,
// //     });

// //     return NextResponse.json({
// //       client: {
// //         id: doc._id.toString(),
// //         clientCode: doc.clientCode,
// //         clientName: doc.clientName,
// //         branchName,
// //         createdAt: doc.createdAt,
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Create client failed:", error);
// //     return NextResponse.json(
// //       { message: "تعذر إنشاء العميل" },
// //       { status: 500 }
// //     );
// //   }
// // }






// import { NextResponse } from "next/server";
// import { getAuthUserFromCookies } from "@/lib/auth";
// import { connectMongo } from "@/lib/mongo";
// import { ClientModel } from "@/models/Client";
// import { canAccessAll, getUserBranch } from "@/lib/permissions";
// import { getBranchName } from "@/lib/branches";

// /* ===========================
//    Types
// =========================== */

// type CreateBody = {
//   clientCode?: string;
//   clientName?: string;
// };

// /* ===========================
//    GET: جلب عميل أو قائمة عملاء
// =========================== */

// export async function GET(request: Request) {
//   const user = await getAuthUserFromCookies();
//   if (!user) {
//     return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
//   }

//   const userBranch = getUserBranch(user);
//   const canViewAll = canAccessAll(user);

//   const { searchParams } = new URL(request.url);
//   const q = searchParams.get("q")?.trim() ?? "";
//   const code = searchParams.get("code")?.trim() ?? "";

//   try {
//     await connectMongo();

//     /* ===== البحث بكود العميل ===== */
//     if (code) {
//       const client = await ClientModel.findOne({
//         $or: [{ clientCode: code }, { clientCodeRaw: code }],
//       }).lean();

//       if (!client) {
//         return NextResponse.json({ client: null });
//       }

//       const branchName = await getBranchName(
//         (client as any).createdBranch
//       );

//       if (
//         !canViewAll &&
//         client.createdBranch &&
//         client.createdBranch !== userBranch
//       ) {
//         return NextResponse.json({
//           client: {
//             id: (client._id ?? "").toString(),
//             clientCode: client.clientCode,
//             clientName: client.clientName,
//             branchName,
//             createdAt: client.createdAt,
//           },
//           unauthorized: true,
//           denyReason:
//             "غير مسموح بعرض بيانات هذا العميل لأنه مسجل على فرع آخر.",
//         });
//       }

//       return NextResponse.json({
//         client: {
//           id: (client._id ?? "").toString(),
//           clientCode: client.clientCode,
//           clientName: client.clientName,
//           branchName,
//           createdAt: client.createdAt,
//         },
//       });
//     }

//     /* ===== البحث بالاسم ===== */
//     const filter: Record<string, unknown> = {};

//     if (q) {
//       filter.clientName = { $regex: q, $options: "i" };
//     }

//     if (!canViewAll) {
//       filter.createdBranch = userBranch;
//     }

//     const clients = await ClientModel.find(filter)
//       .sort({ clientCode: 1 })
//       .limit(50)
//       .lean();

//     const clientsWithBranch = await Promise.all(
//       clients.map(async (c) => ({
//         id: (c._id ?? "").toString(),
//         clientCode: c.clientCode,
//         clientName: c.clientName,
//         branchName: await getBranchName((c as any).createdBranch),
//         createdAt: c.createdAt,
//       }))
//     );

//     return NextResponse.json({ clients: clientsWithBranch });
//   } catch (error) {
//     console.error("List clients failed:", error);
//     return NextResponse.json(
//       { message: "تعذر جلب بيانات العملاء" },
//       { status: 500 }
//     );
//   }
// }

// /* ===========================
//    POST: إنشاء عميل جديد
// =========================== */

// export async function POST(request: Request) {
//   const user = await getAuthUserFromCookies();
//   if (!user) {
//     return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
//   }

//   const body = (await request.json()) as CreateBody;

//   const clientCode = body.clientCode?.trim();
//   const clientName = body.clientName?.trim();
//   const branch = getUserBranch(user);

//   if (!clientCode || !clientName) {
//     return NextResponse.json(
//       { message: "الرجاء إدخال كود واسم العميل" },
//       { status: 400 }
//     );
//   }

//   try {
//     await connectMongo();

//     const existing = await ClientModel.findOne({ clientCode }).lean();
//     if (existing) {
//       return NextResponse.json(
//         { message: "العميل مسجل بالفعل" },
//         { status: 409 }
//       );
//     }

//     const branchName = await getBranchName(branch);

//     const doc = await ClientModel.create({
//       clientCode,
//       clientName,
//       createdBy: user.empId,
//       createdBranch: branch,
//       createdBranchName: branchName,
//     });

//     return NextResponse.json({
//       client: {
//         id: doc._id.toString(),
//         clientCode: doc.clientCode,
//         clientName: doc.clientName,
//         branchName,
//         createdAt: doc.createdAt,
//       },
//     });
//   } catch (error) {
//     console.error("Create client failed:", error);
//     return NextResponse.json(
//       { message: "تعذر إنشاء العميل" },
//       { status: 500 }
//     );
//   }
// }



import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientModel } from "@/models/Client";
import { getUserBranch } from "@/lib/permissions";
import { getBranchName } from "@/lib/branches";
import { canAccessAllBranches, canCreateClient } from "@/lib/permissions-special";
import { recordAuditLog } from "@/lib/audit-log";

type CreateBody = {
  clientCode?: string;
  clientName?: string;
  branch?: string;
};

/* ===========================
   GET: استعلام عميل/عملاء
=========================== */

export async function GET(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "يرجى تسجيل الدخول." }, { status: 401 });
  }

  const userBranch = getUserBranch(user);
  const canViewAll = canAccessAllBranches(user);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const code = searchParams.get("code")?.trim() ?? "";

  try {
    await connectMongo();

    // استعلام عميل واحد
    if (code) {
      const client = await ClientModel.findOne({
        $or: [{ clientCode: code }, { clientCodeRaw: code }],
      }).lean();

      if (!client) {
        return NextResponse.json({ client: null });
      }

      const branchName = await getBranchName((client as any).createdBranch);

      if (
        !canViewAll &&
        client.createdBranch &&
        client.createdBranch !== userBranch
      ) {
        return NextResponse.json({
          client: {
            id: (client._id ?? "").toString(),
            clientCode: client.clientCode,
            clientName: client.clientName,
            branchName,
            createdBranch: (client as any).createdBranch,
            createdAt: client.createdAt,
          },
          unauthorized: true,
          denyReason: "العميل مسجّل في فرع آخر ولا تملك صلاحية التعديل.",
        });
      }

      return NextResponse.json({
        client: {
          id: (client._id ?? "").toString(),
          clientCode: client.clientCode,
          clientName: client.clientName,
          branchName,
          createdBranch: (client as any).createdBranch,
          createdAt: client.createdAt,
        },
      });
    }

    // استعلام قائمة عملاء
    const filter: Record<string, unknown> = {};

    if (q) {
      filter.clientName = { $regex: q, $options: "i" };
    }

    if (!canViewAll) {
      filter.createdBranch = userBranch;
    }

    const clients = await ClientModel.find(filter)
      .sort({ clientCode: 1 })
      .limit(50)
      .lean();

    const clientsWithBranch = await Promise.all(
      clients.map(async (c) => ({
        id: (c._id ?? "").toString(),
        clientCode: c.clientCode,
        clientName: c.clientName,
        branchName: await getBranchName((c as any).createdBranch),
        createdBranch: (c as any).createdBranch,
        createdAt: c.createdAt,
      }))
    );

    return NextResponse.json({ clients: clientsWithBranch });
  } catch (error) {
    console.error("List clients failed:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء جلب بيانات العملاء." },
      { status: 500 }
    );
  }
}

/* ===========================
   POST: إنشاء عميل جديد
=========================== */

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    await recordAuditLog({
      action: "client.create",
      status: "failure",
      message: "يرجى تسجيل الدخول.",
      reason: "unauthorized",
      request,
    });
    return NextResponse.json({ message: "يرجى تسجيل الدخول." }, { status: 401 });
  }

  if (!canCreateClient(user)) {
    await recordAuditLog({
      action: "client.create",
      status: "failure",
      message: "لا تملك صلاحية إضافة العميل.",
      reason: "forbidden",
      user,
      request,
    });
    return NextResponse.json({ message: "لا تملك صلاحية إضافة العميل." }, { status: 403 });
  }

  const body = (await request.json()) as CreateBody;

  const clientCode = body.clientCode?.trim();
  const clientName = body.clientName?.trim();
  const userBranch = getUserBranch(user);
  const branch =
    canAccessAllBranches(user) && body.branch?.trim()
      ? body.branch.trim()
      : userBranch;

  if (!clientCode || !clientName) {
    await recordAuditLog({
      action: "client.create",
      status: "failure",
      message: "كود واسم العميل مطلوبان.",
      reason: "missing_fields",
      user,
      request,
      details: { clientCode, clientName },
    });
    return NextResponse.json(
      { message: "كود واسم العميل مطلوبان." },
      { status: 400 }
    );
  }

  try {
    await connectMongo();

    const existing = await ClientModel.findOne({
      $or: [{ clientCode }, { clientCodeRaw: clientCode }],
    }).lean();
    if (existing) {
      await recordAuditLog({
        action: "client.create",
        status: "failure",
        message: "العميل موجود بالفعل.",
        reason: "duplicate",
        user,
        request,
        clientCode,
      });
      return NextResponse.json(
        { message: "العميل موجود بالفعل." },
        { status: 409 }
      );
    }

    const branchName = await getBranchName(branch);

    const doc = await ClientModel.create({
      clientCode,
      clientCodeRaw: clientCode,
      clientName,
      createdBy: user.empId,
      createdBranch: branch,
      createdBranchName: branchName,
    });

    await recordAuditLog({
      action: "client.create",
      status: "success",
      message: "تم إنشاء العميل.",
      user,
      request,
      clientCode,
      details: {
        clientName,
        branch,
        branchName,
      },
    });

    return NextResponse.json({
      client: {
        id: doc._id.toString(),
        clientCode: doc.clientCode,
        clientName: doc.clientName,
        branchName,
        createdBranch: branch,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    console.error("Create client failed:", error);
    await recordAuditLog({
      action: "client.create",
      status: "failure",
      message: "تعذر إنشاء العميل.",
      reason: error instanceof Error ? error.message : "server_error",
      user,
      request,
      clientCode,
      details: { clientName, branch },
    });
    return NextResponse.json(
      { message: "تعذر إنشاء العميل." },
      { status: 500 }
    );
  }
}
