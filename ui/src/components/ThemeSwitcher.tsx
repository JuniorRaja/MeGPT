"use client";

import type { Theme, ThemeMode } from "@/lib/types";
import { THEME_ACCENTS } from "@/styles/themes";

const THEMES: { id: Theme; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "gpt", label: "GPT" },
  { id: "grok", label: "Grok" },
];

interface Props {
  current: Theme;
  mode: ThemeMode;
  onChange: (t: Theme) => void;
  onToggleMode: () => void;
}

export function ThemeSwitcher({ current, mode, onChange, onToggleMode }: Props) {
  return (
    <div className="flex items-center gap-2">
      {/* Theme pills */}
      <div className="flex gap-1 p-1 rounded-full" style={{ background: "var(--hover-bg)" }}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all duration-150"
            style={{
              color: current === t.id ? "var(--accent)" : "var(--text-muted)",
              border: current === t.id ? "1px solid var(--accent)" : "1px solid transparent",
              background: current === t.id ? "var(--input-bg)" : "transparent",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: THEME_ACCENTS[t.id],
                opacity: current === t.id ? 1 : 0.4,
                flexShrink: 0,
              }}
            />
            {t.label}
          </button>
        ))}
      </div>

      {/* Dark/Light toggle */}
      <button
        onClick={onToggleMode}
        className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
        title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {mode === "light" ? <MoonIcon /> : <SunIcon />}
      </button>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
