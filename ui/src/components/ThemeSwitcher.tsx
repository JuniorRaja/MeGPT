"use client";

import type { Theme } from "@/lib/types";
import { THEME_ACCENTS } from "@/styles/themes";

const THEMES: { id: Theme; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "gpt", label: "GPT" },
  { id: "grok", label: "Grok" },
];

interface Props {
  current: Theme;
  onChange: (t: Theme) => void;
}

export function ThemeSwitcher({ current, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-full" style={{ background: "var(--input-bg)" }}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all duration-150"
          style={{
            color: current === t.id ? "var(--accent)" : "var(--text-muted)",
            border: current === t.id ? "1px solid var(--accent)" : "1px solid transparent",
            background: current === t.id ? "var(--bg)" : "transparent",
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
  );
}
