"use client";

import type { BranchOption } from "@/lib/branches";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";

type FavoriteFilter = {
  name: string;
  params: {
    branch: string;
    clientCode: string;
    clientName: string;
    dateFrom: string;
    dateTo: string;
  };
};

type Props = {
  branches: BranchOption[];
  selectedBranch: string;
  clientCode: string;
  clientName: string;
  dateFrom: string;
  dateTo: string;
  canSelectBranch: boolean;
};

const STORAGE_KEY = "client-docs-favorites:v1";
const FAVORITES_LIMIT = 20;

const normalizeValue = (value: string) => value.trim();

const normalizeParams = (params?: Partial<FavoriteFilter["params"]> | null) => ({
  branch: params?.branch ?? "",
  clientCode: params?.clientCode ?? "",
  clientName: params?.clientName ?? "",
  dateFrom: params?.dateFrom ?? "",
  dateTo: params?.dateTo ?? "",
});

const parseFavorites = (raw: string | null): FavoriteFilter[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.name === "string" && typeof item.params === "object")
      .map((item) => ({
        name: String(item.name),
        params: normalizeParams(item.params as FavoriteFilter["params"]),
      }))
      .slice(0, FAVORITES_LIMIT);
  } catch {
    return [];
  }
};

export function ClientDocsFilters({
  branches,
  selectedBranch,
  clientCode,
  clientName,
  dateFrom,
  dateTo,
  canSelectBranch,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [branch, setBranch] = useState(selectedBranch ?? "");
  const [code, setCode] = useState(clientCode ?? "");
  const [name, setName] = useState(clientName ?? "");
  const [from, setFrom] = useState(dateFrom ?? "");
  const [to, setTo] = useState(dateTo ?? "");
  const [favorites, setFavorites] = useState<FavoriteFilter[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [favoriteName, setFavoriteName] = useState("");
  const [selectedFavorite, setSelectedFavorite] = useState("");

  useEffect(() => {
    setBranch(selectedBranch ?? "");
    setCode(clientCode ?? "");
    setName(clientName ?? "");
    setFrom(dateFrom ?? "");
    setTo(dateTo ?? "");
  }, [selectedBranch, clientCode, clientName, dateFrom, dateTo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFavorites(parseFavorites(window.localStorage.getItem(STORAGE_KEY)));
    setFavoritesLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!favoritesLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, favoritesLoaded]);

  const buildQuery = (params: FavoriteFilter["params"]) => {
    const query = new URLSearchParams();
    if (canSelectBranch && params.branch) query.set("branch", params.branch);
    if (params.clientCode) query.set("clientCode", params.clientCode);
    if (params.clientName) query.set("clientName", params.clientName);
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    return query.toString();
  };

  const applyFilters = (params: FavoriteFilter["params"]) => {
    const qs = buildQuery(params);
    startTransition(() => {
      router.push(qs ? `/reports/client-docs?${qs}` : "/reports/client-docs");
    });
  };

  const currentParams = (): FavoriteFilter["params"] => ({
    branch: normalizeValue(branch),
    clientCode: normalizeValue(code),
    clientName: normalizeValue(name),
    dateFrom: from,
    dateTo: to,
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    applyFilters(currentParams());
  };

  const handleReset = () => {
    const next = {
      branch: canSelectBranch ? "" : selectedBranch ?? "",
      clientCode: "",
      clientName: "",
      dateFrom: "",
      dateTo: "",
    };
    setBranch(next.branch);
    setCode(next.clientCode);
    setName(next.clientName);
    setFrom(next.dateFrom);
    setTo(next.dateTo);
    applyFilters(next);
  };

  const handleSaveFavorite = () => {
    const trimmed = favoriteName.trim();
    if (!trimmed) return;
    const params = currentParams();
    setFavorites((prev) => {
      const filtered = prev.filter((item) => item.name !== trimmed);
      return [{ name: trimmed, params }, ...filtered].slice(0, FAVORITES_LIMIT);
    });
    setSelectedFavorite(trimmed);
  };

  const handleFavoriteSelect = (value: string) => {
    setSelectedFavorite(value);
    const favorite = favorites.find((item) => item.name === value);
    if (!favorite) return;
    const params = favorite.params;
    setBranch(canSelectBranch ? params.branch : selectedBranch ?? "");
    setCode(params.clientCode);
    setName(params.clientName);
    setFrom(params.dateFrom);
    setTo(params.dateTo);
  };

  const handleApplyFavorite = () => {
    const favorite = favorites.find((item) => item.name === selectedFavorite);
    if (!favorite) return;
    const params = normalizeParams(favorite.params);
    applyFilters({
      ...params,
      branch: canSelectBranch ? params.branch : "",
    });
  };

  const handleDeleteFavorite = () => {
    if (!selectedFavorite) return;
    setFavorites((prev) => prev.filter((item) => item.name !== selectedFavorite));
    setSelectedFavorite("");
  };

  return (
    <form
      className="mt-3 space-y-3 text-sm text-[var(--text-strong)]"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-end gap-3">
        {canSelectBranch ? (
          <div className="flex flex-col gap-1">
            <label className="font-semibold">الفرع</label>
            <select
              name="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="rounded-lg border px-3 py-2 text-right text-base"
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
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <label className="font-semibold">كود العميل</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-lg border px-3 py-2 text-right text-base"
            placeholder="مثال: 1024"
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold">اسم العميل</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border px-3 py-2 text-right text-base"
            placeholder="بحث بالاسم"
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold">من تاريخ</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border px-3 py-2 text-right text-base"
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold">إلى تاريخ</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border px-3 py-2 text-right text-base"
            disabled={pending}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-600 px-4 py-2 text-base font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {pending ? "جاري البحث..." : "بحث"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleReset}
            className="rounded-lg border px-4 py-2 text-base font-semibold"
          >
            مسح
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {canSelectBranch ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">اسم الفلتر</label>
              <input
                type="text"
                value={favoriteName}
                onChange={(e) => setFavoriteName(e.target.value)}
                className="rounded-lg border px-3 py-2 text-right text-base"
                placeholder="اكتب اسم الفلتر"
                disabled={pending}
              />
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={handleSaveFavorite}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              حفظ الفلتر
            </button>

            <div className="flex flex-col gap-1">
              <label className="font-semibold">الفلاتر المحفوظة</label>
              <select
                value={selectedFavorite}
                onChange={(e) => handleFavoriteSelect(e.target.value)}
                className="rounded-lg border px-3 py-2 text-right text-base"
                disabled={pending || favorites.length === 0}
              >
                <option value="">اختيار فلتر</option>
                {favorites.map((fav) => (
                  <option key={fav.name} value={fav.name}>
                    {fav.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                disabled={pending || !selectedFavorite}
                onClick={handleApplyFavorite}
                className="rounded-lg border px-4 py-2 text-base font-semibold"
              >
                تطبيق
              </button>
              <button
                type="button"
                disabled={pending || !selectedFavorite}
                onClick={handleDeleteFavorite}
                className="rounded-lg border px-4 py-2 text-base font-semibold"
              >
                حذف
              </button>
            </div>
          </>
        ) : null}
      </div>
    </form>
  );
}
