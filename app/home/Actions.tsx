// // "use client";

// // import { useRouter } from "next/navigation";

// // export function Actions() {
// //   const router = useRouter();

// //   const goTo = (path: string) => {
// //     if (!path) return;
// //     router.push(path);
// //   };

// //   return (
// //     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
// //       <button
// //         type="button"
// //         onClick={() => goTo("/clients/new")}
// //         className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
// //       >
// //         إنشاء عميل جديد ورفع مستنداته
// //       </button>
// //       <button
// //         type="button"
// //         onClick={() => goTo("/documents")}
// //         className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
// //       >
// //         استعلام مستندات عميل
// //       </button>
// //       <button
// //         type="button"
// //         onClick={() => goTo("/reports/client-docs")}
// //         className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
// //       >
// //         تقارير المستندات
// //       </button>
// //     </div>
// //   );
// // }



// "use client";

// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { canAccessUploadPage } from "@/lib/access";

// export function Actions() {
//   const router = useRouter();
//   const [canUpload, setCanUpload] = useState<boolean>(false);

//   useEffect(() => {
//     const check = async () => {
//       try {
//         const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
//         const data = await res.json().catch(() => ({}));
//         const user = data?.user ?? data;
//         setCanUpload(canAccessUploadPage(user));
//       } catch {
//         setCanUpload(false);
//       }
//     };
//     check();
//   }, []);

//   const goTo = (path: string) => {
//     if (!path) return;
//     router.push(path);
//   };

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
//       {canUpload ? (
//         <button
//           type="button"
//           onClick={() => goTo("/clients/new")}
//           className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
//         >
//           إنشاء عميل جديد ورفع مستنداته
//         </button>
//       ) : null}
//       <button
//         type="button"
//         onClick={() => goTo("/documents")}
//         className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
//       >
//         استعلام مستندات عميل
//       </button>
//       <button
//         type="button"
//         onClick={() => goTo("/reports/client-docs")}
//         className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
//       >
//         تقارير المستندات
//       </button>
//     </div>
//   );
// }





"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canCreateClient } from "@/lib/permissions-special";

export function Actions() {
  const router = useRouter();
  const [canUpload, setCanUpload] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const user = data?.user ?? data;
        setCanUpload(canCreateClient(user));
      } catch {
        setCanUpload(false);
      }
    };
    check();
  }, []);

  const goTo = (path: string) => {
    if (!path) return;
    router.push(path);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
      {canUpload ? (
        <button
          type="button"
          onClick={() => goTo("/clients/new")}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
          style={{ backgroundColor: "#0284c7" }}
        >
          إنشاء عميل جديد ورفع مستنداته
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => goTo("/documents")}
        className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
        style={{ backgroundColor: "#6366f1" }}
      >
        استعلام مستندات عميل
      </button>
      <button
        type="button"
        onClick={() => goTo("/reports/client-docs")}
        className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-4 text-sm font-semibold text-white shadow-lg hover:scale-[1.01] transition"
        style={{ backgroundColor: "#f59e0b" }}
      >
        تقارير المستندات
      </button>
    </div>
  );
}
