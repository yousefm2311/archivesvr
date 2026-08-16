"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const TEXT = {
  title: "تسجيل الدخول",
  empIdLabel: "كود الموظف (IDBACD)",
  idCardLabel: "كلمه السر (IDBACD)",
  submit: "تسجيل الدخول",
  loading: "جاري التحميل...",
  loginError: "فشل تسجيل الدخول، حاول مرة أخرى.",
  networkError: "تعذر الاتصال بالخادم، يرجى المحاولة لاحقًا.",
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [empId, setEmpId] = useState("");
  const [idCard, setIdCard] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empId, idCard }),
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message ?? TEXT.loginError);
        return;
      }

      // تأكيد أن الكوكي اتسجلت فعليًا
      const me = await fetch("/api/auth/me", { credentials: "include" });
      if (!me.ok) {
        const meData = await me.json().catch(() => ({}));
        setError(meData.message ?? TEXT.loginError);
        return;
      }

      const redirectParam = searchParams.get("redirectTo");
      const redirectTo =
        redirectParam && redirectParam !== "/" ? redirectParam : "/";

      router.push(redirectTo);
      //router.refresh();
    } catch {
      setError(TEXT.networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-slate-200">
        <h1 className="text-2xl font-semibold text-center text-slate-900 mb-6">
          {TEXT.title}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              {TEXT.empIdLabel}
            </label>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              {TEXT.idCardLabel}
            </label>
            <input
              type="password"
              value={idCard}
              onChange={(e) => setIdCard(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-70"
          >
            {isSubmitting ? TEXT.loading : TEXT.submit}
          </button>

          {error ? (
            <p className="text-sm text-red-600 text-center" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-sm text-transparent text-center select-none">
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
