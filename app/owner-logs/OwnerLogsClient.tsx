"use client";

import React, { useEffect, useMemo, useState } from "react";

type AuditLogUser = {
  empId?: string;
  name?: string;
  role?: string;
  branch?: string;
  jobCode?: string;
};

type AuditLogRow = {
  id: string;
  action?: string;
  status?: "success" | "failure";
  message?: string;
  reason?: string;
  user?: AuditLogUser;
  clientCode?: string;
  docId?: string;
  details?: Record<string, unknown> | null;
  meta?: {
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
  };
  createdAt?: string;
};

type ApiResponse = {
  logs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 50;

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-EG");
};

const formatIp = (ip?: string) => {
  if (!ip) return "غير متوفر";
  return ip.replace(/^::ffff:/, '');
};

// --- Time Ago Formatter ---
const getTimeAgo = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "منذ لحظات";
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : minutes === 2 ? 'دقيقتين' : minutes <= 10 ? 'دقائق' : 'دقيقة'}`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : hours <= 10 ? 'ساعات' : 'ساعة'}`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} ${days === 1 ? 'يوم' : days === 2 ? 'يومين' : days <= 10 ? 'أيام' : 'يوم'}`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} ${months === 1 ? 'شهر' : months === 2 ? 'شهرين' : months <= 10 ? 'أشهر' : 'شهر'}`;
  
  return date.toLocaleDateString("ar-EG");
};

// --- Error Analyzer Utilities ---
type ErrorCategory = "Network" | "Database" | "Authentication" | "Validation" | "System" | "Unknown";

interface ErrorAnalysis {
  category: ErrorCategory;
  categoryLabel: string;
  textClass: string;
  icon: React.ReactNode;
  diagnosis: string;
  suggestedAction: string;
}

const analyzeError = (row: AuditLogRow): ErrorAnalysis | null => {
  if (row.status === "success") return null;

  const msg = row.message || "";
  const rsn = row.reason || "";
  const dtl = row.details ? JSON.stringify(row.details) : "";
  const combinedText = `${msg} ${rsn} ${dtl}`.toLowerCase();

  const extractErrorName = () => {
    const errorMatch = rsn.match(/([a-zA-Z]+Error):/);
    if (errorMatch) return errorMatch[1];
    if (msg.includes("Error") || rsn.includes("Error")) {
      return rsn.split(":")[0] || "خطأ تقني";
    }
    return rsn || msg || "خطأ غير محدد";
  };

  if (combinedText.includes("jwt") || combinedText.includes("unauthorized") || combinedText.includes("مصرح") || combinedText.includes("تسجيل الدخول") || combinedText.includes("401") || combinedText.includes("403")) {
    return {
      category: "Authentication",
      categoryLabel: "مشكلة في الصلاحيات / تسجيل الدخول",
      textClass: "text-orange-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
      diagnosis: `الطلب مرفوض (${extractErrorName()}). تم رفض الوصول بسبب نقص في الصلاحيات أو انتهاء الجلسة.`,
      suggestedAction: "اطلب من المستخدم تسجيل الخروج وإعادة الدخول. تحقق من أن حسابه يمتلك الصلاحية لهذا الإجراء في النظام."
    };
  }

  if (combinedText.includes("network") || combinedText.includes("fetch") || combinedText.includes("econnrefused") || combinedText.includes("timeout") || combinedText.includes("cors") || combinedText.includes("تعذر الاتصال") || combinedText.includes("انترنت") || combinedText.includes("إنترنت") || combinedText.includes("client_error")) {
    return {
      category: "Network",
      categoryLabel: "فشل في اتصال الشبكة (من جهة المستخدم)",
      textClass: "text-blue-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
      diagnosis: `تعذر وصول جهاز المستخدم للخادم (${extractErrorName()}). النظام أو المتصفح لم يتمكن من استكمال الاتصال.`,
      suggestedAction: "تأكد من استقرار شبكة الإنترنت لدى الموظف. إذا تكررت المشكلة، تحقق من حالة الخادم الأساسي وما إذا كان متاحاً للاستجابة."
    };
  }

  if (combinedText.includes("mongo") || combinedText.includes("sql") || combinedText.includes("duplicate key") || combinedText.includes("cast to objectid") || combinedText.includes("database")) {
    return {
      category: "Database",
      categoryLabel: "خطأ في قاعدة البيانات",
      textClass: "text-purple-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
      diagnosis: `مشكلة في تخزين أو قراءة البيانات (${extractErrorName()}). السبب المحتمل: إدخال مكرر، نوع بيانات غير صحيح، أو فقدان الاتصال بقاعدة البيانات.`,
      suggestedAction: "راجع تفاصيل الخطأ للعثور على الحقل المعيب (مثال: محاولة إضافة عنصر موجود مسبقاً). تأكد من صحة المدخلات وسلامة عمل قاعدة البيانات."
    };
  }

  if (combinedText.includes("validation") || combinedText.includes("required") || combinedText.includes("invalid") || combinedText.includes("مطلوب") || combinedText.includes("غير صالح") || combinedText.includes("400")) {
    return {
      category: "Validation",
      categoryLabel: "بيانات غير مكتملة أو غير صالحة",
      textClass: "text-yellow-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
      diagnosis: `فشل في التحقق من البيانات (${extractErrorName()}). المستخدم حاول إرسال بيانات ناقصة أو لا تطابق الشروط المطلوبة.`,
      suggestedAction: "افتح قسم (Payload) بالأسفل للتحقق من الحقول المُرسلة. تأكد من أن جميع الحقول الإجبارية تم تعبئتها بشكل صحيح."
    };
  }

  const errorName = extractErrorName();
  return {
    category: "System",
    categoryLabel: "خطأ غير معالج في الخادم (System Exception)",
    textClass: "text-red-500",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    diagnosis: `استثناء برمجي (Exception): ${errorName}. النظام توقف عن المعالجة بسبب خلل برمجي في مسار (${row.meta?.path || "غير متوفر"}).`,
    suggestedAction: `المشكلة برمجية بحتة. يجب قراءة التتبع (Stack Trace) في قسم التفاصيل لمعرفة السطر المتسبب في ${errorName}. راجع محتوى الطلب (Payload) المرفق لمعرفة البيانات التي أدت للانهيار.`
  };
};

// --- Copy Button Component ---
const CopyButton = ({ text, className = "" }: { text: string, className?: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button 
      onClick={handleCopy}
      className={`p-1.5 rounded-md transition-opacity opacity-80 hover:opacity-100 flex items-center justify-center gap-1 text-xs border ${copied ? 'bg-slate-50 text-emerald-600 border-slate-200' : 'bg-slate-50 text-slate-500 border-slate-200'} ${className}`}
      title={copied ? "تم النسخ" : "نسخ البيانات"}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          تم النسخ
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          نسخ
        </>
      )}
    </button>
  );
};

const JsonTree = ({ data }: { data: any }) => {
  if (data === null || data === undefined) return <span className="text-slate-500">غير متوفر</span>;
  
  if (typeof data === 'string') {
    if (data.includes('    at ') || data.includes('\n  at ')) {
      return (
        <pre className="text-xs text-red-500 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border-l-2 border-red-500 pl-3 my-2" dir="ltr">
          {data}
        </pre>
      );
    }
    return <span className="text-emerald-500 font-mono">"{data}"</span>;
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return <span className="text-blue-500 font-mono">{String(data)}</span>;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-500">[]</span>;
    return (
      <div className="pl-4 border-l border-slate-300 ml-2 space-y-1 my-1">
        {data.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-500 text-xs">[{i}]</span>
            <div><JsonTree data={item} /></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-slate-500">{}</span>;
    return (
      <div className="pl-4 border-l border-slate-300 ml-2 space-y-1.5 my-1">
        {keys.map((key) => (
          <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
            <span className="text-indigo-500 font-semibold text-xs shrink-0">{key}:</span>
            <div className="overflow-hidden break-words"><JsonTree data={data[key as keyof typeof data]} /></div>
          </div>
        ))}
      </div>
    );
  }
  
  return <span>{String(data)}</span>;
};


export default function OwnerLogsClient() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [filters, setFilters] = useState({
    status: "",
    action: "",
    empId: "",
    clientCode: "",
    docId: "",
    query: "",
    dateFrom: "",
    dateTo: "",
  });
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const fetchLogs = async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", String(nextLimit));
      if (filters.status) params.set("status", filters.status);
      if (filters.action) params.set("action", filters.action);
      if (filters.empId) params.set("empId", filters.empId);
      if (filters.clientCode) params.set("clientCode", filters.clientCode);
      if (filters.docId) params.set("docId", filters.docId);
      if (filters.query) params.set("q", filters.query);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const response = await fetch(`/api/owner-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "تعذر تحميل السجلات.");
      }
      setData(payload);
      setPage(payload.page);
      setLimit(payload.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل السجلات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setPage(1);
    setExpandedRow(null);
    void fetchLogs(1, limit);
  };

  const handleReset = () => {
    const reset = {
      status: "",
      action: "",
      empId: "",
      clientCode: "",
      docId: "",
      query: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(reset);
    setPage(1);
    setExpandedRow(null);
    void fetchLogs(1, limit);
  };

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
    setExpandedRow(null);
    void fetchLogs(safePage, limit);
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    setPage(1);
    setExpandedRow(null);
    void fetchLogs(1, value);
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleExportCSV = () => {
    if (!data?.logs || data.logs.length === 0) {
      alert("لا يوجد بيانات لتصديرها");
      return;
    }

    const headers = [
      "الوقت والتاريخ",
      "الإجراء",
      "الحالة",
      "رقم الموظف",
      "اسم الموظف",
      "كود العميل",
      "رقم المستند",
      "رسالة النظام",
      "السبب الفني",
      "IP الجهاز",
      "مسار الطلب"
    ];
    
    const escapeCsv = (str?: string) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const csvRows = data.logs.map(log => [
      escapeCsv(formatDateTime(log.createdAt)),
      escapeCsv(log.action),
      escapeCsv(log.status === 'success' ? 'ناجح' : log.status === 'failure' ? 'فشل' : 'غير معروف'),
      escapeCsv(log.user?.empId),
      escapeCsv(log.user?.name),
      escapeCsv(log.clientCode),
      escapeCsv(log.docId),
      escapeCsv(log.message),
      escapeCsv(log.reason),
      escapeCsv(formatIp(log.meta?.ip)),
      escapeCsv(log.meta?.path)
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `سجلات_النظام_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen px-4 py-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        

        <div className="rounded-2xl border bg-white p-6 shadow-sm border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              أدوات التصفية والبحث
            </div>
            
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!data?.logs?.length}
              className="header-btn rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              تصدير السجلات (CSV)
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">بحث عام</label>
              <input
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
                placeholder="نص الرسالة، المسار أو الاسم"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">الحالة</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
              >
                <option value="">الكل</option>
                <option value="success">ناجح</option>
                <option value="failure">فشل</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">الإجراء (Action)</label>
              <input
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
                placeholder="مثال: document.save"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">رقم الموظف</label>
              <input
                value={filters.empId}
                onChange={(e) => setFilters({ ...filters, empId: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
                placeholder="مثال: 3425"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">كود العميل</label>
              <input
                value={filters.clientCode}
                onChange={(e) => setFilters({ ...filters, clientCode: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
                placeholder="مثال: 10012"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">رقم المستند</label>
              <input
                value={filters.docId}
                onChange={(e) => setFilters({ ...filters, docId: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
                placeholder="DocId"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">من تاريخ</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">إلى تاريخ</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-right text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSearch}
                className="header-btn rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 border"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                تحديث السجلات
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold bg-white text-slate-800 transition-opacity hover:opacity-80"
              >
                مسح الفلاتر
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-200 bg-white">
              <span className="text-xs font-medium text-slate-600">عدد الصفوف:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="rounded-md border-0 bg-transparent py-1 text-sm outline-none font-bold text-slate-800 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden border-slate-200">
          <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50 border-slate-200">
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-800">تفاصيل السجلات</h2>
              <p className="text-xs text-slate-500 mt-1">
                {data
                  ? `إجمالي السجلات التي تم العثور عليها: ${data.total} سجل`
                  : "ابدأ بالضغط على تحديث السجلات"}
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري التحميل...
              </div>
            )}
          </div>

          {error && (
            <div className="p-6 bg-slate-50">
              <div className="status-pill-failure p-4 rounded-xl flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-right">
              <thead className="table-head text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">الوقت</th>
                  <th className="px-6 py-4">الإجراء</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">الموظف</th>
                  <th className="px-6 py-4">IP الجهاز</th>
                  <th className="px-6 py-4">التشخيص السريع</th>
                  <th className="px-6 py-4 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y border-slate-200 bg-[var(--background)]">
                {data?.logs?.length ? (
                  data.logs.map((row) => {
                    const analysis = analyzeError(row);
                    return (
                      <React.Fragment key={row.id}>
                        <tr 
                          onClick={() => toggleRow(row.id)}
                          className={`table-row transition-opacity opacity-90 hover:opacity-100 cursor-pointer ${expandedRow === row.id ? 'bg-slate-50' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                            <div dir="ltr" className="text-right text-slate-800">{formatDateTime(row.createdAt)}</div>
                            <div className="text-[11px] text-slate-500 mt-1">{getTimeAgo(row.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-pill-unknown">
                              {row.action || "بدون"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`status-pill ${
                                row.status === "success"
                                  ? "status-pill-success"
                                  : row.status === "failure"
                                    ? "status-pill-failure"
                                    : "status-pill-unknown"
                              }`}
                            >
                              {row.status === "success" ? "ناجح" : row.status === "failure" ? "فشل" : "غير معروف"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                                {row.user?.name ? row.user.name.substring(0,2) : "?"}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{row.user?.name || "مجهول"}</div>
                                <div className="text-xs text-slate-500">{row.user?.empId || "بدون رقم"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <span className="font-mono bg-slate-50 text-slate-700 px-2 py-1 rounded border border-slate-200" dir="ltr">
                              {formatIp(row.meta?.ip)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {row.status === 'success' ? (
                              <div className="text-xs text-slate-600 line-clamp-1">{row.message || "العملية تمت بنجاح"}</div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={analysis?.textClass}>{analysis?.icon}</span>
                                <div>
                                  <div className={`text-xs font-bold ${analysis?.textClass}`}>{analysis?.categoryLabel}</div>
                                  <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px]" title={row.reason || row.message}>
                                    {row.reason || row.message || "-"}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button 
                              className={`p-2 rounded-full transition-opacity opacity-60 hover:opacity-100`}
                              aria-label="عرض التفاصيل"
                            >
                              <svg className={`w-5 h-5 transition-transform duration-200 ${expandedRow === row.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          </td>
                        </tr>
                        
                        {expandedRow === row.id && (
                          <tr className="bg-slate-50 border-b-2 border-slate-200">
                            <td colSpan={7} className="px-6 py-6">
                              
                              {/* Analysis Alert Box for Failures */}
                              {row.status === 'failure' && analysis && (
                                <div className={`mb-6 p-5 rounded-xl border flex gap-4 bg-white border-slate-200`}>
                                  <div className={`shrink-0 p-3 rounded-full bg-slate-50 border border-slate-200 ${analysis.textClass}`}>
                                    {analysis.icon}
                                  </div>
                                  <div>
                                    <h3 className={`text-lg font-bold mb-1 ${analysis.textClass}`}>التشخيص: {analysis.categoryLabel}</h3>
                                    <p className="text-sm text-slate-800 leading-relaxed mb-3">{analysis.diagnosis}</p>
                                    <div className="bg-slate-50 p-4 rounded-lg text-sm border border-slate-200 shadow-sm flex items-start gap-2">
                                      <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      <div>
                                        <strong className="block mb-1 text-slate-800">الحل المقترح والتوجيه:</strong>
                                        <span className="text-slate-600">{analysis.suggestedAction}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Side: Context & Request Data */}
                                <div className="space-y-6">
                                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
                                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                      بصمة الطلب والشبكة (Request Footprint)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <dt className="text-xs text-slate-500 mb-1">عنوان الـ IP (الجهاز):</dt>
                                        <dd className="font-mono bg-slate-50 text-slate-800 p-2 rounded border border-slate-200" dir="ltr">{formatIp(row.meta?.ip)}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-xs text-slate-500 mb-1">طريقة الطلب (Method):</dt>
                                        <dd className="font-mono bg-slate-50 text-slate-800 p-2 rounded border border-slate-200" dir="ltr">{row.meta?.method || "-"}</dd>
                                      </div>
                                      <div className="sm:col-span-2">
                                        <dt className="text-xs text-slate-500 mb-1">مسار الاستدعاء (Endpoint Path):</dt>
                                        <dd className="font-mono bg-slate-50 text-slate-800 p-2 rounded border border-slate-200 truncate" title={row.meta?.path} dir="ltr">{row.meta?.path || "-"}</dd>
                                      </div>
                                      <div className="sm:col-span-2">
                                        <dt className="text-xs text-slate-500 mb-1">معرف المتصفح والجهاز (User Agent):</dt>
                                        <dd className="text-xs bg-slate-50 text-slate-700 p-2 rounded border border-slate-200 leading-relaxed" dir="ltr">{row.meta?.userAgent || "-"}</dd>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
                                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                      الارتباطات التشغيلية (User & Entity Context)
                                    </h4>
                                    <dl className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
                                      <div><dt className="text-xs text-slate-500">الموظف / المنفذ</dt><dd className="font-medium text-slate-800 mt-1">{row.user?.name || "-"} ({row.user?.empId || "بدون"})</dd></div>
                                      <div><dt className="text-xs text-slate-500">الدور الوظيفي</dt><dd className="font-medium text-slate-800 mt-1">{row.user?.role || "-"}</dd></div>
                                      <div><dt className="text-xs text-slate-500">الفرع أو الإدارة</dt><dd className="font-medium text-slate-800 mt-1">{row.user?.branch || "-"}</dd></div>
                                      <div><dt className="text-xs text-slate-500">كود العميل المرتبط</dt><dd className="font-medium text-slate-800 mt-1">{row.clientCode || "-"}</dd></div>
                                      <div className="col-span-2 pt-2 border-t border-slate-200"><dt className="text-xs text-slate-500">المعرف المرجعي للمستند (DocId)</dt><dd className="font-mono text-sm mt-1 bg-white text-slate-700 inline-block px-2 py-0.5 rounded border border-slate-200" dir="ltr">{row.docId || "-"}</dd></div>
                                    </dl>
                                  </div>
                                </div>

                                {/* Right Side: Error Breakdown & Stack */}
                                <div className="space-y-6 flex flex-col h-full">
                                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
                                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                      الرسائل التقنية (Logs & Payload)
                                    </h4>
                                    
                                    <div className="space-y-5 flex-1">
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-r-2 border-slate-400 pr-2">نص الرسالة الأصلية</h5>
                                          {row.message && <CopyButton text={row.message} />}
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                                          {row.message || <span className="text-slate-400 italic">لا يوجد</span>}
                                        </div>
                                      </div>
                                      
                                      {row.reason && (
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-r-2 border-slate-400 pr-2">السبب الفني المسجل (Raw Reason)</h5>
                                            <CopyButton text={row.reason} />
                                          </div>
                                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono text-left" dir="ltr">
                                            {row.reason}
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex-1 flex flex-col min-h-[200px]">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-r-2 border-slate-400 pr-2">محتوى الطلب وهيكل البيانات (Deep Details)</h5>
                                          {row.details && Object.keys(row.details).length > 0 && <CopyButton text={JSON.stringify(row.details, null, 2)} />}
                                        </div>
                                        <div className="flex-1 p-4 rounded-lg bg-slate-50 text-slate-800 text-sm overflow-x-auto shadow-inner border border-slate-200" dir="ltr">
                                          {row.details && Object.keys(row.details).length > 0 ? (
                                            <JsonTree data={row.details} />
                                          ) : (
                                            <div className="text-center text-slate-500 pt-4 flex flex-col items-center">
                                              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                              لا توجد بيانات إضافية للطباعة
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <p className="text-base font-medium">لا توجد سجلات مطابقة.</p>
                        <p className="text-sm mt-1">حاول تغيير فلاتر البحث أو تأكد من وجود عمليات سابقة.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between border-t bg-slate-50 px-6 py-4 gap-4 border-slate-200">
            <div className="text-sm font-medium text-slate-700">
              الصفحة <span className="font-bold">{data?.page ?? page}</span> من <span className="font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange((data?.page ?? page) - 1)}
                disabled={(data?.page ?? page) <= 1 || loading}
                className="header-btn rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm border"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                السابق
              </button>
              <button
                type="button"
                onClick={() => handlePageChange((data?.page ?? page) + 1)}
                disabled={(data?.page ?? page) >= totalPages || loading}
                className="header-btn rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm border"
              >
                التالي
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
