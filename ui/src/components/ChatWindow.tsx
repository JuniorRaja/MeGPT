"use client";

import { type ReactElement, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import type { Message } from "@/lib/types";

const MAX_CONTEXT_TOKENS = 25_000;

interface Props {
  messages: Message[];
  isLoading: boolean;
  onChipClick: (text: string) => void;
  onVoiceClick?: () => void;
  onFeedback?: (messageId: string, rating: 1 | -1, question?: string, answer?: string) => void;
  onRetry?: (messageId: string) => void;
  onNewChat: () => void;
  model: string;
  onModelChange: (model: string) => void;
}

export function ChatWindow({ messages, isLoading, onChipClick, onVoiceClick, onFeedback, onRetry, onNewChat, model, onModelChange }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return <WelcomeScreen onChipClick={onChipClick} onVoiceClick={onVoiceClick} model={model} onModelChange={onModelChange} />;
  }

  // Compute where context milestones fall in the message stream
  const MILESTONES = [
    { pct: 50, level: "half" as const },
    { pct: 75, level: "warning" as const },
    { pct: 90, level: "critical" as const },
  ];
  let runningTokens = 0;
  const fired = new Set<number>();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-2">
        {messages.map((msg, idx) => {
          const msgTokens = (msg.tokens_in ?? 0) + (msg.tokens_out ?? 0);
          runningTokens += msgTokens;
          const pct = Math.min(100, Math.round((runningTokens / MAX_CONTEXT_TOKENS) * 100));

          const markers: ReactElement[] = [];
          for (const m of MILESTONES) {
            if (pct >= m.pct && !fired.has(m.pct) && msgTokens > 0) {
              fired.add(m.pct);
              markers.push(
                <ContextMarker key={`ctx-${m.pct}`} level={m.level} pct={pct} onNewChat={onNewChat} />
              );
            }
          }

          // Find the preceding user message to attach as context for feedback
          let precedingQuestion: string | undefined;
          if (msg.role === "assistant") {
            for (let i = idx - 1; i >= 0; i--) {
              if (messages[i].role === "user") { precedingQuestion = messages[i].content; break; }
            }
          }

          return (
            <div key={msg.id}>
              <MessageBubble message={msg} question={precedingQuestion} onFeedback={onFeedback} onRetry={onRetry} />
              {markers}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/* ── Context milestone markers ─────────────────────────────────────────────── */

type MarkerLevel = "half" | "warning" | "critical";

function ContextMarker({ level, pct, onNewChat }: { level: MarkerLevel; pct: number; onNewChat: () => void }) {
  if (level === "half") {
    return (
      <div className="flex items-center gap-3 my-4 px-1" aria-hidden="true">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
          halfway through context
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  if (level === "warning") {
    return (
      <div className="flex items-center gap-3 my-4 px-1">
        <div className="flex-1 h-px" style={{ background: "#f59e0b44" }} />
        <span className="text-[11px] shrink-0" style={{ color: "#f59e0b" }}>
          {pct}% · long conversation — starting fresh gives sharper answers
        </span>
        <div className="flex-1 h-px" style={{ background: "#f59e0b44" }} />
      </div>
    );
  }

  // critical
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl my-4 text-sm"
      style={{
        background: "var(--hover-bg)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid #f97316",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <WarnIcon />
        <div>
          <p className="font-medium text-xs" style={{ color: "var(--text)" }}>
            Context almost full ({pct}%)
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Responses may lose earlier context — a new chat starts fresh
          </p>
        </div>
      </div>
      <button
        onClick={onNewChat}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{ background: "#f97316", color: "#fff" }}
      >
        New chat →
      </button>
    </div>
  );
}

function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
