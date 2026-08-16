import { AuthUser } from "@/lib/auth";
import { canAccessUploadPage } from "@/lib/access";
import { canAccessAll } from "@/lib/permissions";

const SPECIAL_EMP_IDS = new Set(["6", ""]);

export const isSpecialAdmin = (user: AuthUser | null | undefined) => {
  if (!user) return false;
  const empId = String(user.empId ?? "").trim();
  return SPECIAL_EMP_IDS.has(empId);
};

export const canAccessAllBranches = (user: AuthUser | null | undefined) =>
  canAccessAll(user) || isSpecialAdmin(user);

export const canCreateClient = (user: AuthUser | null | undefined) =>
  canAccessUploadPage(user) && !isSpecialAdmin(user);
