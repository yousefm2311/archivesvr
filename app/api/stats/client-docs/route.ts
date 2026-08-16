import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { ClientDocumentModel } from "@/models/ClientDocument";
import { ClientModel } from "@/models/Client";

export async function GET() {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
  }

  try {
    await connectMongo();
    const [perClient, perUser, totalDocs, totalClients] = await Promise.all([
      ClientDocumentModel.aggregate([
        { $group: { _id: "$clientCode", documents: { $sum: 1 } } },
        { $sort: { documents: -1 } },
      ]),
      ClientDocumentModel.aggregate([
        { $group: { _id: "$uploadedBy", documents: { $sum: 1 } } },
        { $sort: { documents: -1 } },
      ]),
      ClientDocumentModel.countDocuments(),
      ClientModel.countDocuments(),
    ]);

    return NextResponse.json({
      stats: {
        totals: { totalDocuments: totalDocs, totalClients },
        perClient,
        perUser,
      },
    });
  } catch (error) {
    console.error("GetClientDocsStats failed:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء تحميل إحصائيات المستندات" },
      { status: 500 }
    );
  }
}
