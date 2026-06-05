"use client";

import { useCallback, useEffect, useState } from "react";
import type { Theme } from "@/lib/types";
import { themes } from "@/styles/themes";

const STORAGE_KEY = "selfgpt_theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("claude");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved && saved in themes) {
      applyTheme(saved);
      setThemeState(saved);
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const vars = themes[t];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    document.documentElement.setAttribute("data-theme", t);
  };

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}
