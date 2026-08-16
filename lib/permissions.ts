
import { AuthUser } from "@/lib/auth";
const SUPER_BRANCH = "";

const SUPER_EMP_IDS: string[] = (process.env.SUPER_EMP_IDS ?? "403,3425")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const normalizeBranch = (branch: unknown): string =>
  String(branch ?? "").trim();

export const canAccessAll = (user: AuthUser | null | undefined): boolean => {
  if (!user) return false;

  const empId = String(user.empId ?? "").trim();
  const branch = normalizeBranch(user.branch);

  return (
    (SUPER_BRANCH && branch === SUPER_BRANCH) ||
    SUPER_EMP_IDS.includes(empId)
  );
};

export const getUserBranch = (
  user: AuthUser | null | undefined
): string =>
  normalizeBranch(user?.branch);

export const enforceBranchFilter = <T extends Record<string, unknown>>(
  user: AuthUser | null | undefined,
  filter: T
): T & { createdBranch?: string } => {
  if (canAccessAll(user)) return filter;

  return {
    ...filter,
    createdBranch: getUserBranch(user),
  };
};
