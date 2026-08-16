"use client";

import { Controller, Control } from "react-hook-form";

export type UploadFormValues = {
  docType: string;
  docDate?: string;
  file: FileList;
  replaceExisting?: boolean;
};

type Props = {
  control: Control<UploadFormValues>;
  docTypes: readonly string[];
};

export function FileUploadRow({ control, docTypes }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <Controller
        name="docType"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              اختر نوع المستند
            </label>
            <select
              {...field}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {docTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}
      />

      <Controller
        name="docDate"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              تاريخ المستند
            </label>
            <input
              type="date"
              {...field}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}
      />

      <Controller
        name="file"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              الملف
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => field.onChange(e.target.files)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
        )}
      />

      <Controller
        name="replaceExisting"
        control={control}
        render={({ field }) => (
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            استبدال المستند إذا كان موجوداً مسبقاً
          </label>
        )}
      />
    </div>
  );
}
