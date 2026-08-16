import { AuthUser } from "@/lib/auth";

// صلاحيات صفحة إضافة مستندات العملاء
const UPLOAD_ALLOWED_JOB_CODE = 86;
const UPLOAD_ALLOWED_EMP_IDS = new Set(["3425", "403","3402","3206","3193","2398","671","2443","3466","2063","2943","2059","2958","3195","2927","2404","778","64","2615","2781","3227"]);

export const canAccessUploadPage = (user: AuthUser | null | undefined) => {
  if (!user) return false;
  const emp = String(user.empId ?? "").trim();
  const job = Number(user.jobCode ?? "");
  // السماح إذا كان كود الوظيفة 86 أو كان الـ empId ضمن القائمة المصرح بها
  return job === UPLOAD_ALLOWED_JOB_CODE || UPLOAD_ALLOWED_EMP_IDS.has(emp);
};
