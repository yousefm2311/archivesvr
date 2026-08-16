type Props = {
  title: string;
  value: string | number;
  hint?: string;
};

export function StatsCard({ title, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-right">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}
