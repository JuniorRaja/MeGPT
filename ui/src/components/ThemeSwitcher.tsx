"use client";

import type { Theme } from "@/lib/types";

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
          className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-150"
          style={{
            color: current === t.id ? "var(--accent)" : "var(--text-muted)",
            border: current === t.id ? "1px solid var(--accent)" : "1px solid transparent",
            background: current === t.id ? "var(--bg)" : "transparent",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
