"use client";

import { useState } from "react";
import type { BranchOption } from "@/lib/branches";

type Props = {
  branches: BranchOption[];
};

type ClientInfo = {
  clientCode: string;
  clientName: string;
  branchName?: string;
};

export function TransferClient({ branches }: Props) {
  const [clientCode, setClientCode] = useState("");
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadClient = async () => {
    if (!clientCode.trim()) {
      setMessage("أدخل كود العميل أولاً.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/clients?code=${encodeURIComponent(clientCode)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.client) {
        setClient(null);
        setMessage(data?.denyReason || data?.message || "العميل غير موجود.");
        return;
      }
      setClient({
        clientCode: data.client.clientCode,
        clientName: data.client.clientName,
        branchName: data.client.branchName,
      });
      setMessage("تم تحميل بيانات العميل.");
    } catch {
      setMessage("تعذر تحميل بيانات العميل، حاول مرة أخرى.");
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!client) {
      setMessage("حمّل بيانات العميل أولاً.");
      return;
    }
    if (!selectedBranch) {
      setMessage("اختر الفرع المحوّل إليه.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientCode: client.clientCode, targetBranch: selectedBranch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "تعذر تنفيذ التحويل.");
      }
      setMessage(data.message || "تم تحويل العميل بنجاح.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تعذر تنفيذ التحويل.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-lg font-medium text-right text-[var(--text-strong)]">
            كود العميل
          </label>
          <input
            type="text"
            value={clientCode}
            onChange={(e) => setClientCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                loadClient();
              }
            }}
            className="w-full rounded-lg border px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="أدخل كود العميل"
          />
        </div>
        <div className="flex items-end justify-end">
          <button
            type="button"
            onClick={loadClient}
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "جاري التحميل..." : "تحميل بيانات العميل"}
          </button>
        </div>
      </div>

      {client ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-lg text-right text-[var(--text-strong)]">
            الاسم: <span className="font-semibold">{client.clientName}</span>
          </p>
          <p className="text-lg text-right text-[var(--text-muted)]">
            الفرع الحالي: {client.branchName || "غير متاح"}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-lg font-medium text-right text-[var(--text-strong)]">
          اختر الفرع المحوّل إليه
        </label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">-- اختر الفرع --</option>
          {branches.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleTransfer}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "جارٍ التحويل..." : "تنفيذ التحويل"}
        </button>
      </div>

      {message ? (
        <p className="text-sm text-right text-[var(--text-strong)]">{message}</p>
      ) : null}
    </div>
  );
}
