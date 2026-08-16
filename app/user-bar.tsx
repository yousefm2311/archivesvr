// // "use client";

// // import { ThemeToggle } from "@/components/ThemeToggle";
// // import { useEffect, useState } from "react";
// // import { usePathname } from "next/navigation";
// // import Link from "next/link";

// // type UserClient = {
// //   empId: string;
// //   name?: string;
// //   branch?: string;
// //   branchName?: string;
// // };

// // export function UserBar() {
// //   const pathname = usePathname();
// //   const [user, setUser] = useState<UserClient | null>(null);
// //   const [redirecting, setRedirecting] = useState(false);

// //   useEffect(() => {
// //     if (pathname && pathname.startsWith("/login")) return;
// //     if (redirecting) return;

// //     let cancelled = false;
// //     const loadUser = async () => {
// //       try {
// //         const res = await fetch("/api/auth/me", {
// //           credentials: "include",
// //           cache: "no-store",
// //         });

// //         if ((res.status === 401 || res.status === 403) && !cancelled) {
// //           setRedirecting(true);
// //           setUser(null);
// //           if (!pathname.startsWith("/login")) {
// //             alert("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.");
// //             const redirect = pathname && pathname !== "/login" ? `?redirectTo=${pathname}` : "";
// //             window.location.href = `/login${redirect}`;
// //           }
// //           return;
// //         }

// //         if (!res.ok) {
// //           if (!cancelled) setUser(null);
// //           return;
// //         }

// //         const data = await res.json().catch(() => ({}));
// //         if (!cancelled) setUser(data.user || data);
// //       } catch {
// //         if (!cancelled) setUser(null);
// //       }
// //     };
// //     loadUser();
// //     return () => {
// //       cancelled = true;
// //     };
// //   }, [pathname, redirecting]);

// //   if (pathname && pathname.startsWith("/login")) return null;
// //   if (!user) return null;

// //   return (
// //     <header
// //       className="sticky top-0 z-50 shadow-lg bg-[var(--background)] border-b"
// //       style={{ borderColor: "var(--header-border)" }}
// //     >
// //       <div
// //         className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4 rounded-b-2xl"
// //         style={{
// //           background: "linear-gradient(90deg, var(--header-from), var(--header-to))",
// //           color: "var(--header-text)",
// //         }}
// //       >
// //         <div className="flex items-center gap-4">
// //           <Link href="/home" className="text-lg font-bold tracking-tight transition nav-pill">
// //             نظام المستندات
// //           </Link>
// //           <nav className="hidden md:flex items-center gap-2 text-sm">
// //             <Link href="/clients/new" className="nav-pill">
// //               إنشاء عميل جديد ورفع مستنداته
// //             </Link>
// //             <Link href="/documents" className="nav-pill">
// //               استعلام مستندات عميل
// //             </Link>
// //             <Link href="/reports/client-docs" className="nav-pill">
// //               تقارير المستندات
// //             </Link>
// //           </nav>
// //         </div>

// //         <div className="flex items-center gap-3 text-sm">
// //           <div className="flex items-center gap-2">
// //             {/* <div className="h-9 w-9 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-sm font-bold">
// //               {(user.name || user.empId || "?").toString().charAt(0).toUpperCase()}
// //             </div> */}
// //             <div className="flex flex-col text-right leading-tight" style={{ color: "var(--header-text)" }}>
// //               <span className="font-semibold">{user.name || "مستخدم"}</span>
// //               <span className="text-xs">كود الموظف: {user.empId || "-"}</span>
// //               {user.branch ? (
// //                 <span className="text-xs">الفرع: {user.branchName || user.branch}</span>
// //               ) : null}
// //             </div>
// //           </div>
// //           <ThemeToggle />
// //           <form action="/api/auth/logout" method="post">
// //             <button
// //               type="submit"
// //               className="header-btn logout-btn rounded-full px-3 py-1 text-xs font-semibold transition border"
// //             >
// //               تسجيل الخروج
// //             </button>
// //           </form>
// //         </div>
// //       </div>
// //     </header>
// //   );
// // }




// "use client";

// import { ThemeToggle } from "@/components/ThemeToggle";
// import { useEffect, useState } from "react";
// import { usePathname } from "next/navigation";
// import Link from "next/link";
// import { canAccessUploadPage } from "@/lib/access";

// type UserClient = {
//   empId: string;
//   name?: string;
//   branch?: string;
//   branchName?: string;
// };

// export function UserBar() {
//   const pathname = usePathname();
//   const [user, setUser] = useState<UserClient | null>(null);
//   const [redirecting, setRedirecting] = useState(false);

//   useEffect(() => {
//     if (pathname && pathname.startsWith("/login")) return;
//     if (redirecting) return;

//     let cancelled = false;
//     const loadUser = async () => {
//       try {
//         const res = await fetch("/api/auth/me", {
//           credentials: "include",
//           cache: "no-store",
//         });

//         if ((res.status === 401 || res.status === 403) && !cancelled) {
//           setRedirecting(true);
//           setUser(null);
//           if (!pathname.startsWith("/login")) {
//             alert("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.");
//             const redirect = pathname && pathname !== "/login" ? `?redirectTo=${pathname}` : "";
//             window.location.href = `/login${redirect}`;
//           }
//           return;
//         }

//         if (!res.ok) {
//           if (!cancelled) setUser(null);
//           return;
//         }

//         const data = await res.json().catch(() => ({}));
//         if (!cancelled) setUser(data.user || data);
//       } catch {
//         if (!cancelled) setUser(null);
//       }
//     };
//     loadUser();
//     return () => {
//       cancelled = true;
//     };
//   }, [pathname, redirecting]);

//   if (pathname && pathname.startsWith("/login")) return null;
//   if (!user) return null;
//   const canUpload = canAccessUploadPage(user as any);

//   return (
//     <header
//       className="sticky top-0 z-50 shadow-lg bg-[var(--background)] border-b"
//       style={{ borderColor: "var(--header-border)" }}
//     >
//       <div
//         className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4 rounded-b-2xl"
//         style={{
//           background: "linear-gradient(90deg, var(--header-from), var(--header-to))",
//           color: "var(--header-text)",
//         }}
//       >
//         <div className="flex items-center gap-4">
//           <Link href="/home" className="text-lg font-bold tracking-tight transition nav-pill">
//             نظام المستندات
//           </Link>
//           <nav className="hidden md:flex items-center gap-2 text-sm">
//             {canUpload ? (
//               <Link href="/clients/new" className="nav-pill">
//                 إنشاء عميل جديد ورفع مستنداته
//               </Link>
//             ) : null}
//             <Link href="/documents" className="nav-pill">
//               استعلام مستندات عميل
//             </Link>
//             <Link href="/reports/client-docs" className="nav-pill">
//               تقارير المستندات
//             </Link>
//           </nav>
//         </div>

//         <div className="flex items-center gap-3 text-sm">
//           <div className="flex items-center gap-2">
//             {/* <div className="h-9 w-9 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-sm font-bold">
//               {(user.name || user.empId || "?").toString().charAt(0).toUpperCase()}
//             </div> */}
//             <div className="flex flex-col text-right leading-tight" style={{ color: "var(--header-text)" }}>
//               <span className="font-semibold">{user.name || "مستخدم"}</span>
//               <span className="text-xs">كود الموظف: {user.empId || "-"}</span>
//               {user.branch ? (
//                 <span className="text-xs">الفرع: {user.branchName || user.branch}</span>
//               ) : null}
//             </div>
//           </div>
//           <ThemeToggle />
//           <form action="/api/auth/logout" method="post">
//             <button
//               type="submit"
//               className="header-btn logout-btn rounded-full px-3 py-1 text-xs font-semibold transition border"
//             >
//               تسجيل الخروج
//             </button>
//           </form>
//         </div>
//       </div>
//     </header>
//   );
// }



"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { canAccessAllBranches, canCreateClient } from "@/lib/permissions-special";

type UserClient = {
  empId: string;
  name?: string;
  branch?: string;
  branchName?: string;
};

export function UserBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserClient | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (pathname && pathname.startsWith("/login")) return;
    if (redirecting) return;

    let cancelled = false;
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if ((res.status === 401 || res.status === 403) && !cancelled) {
          setRedirecting(true);
          setUser(null);
          if (!pathname.startsWith("/login")) {
            alert("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.");
            const redirect = pathname && pathname !== "/login" ? `?redirectTo=${pathname}` : "";
            window.location.href = `/login${redirect}`;
          }
          return;
        }

        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!cancelled) setUser(data.user || data);
      } catch {
        if (!cancelled) setUser(null);
      }
    };
    loadUser();
    return () => {
      cancelled = true;
    };
  }, [pathname, redirecting]);

  if (pathname && pathname.startsWith("/login")) return null;
  if (!user) return null;

  const canUpload = canCreateClient(user as any);
  const canTransfer = canAccessAllBranches(user as any);

  return (
    <header
      className="sticky top-0 z-50 shadow-lg bg-[var(--background)] border-b"
      style={{ borderColor: "var(--header-border)" }}
    >
      <div
        className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4 rounded-b-2xl"
        style={{
          background: "linear-gradient(90deg, var(--header-from), var(--header-to))",
          color: "var(--header-text)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/home" className="text-lg font-bold tracking-tight transition nav-pill">
            نظام المستندات
          </Link>
          <nav className="hidden md:flex items-center gap-2 text-sm">
            {canUpload ? (
              <Link href="/clients/new" className="nav-pill">
                إنشاء عميل جديد ورفع مستنداته
              </Link>
            ) : null}
            <Link href="/documents" className="nav-pill">
              استعلام مستندات عميل
            </Link>
            <Link href="/reports/client-docs" className="nav-pill">
              تقارير المستندات
            </Link>
            {canTransfer && canUpload? (
              <Link href="/transfer" className="nav-pill">
                تحويل عميل
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex flex-col text-right leading-tight" style={{ color: "var(--header-text)" }}>
            <span className="font-semibold">{user.name || "مستخدم"}</span>
            <span className="text-xs">كود الموظف: {user.empId || "-"}</span>
            {user.branch ? (
              <span className="text-xs">الفرع: {user.branchName || user.branch}</span>
            ) : null}
          </div>
          <ThemeToggle />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="header-btn logout-btn rounded-full px-3 py-1 text-xs font-semibold transition border"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
