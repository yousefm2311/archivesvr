"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "app-theme";
const LIGHT = "light";
const DARK = "dark-blue";

const applyTheme = (theme: string) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<string>(LIGHT);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === LIGHT || stored === DARK) {
      setTheme(stored);
      applyTheme(stored);
      return;
    }
    setTheme(LIGHT);
    applyTheme(LIGHT);
  }, []);

  const toggle = () => {
    const next = theme === LIGHT ? DARK : LIGHT;
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="header-btn toggle-theme rounded-full px-3 py-1 text-xs font-semibold transition border"
      aria-label="تبديل الثيم"
    >
      {theme === LIGHT ? "تفعيل الثيم الداكن" : "تفعيل الثيم الفاتح"}
    </button>
  );
}
