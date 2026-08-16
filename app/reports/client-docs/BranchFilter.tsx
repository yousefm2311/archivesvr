"use client";

import type { BranchOption } from "@/lib/branches";
import { useRouter } from "next/navigation";
import type React from "react";
import { useTransition } from "react";

type Props = {
  branches: BranchOption[];
  selectedBranch: string;
};

export function BranchFilter({ branches, selectedBranch }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const branch = (data.get("branch") as string) ?? "";
    startTransition(() => {
      const query = branch ? `?branch=${encodeURIComponent(branch)}` : "";
      router.push(`/reports/client-docs${query}`);
    });
  };

  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--text-strong)]"
      onSubmit={handleSubmit}
    >
      <label className="font-semibold">اختر الفرع:</label>
      <select
        name="branch"
        defaultValue={selectedBranch}
        className="rounded-lg border px-15 py-2 text-right text-base"
        style={{ color: "var(--text-strong)" }}
        disabled={pending}
      >
        <option value="">الكل</option>
        {branches.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-600 px-15 py-2 text-base font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {pending ? "جارٍ التحديث..." : "تطبيق"}
      </button>
    </form>
  );
}
