type Props = {
  clientCode: string | number;
  clientName?: string;
  subtitle?: string;
};

export function ClientHeader({ clientCode, clientName, subtitle }: Props) {
  return (
    <div className="flex flex-col gap-2 text-right">
      <p className="text-xs text-slate-500">بيانات العميل</p>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          {clientName || "العميل"} · كود {clientCode}
        </h1>
        {subtitle ? (
          <p className="text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
