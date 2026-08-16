import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { canAccessAllBranches } from "@/lib/permissions-special";
import { getAllBranches } from "@/lib/branches";

export async function GET() {
  const user = await getAuthUserFromCookies();
  if (!user) {
    return NextResponse.json({ message: "الرجاء تسجيل الدخول" }, { status: 401 });
  }
  if (!canAccessAllBranches(user)) {
    return NextResponse.json({ message: "غير مصرح لك بعرض الفروع." }, { status: 403 });
  }

  try {
    const branches = await getAllBranches();
    return NextResponse.json({ branches });
  } catch (err) {
    console.error("List branches failed:", err);
    return NextResponse.json({ message: "تعذر جلب قائمة الفروع." }, { status: 500 });
  }
}
