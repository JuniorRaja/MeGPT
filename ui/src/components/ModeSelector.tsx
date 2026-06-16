"use client";

export type ChatMode = "natural" | "professional" | "chill" | "flirty";

const MODES: { id: ChatMode; label: string }[] = [
  { id: "natural", label: "Natural" },
  { id: "professional", label: "Professional" },
  { id: "chill", label: "Chill" },
  { id: "flirty", label: "Flirty" },
];

interface Props {
  value: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 px-5 pt-3 pb-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 select-none"
          style={{
            background: value === m.id ? "var(--accent)" : "var(--hover-bg)",
            color: value === m.id ? "#fff" : "var(--text-muted)",
            border: `1px solid ${value === m.id ? "var(--accent)" : "var(--border)"}`,
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
