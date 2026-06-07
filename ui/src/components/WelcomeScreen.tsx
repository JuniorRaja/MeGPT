"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ModelSelector } from "./ModelSelector";

const PROMPT_CHIPS = [
  { icon: "</>", label: "Code" },
  { icon: "✍️", label: "Write" },
  { icon: "🎓", label: "Learn" },
  { icon: "☕", label: "Life stuff" },
  { icon: "💬", label: "Ask anything" },
];

const VISITOR_NAMES = ["visitor", "stranger", "friend", "curious one", "wanderer"];

function getDynamicGreeting(): string {
  const now = new Date();
  const h = now.getHours();
  const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
  const name = VISITOR_NAMES[Math.floor(Math.random() * VISITOR_NAMES.length)];
  const pool: string[] = [];

  if (h < 5) {
    pool.push("Hello, night owl", `Evening, ${name}`, "Still up?");
  } else if (h < 12) {
    pool.push("Good morning", `Good morning, ${name}`);
  } else if (h < 17) {
    pool.push("Good afternoon", `Afternoon, ${name}`);
  } else if (h < 21) {
    pool.push("Good evening", `Evening, ${name}`, "What's on your mind tonight?");
  } else {
    pool.push("Good evening, night owl", `Evening, ${name}`);
  }

  pool.push(`Happy ${day}!`, `Happy ${day}, ${name}`);
  pool.push("How's it going?", "Hey there", `Hey there, ${name}`, `Back at it, ${name}`);

  return pool[Math.floor(Math.random() * pool.length)];
}

interface Props {
  onChipClick: (text: string) => void;
  model: string;
  onModelChange: (model: string) => void;
}

export function WelcomeScreen({ onChipClick, model, onModelChange }: Props) {
  const [greeting, setGreeting] = useState("");
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setGreeting(getDynamicGreeting());
  }, []);

  const chipQuestions: Record<string, string> = {
    Code: "What's Prasanna's tech stack and what has he built?",
    Write: "Tell me about Prasanna's writing and content",
    Learn: "What has Prasanna been learning recently?",
    "Life stuff": "Tell me about Prasanna outside of work",
    "Ask anything": "Who is Prasanna?",
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onChipClick(trimmed);
    setInputValue("");
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
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      {/* Greeting */}
      <div className="flex items-center gap-3 mb-8">
        <SparkleIcon />
        <h1
          className="text-4xl md:text-5xl font-light tracking-tight transition-opacity duration-300"
          style={{
            color: "var(--text)",
            fontFamily: "var(--font-heading)",
            opacity: greeting ? 1 : 0,
          }}
        >
          {greeting}
        </h1>
      </div>

      {/* Input box */}
      <div className="w-full max-w-2xl">
        <div
          className="rounded-2xl"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            boxShadow: "var(--shadow-input)",
          }}
        >
          <div className="px-5 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="How can I help you today?"
              rows={1}
              className="w-full resize-none bg-transparent text-sm outline-none leading-relaxed"
              style={{ color: "var(--text)", maxHeight: "160px" }}
            />
          </div>

          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title="Attach"
            >
              <PlusIcon />
            </button>

            <div className="flex items-center gap-2">
              <ModelSelector value={model} onChange={onModelChange} />
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ color: "var(--text-muted)" }}
                title="Voice input"
              >
                <MicIcon />
              </button>
              {inputValue.trim() ? (
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

      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => {
              const q = chipQuestions[chip.label];
              setInputValue(q);
              textareaRef.current?.focus();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.borderColor = "var(--text-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <span className="text-xs">{chip.icon}</span>
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function SparkleIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      className="animate-spin-slow"
      style={{ color: "var(--accent)" }}
    >
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="20" y1="4" x2="20" y2="14" />
        <line x1="20" y1="26" x2="20" y2="36" />
        <line x1="4" y1="20" x2="14" y2="20" />
        <line x1="26" y1="20" x2="36" y2="20" />
        <line x1="8.7" y1="8.7" x2="14.5" y2="14.5" />
        <line x1="25.5" y1="25.5" x2="31.3" y2="31.3" />
        <line x1="8.7" y1="31.3" x2="14.5" y2="25.5" />
        <line x1="25.5" y1="14.5" x2="31.3" y2="8.7" />
      </g>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
