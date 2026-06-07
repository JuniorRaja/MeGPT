"use client";

import { useCallback, useEffect, useState } from "react";
import type { Theme, ThemeMode } from "@/lib/types";
import { themes } from "@/styles/themes";

const THEME_KEY = "megpt_theme";
const MODE_KEY = "megpt_mode";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("claude");
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const savedMode = localStorage.getItem(MODE_KEY) as ThemeMode | null;
    const t = savedTheme && savedTheme in themes ? savedTheme : "claude";
    const m = savedMode === "dark" || savedMode === "light" ? savedMode : "light";
    applyTheme(t, m);
    setThemeState(t);
    setModeState(m);
  }, []);

  const applyTheme = (t: Theme, m: ThemeMode) => {
    const vars = themes[t][m];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    root.setAttribute("data-theme", t);
    root.setAttribute("data-mode", m);
  };

  const setTheme = useCallback(
    (t: Theme) => {
      applyTheme(t, mode);
      localStorage.setItem(THEME_KEY, t);
      setThemeState(t);
    },
    [mode]
  );

  const setMode = useCallback(
    (m: ThemeMode) => {
      applyTheme(theme, m);
      localStorage.setItem(MODE_KEY, m);
      setModeState(m);
    },
    [theme]
  );

  const toggleMode = useCallback(() => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
  }, [mode, setMode]);

  return { theme, mode, setTheme, setMode, toggleMode };
}
