"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  clientCode: number;
  clientName: string;
  createdAt?: string | Date;
};

type Props = {
  initialClients: Client[];
};

export default function ClientsList({ initialClients }: Props) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setClients(initialClients);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          credentials: "include",
        });
        const data = await res.json();
        setClients(data.clients ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => controller.abort();
  }, [query, initialClients]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700 text-right">
          ابحث عن عميل
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="اكتب اسم العميل للبحث"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-right">
          <thead className="bg-slate-100 text-sm text-slate-700">
            <tr>
              <th className="px-4 py-2">كود العميل</th>
              <th className="px-4 py-2">اسم العميل</th>
              <th className="px-4 py-2">تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-800">
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{c.clientCode}</td>
                <td className="px-4 py-2">{c.clientName}</td>
                <td className="px-4 py-2">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}
                </td>
              </tr>
            ))}
            {clients.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-center text-slate-500" colSpan={3}>
                  {loading ? "جاري البحث..." : "لا توجد نتائج"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
