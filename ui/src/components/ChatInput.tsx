"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { ModelSelector } from "./ModelSelector";

interface Props {
  onSend: (text: string) => void;
  onNewChat: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  contextFull?: boolean;
  model: string;
  onModelChange: (model: string) => void;
}

export function ChatInput({ onSend, onNewChat, disabled, readOnly, contextFull, model, onModelChange }: Props) {
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

  if (contextFull) {
    return (
      <div className="px-4 pb-5 pt-2">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl flex items-center justify-between px-5 py-3"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              borderTop: "2px solid #ef4444",
            }}
          >
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <ContextFullIcon />
              <span>Context limit reached — start a new chat to continue</span>
            </div>
            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              <PlusIcon size={14} />
              New chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="px-4 pb-5 pt-2">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl flex items-center justify-between px-5 py-3"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              borderTop: "2px solid var(--accent)",
            }}
          >
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <LockIcon />
              <span>Past conversation — read only</span>
            </div>
            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <PlusIcon size={14} />
              New chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-2xl"
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

            {/* Right: model selector + mic + send */}
            <div className="flex items-center gap-2">
              <ModelSelector value={model} onChange={onModelChange} />
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

/* ── Icons ────────────────────────────────────────────────────────────────── */

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ContextFullIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
