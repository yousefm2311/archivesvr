import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { getUserBranch, normalizeBranch } from "@/lib/permissions";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { ClientDocumentModel } from "@/models/ClientDocument";

type PerClientRow = {
  _id: string;
  documents: number;
  clientName?: string;
  branchName?: string;
  branchCode?: string;
};
type PerClientFacet = { page: PerClientRow[]; total: { count: number }[] };

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDateValue = (value: string, endOfDay: boolean) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

export async function GET(request: Request) {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const pageSize = 10;
  const { searchParams } = new URL(request.url);
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const skip = (page - 1) * pageSize;
  const branchParam = normalizeBranch(searchParams.get("branch") ?? "");
  const clientCode = (searchParams.get("clientCode") ?? "").trim();
  const clientName = (searchParams.get("clientName") ?? "").trim();
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const userBranch = normalizeBranch(getUserBranch(user));
  const isAdmin = canAccessAllBranches(user);
  const selectedBranch = isAdmin ? branchParam : userBranch;

  const docMatch: Record<string, unknown> = isAdmin
    ? selectedBranch
      ? { branch: selectedBranch }
      : {}
    : { branch: userBranch };

  if (clientCode) {
    docMatch.clientCode = { $regex: escapeRegex(clientCode), $options: "i" };
  }

  if (clientName) {
    docMatch.clientName = { $regex: escapeRegex(clientName), $options: "i" };
  }

  const fromDate = parseDateValue(dateFrom, false);
  const toDate = parseDateValue(dateTo, true);
  if (fromDate || toDate) {
    const range: Record<string, Date> = {};
    if (fromDate) range.$gte = fromDate;
    if (toDate) range.$lte = toDate;
    docMatch.docDate = range;
  }

  try {
    await connectMongo();

    const perClientFacet = await ClientDocumentModel.aggregate<PerClientFacet>([
      { $match: docMatch },
      { $group: { _id: "$clientCode", documents: { $sum: 1 } } },
      { $sort: { documents: -1 } },
      {
        $facet: {
          page: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $lookup: {
                from: "clients",
                localField: "_id",
                foreignField: "clientCode",
                as: "client",
              },
            },
            { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                documents: 1,
                clientName: "$client.clientName",
                branchName: "$client.createdBranchName",
                branchCode: "$client.createdBranch",
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const items = perClientFacet[0]?.page ?? [];
    const total = perClientFacet[0]?.total?.[0]?.count ?? 0;

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error("Load client docs per-client page failed:", error);
    return NextResponse.json({ message: "Failed to load data." }, { status: 500 });
  }
}
