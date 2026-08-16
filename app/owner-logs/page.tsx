// import { redirect } from "next/navigation";
// import { getAuthUserFromCookies } from "@/lib/auth";
// import OwnerLogsClient from "./OwnerLogsClient";

// const OWNER_EMP_ID = "3425, 2673";

// export default async function OwnerLogsPage() {
//   const user = await getAuthUserFromCookies();
//   if (!user) redirect("/login");

//   if (String(user.empId ?? "").trim() !== OWNER_EMP_ID) {
//     return (
//       <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
//         <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
//           <p className="text-lg font-semibold text-rose-600">ليس لديك صلاحية الوصول.</p>
//           <p className="mt-2 text-sm text-slate-500">هذه الصفحة مخصصة للمالك فقط.</p>
//         </div>
//       </main>
//     );
//   }

//   return <OwnerLogsClient />;
// }



import { redirect } from "next/navigation";
import { getAuthUserFromCookies } from "@/lib/auth";
import OwnerLogsClient from "./OwnerLogsClient";

const OWNER_EMP_IDS = ["3425", "2673"];

export default async function OwnerLogsPage() {
  const user = await getAuthUserFromCookies();
  if (!user) redirect("/login");

  const empId = String(user.empId ?? "").trim();

  if (!OWNER_EMP_IDS.includes(empId)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-rose-600">ليس لديك صلاحية الوصول.</p>
          <p className="mt-2 text-sm text-slate-500">هذه الصفحة مخصصة للمالك فقط.</p>
        </div>
      </main>
    );
  }

  return <OwnerLogsClient />;
}