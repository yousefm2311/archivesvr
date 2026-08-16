export const OTHER_DOC_TYPE = "أخرى";

export const DOC_TYPES = [
  "استمارة تفاصيل طلب التمويل",
  "طلب التمويل",
  "بيان حالة",
  "استعلام ائتماني",
  "مؤشر خروج من الفقر",
  "اعرف عميلك",
  "موافقة صرف وسداد إلكتروني",
  "عقد تمويل",
  "التسعير",
  "تحليل مالي",
  "رقم قومي عميل",
  "رقم قومي ضامن",
  "عقد إيجار",
  "إيصال خدمات",
  "إفادة سكن",
  "سجل تجاري",
  "بطاقة ضريبية",
  "شهادتي افلاس وبروتستو ",
  "رخصة مزاولة النشاط",
  "رخصة سيارة",
  "رخصة قيادة",
  "شهادة حيازة زراعية",
  "طلب ترحيل",
  "طلب تصفية",
  "سند لأمر",
  "شيك بنكي",
  "كشف حساب بنكي",
  OTHER_DOC_TYPE,
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const normalizeDocName = (input: string) => {
  if (!input) return "";
  return input
    .trim()
    .replace(/ة/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/\s+/g, " ")
    .toLowerCase();
};

export const correctDocName = (name: string) => {
  const n = normalizeDocName(name);
  if (!n) return "بدون اسم";
  // لا نعيد تسمية بطاقات إلى بطاقة رقم قومي؛ نستخدم الاسم كما أدخله المستخدم
  return name?.trim() || "بدون اسم";
};

export const extractFileUrl = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;

  const anyData = data as Record<string, unknown>;

  const direct =
    anyData.fileUrl ||
    anyData.filePath ||
    anyData.archivePath ||
    anyData.archiveDownloadUrl ||
    anyData.url ||
    anyData.path ||
    anyData.location;

  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const nested =
    (anyData.archive as Record<string, unknown> | undefined)?.archivePath ||
    (anyData.archive as Record<string, unknown> | undefined)?.path ||
    (anyData.archive as Record<string, unknown> | undefined)?.url ||
    (anyData.archive as Record<string, unknown> | undefined)?.location;

  if (typeof nested === "string" && nested.trim()) {
    return nested;
  }

  const filesArr =
    (anyData.files as unknown[]) ||
    (anyData.file as unknown[]) ||
    (anyData.uploaded as unknown[]) ||
    (anyData.results as unknown[]);

  if (Array.isArray(filesArr) && filesArr.length > 0) {
    const first = filesArr[0] as Record<string, unknown>;
    const fromFirst =
      first?.filePath || first?.path || first?.url || first?.fileUrl || first?.location;
    if (typeof fromFirst === "string" && fromFirst.trim()) {
      return fromFirst;
    }
  }

  const candidates: string[] = [];
  const walk = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    Object.values(obj as Record<string, unknown>).forEach((val) => {
      if (typeof val === "string" && /[\\/]/.test(val)) {
        candidates.push(val);
      } else if (Array.isArray(val)) {
        val.forEach(walk);
      } else if (typeof val === "object") {
        walk(val);
      }
    });
  };
  walk(data);
  return candidates[0];
};

const transliterateArabic = (value: string) => {
  const map: Record<string, string> = {
    "أ": "a",
    "إ": "e",
    "آ": "a",
    "ا": "a",
    "ب": "b",
    "ت": "t",
    "ث": "th",
    "ج": "g",
    "ح": "h",
    "خ": "kh",
    "د": "d",
    "ذ": "th",
    "ر": "r",
    "ز": "z",
    "س": "s",
    "ش": "sh",
    "ص": "s",
    "ض": "d",
    "ط": "t",
    "ظ": "z",
    "ع": "a",
    "غ": "gh",
    "ف": "f",
    "ق": "q",
    "ك": "k",
    "ل": "l",
    "م": "m",
    "ن": "n",
    "ه": "h",
    "و": "w",
    "ي": "y",
    "ى": "a",
    "ة": "h",
    "ئ": "y",
    "ؤ": "w",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return value
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
};

const sanitizeForFilename = (value: string) => {
  // نخزن الاسم في قاعدة البيانات بالعربي كما هو، لكن اسم الملف نفسه نستخدمه ASCII
  // لأن خدمة الأرشفة تضغط بترميز CP437 ولا تدعم UTF-8 داخل الـ ZIP، مما يشوّه الأسماء العربية.
  const latin = transliterateArabic(value);
  return latin
    .trim()
    .replace(/[^A-Za-z0-9 _-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const buildDocumentFileName = (
  docName: string,
  clientCode: string | number,
  originalName: string
) => {
  const safeDoc = sanitizeForFilename(docName || "document") || "document";
  const safeClient = sanitizeForFilename(String(clientCode) || "client");
  const extMatch = originalName.match(/\.[^./\\]+$/);
  const ext = extMatch ? extMatch[0] : "";
  return `${safeDoc}-${safeClient}${ext}`;
};

export const renameFileWithClientCode = (
  file: File,
  docName: string,
  clientCode: string | number
) => {
  const newName = buildDocumentFileName(docName, clientCode, file.name);
  return new File([file], newName, { type: file.type });
};
