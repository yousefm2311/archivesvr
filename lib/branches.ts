import { getSqlPool, sql } from "./sql";

const branchCache = new Map<string, string>();

export const normalizeBranchCode = (code: unknown) => String(code ?? "").trim();

export async function getBranchName(branchCode: unknown): Promise<string> {
  const code = normalizeBranchCode(branchCode);
  if (!code) return "";

  if (branchCache.has(code)) {
    return branchCache.get(code) as string;
  }

  try {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("code", sql.VarChar, code)
      .query(
        "SELECT TOP 1 BranchDesc FROM [Attendance].[Code].[Branch] WHERE BranchCode = @code"
      );

    const name: string = result.recordset?.[0]?.BranchDesc || "";
    const safeName = name?.trim() || "";
    if (safeName) {
      branchCache.set(code, safeName);
    }
    return safeName;
  } catch (err) {
    console.error("Failed to fetch branch name:", err);
    return "";
  }
}

export async function getBranchNames(codes: Array<string | number | undefined>) {
  const uniqueCodes = Array.from(
    new Set(
      codes
        .map((c) => normalizeBranchCode(c))
        .filter((c) => c.length > 0)
    )
  );

  const result = new Map<string, string>();
  for (const code of uniqueCodes) {
    const name = await getBranchName(code);
    if (name) {
      result.set(code, name);
    }
  }
  return result;
}

export type BranchOption = { code: string; name: string };

export async function getAllBranches(): Promise<BranchOption[]> {
  try {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .query(
        "SELECT BranchCode, BranchDesc FROM [Attendance].[Code].[Branch] ORDER BY BranchDesc"
      );
    return (result.recordset || [])
      .map((r: any): BranchOption => ({
        code: normalizeBranchCode(r.BranchCode),
        name: (r.BranchDesc ?? "").trim(),
      }))
      .filter((b: BranchOption) => b.code && b.name);
  } catch (err) {
    console.error("Failed to fetch branches:", err);
    return [];
  }
}
