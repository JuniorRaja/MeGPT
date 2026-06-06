"use client";

import { type KeyboardEvent, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            boxShadow: "var(--shadow-input)",
          }}
        >
          {/* Textarea area */}
          <div className="px-5 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Reply to SelfGPT..."
              rows={1}
              disabled={disabled}
              className="w-full resize-none bg-transparent text-sm outline-none leading-relaxed"
              style={{ color: "var(--text)", maxHeight: "200px" }}
            />
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            {/* Left: + button */}
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title="Attach"
            >
              <PlusIcon />
            </button>

            {/* Right: model selector + mic + voice mode OR send */}
            <div className="flex items-center gap-2">
              <ModelSelector />
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ color: "var(--text-muted)" }}
                title="Voice input"
              >
                <MicIcon />
              </button>
              {disabled ? (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--border)" }}
                >
                  <LoadingDots />
                </div>
              ) : value.trim() ? (
                <button
                  onClick={handleSend}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{ background: "var(--accent)", color: "#ffffff" }}
                >
                  <SendIcon />
                </button>
              ) : (
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                  title="Voice mode"
                >
                  <VoiceModeIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function ModelSelector() {
  return (
    <button
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-opacity hover:opacity-70"
      style={{ color: "var(--text-muted)" }}
      title="Model selector"
    >
      <span className="font-medium" style={{ color: "var(--text)" }}>SelfGPT</span>
      <span>Auto</span>
      <ChevronDownIcon />
    </button>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function VoiceModeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="4" y1="8" x2="4" y2="16" />
      <line x1="8" y1="5" x2="8" y2="19" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="16" y1="5" x2="16" y2="19" />
      <line x1="20" y1="8" x2="20" y2="16" />
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

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function LoadingDots() {
  return (
    <svg width="20" height="6" viewBox="0 0 20 6" style={{ color: "var(--text-muted)" }}>
      <circle cx="3" cy="3" r="2" fill="currentColor" opacity="0.4">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" begin="0s" />
      </circle>
      <circle cx="10" cy="3" r="2" fill="currentColor" opacity="0.4">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" begin="0.2s" />
      </circle>
      <circle cx="17" cy="3" r="2" fill="currentColor" opacity="0.4">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
      </circle>
    </svg>
  );
}
