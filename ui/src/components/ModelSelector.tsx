"use client";

import { useEffect, useRef, useState } from "react";

interface ModelOption {
  id: string;
  label: string;
  badge?: string;
  locked?: boolean;
}

const MODELS: ModelOption[] = [
  { id: "auto", label: "SelfGPT", badge: "Auto" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
  { id: "qwen/qwen3-32b", label: "Qwen3 32B" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", locked: true },
  { id: "claude-sonnet-4-5-20251001", label: "Claude Sonnet 4.5", locked: true },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", badge: "Fast" },
];

interface Props {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAuto = value === "auto";
  const selected = MODELS.find((m) => m.id === value) ?? MODELS[0];

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
        title="Select model"
      >
        <span className="font-medium" style={{ color: "var(--text)" }}>
          {isAuto ? "SelfGPT" : selected.label}
        </span>
        <span>{isAuto ? "Auto" : "·"}</span>
        <ChevronDownIcon />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 z-50 rounded-xl overflow-hidden"
          style={{
            minWidth: "220px",
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {/* Auto row */}
          <button
            onClick={() => { onChange("auto"); setOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors"
            style={{
              background: isAuto ? "var(--hover-bg)" : "transparent",
              color: "var(--text)",
              borderBottom: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => { if (!isAuto) e.currentTarget.style.background = "var(--hover-bg)"; }}
            onMouseLeave={(e) => { if (!isAuto) e.currentTarget.style.background = "transparent"; }}
          >
            <span className="font-medium">SelfGPT Auto</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              style={{
                background: isAuto ? "var(--accent)" : "var(--border)",
                color: isAuto ? "#fff" : "var(--text-muted)",
              }}
            >
              {isAuto ? "ON" : "OFF"}
            </span>
          </button>

          {/* Model rows */}
          <div className="py-1">
            {MODELS.slice(1).map((m) => {
              const isSelected = !isAuto && value === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { if (!m.locked) { onChange(m.id); setOpen(false); } }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors"
                  style={{
                    color: m.locked ? "var(--text-muted)" : "var(--text)",
                    opacity: m.locked ? 0.5 : 1,
                    background: isSelected ? "var(--hover-bg)" : "transparent",
                    cursor: m.locked ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => { if (!m.locked && !isSelected) e.currentTarget.style.background = "var(--hover-bg)"; }}
                  onMouseLeave={(e) => { if (!m.locked && !isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex items-center gap-1.5">
                    {m.locked && <LockIcon />}
                    <span>{m.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {m.badge && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md"
                        style={{ background: "var(--border)", color: "var(--text-muted)" }}
                      >
                        {m.badge}
                      </span>
                    )}
                    {isSelected && <CheckmarkIcon />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
