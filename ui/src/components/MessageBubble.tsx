"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FeedbackButtons } from "./FeedbackButtons";
import type { Message } from "@/lib/types";

interface Props {
  message: Message;
  onFeedback?: (messageId: string, rating: 1 | -1) => void;
  onRetry?: (messageId: string) => void;
}

const INR_PER_USD = 83.5;

function formatCost(usd: number): string {
  const inr = usd * INR_PER_USD;
  return inr < 0.01 ? "₹0.00" : `₹${inr.toFixed(2)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function modelShortName(model: string): string {
  if (model.includes("llama-4-scout")) return "Llama 4 Scout";
  if (model.includes("llama-3.3-70b")) return "Llama 3.3 70B";
  if (model.includes("llama-3.1-8b")) return "Llama 3.1 8B";
  if (model.includes("qwen3-32b")) return "Qwen3 32B";
  if (model.includes("allam-2-7b")) return "Allam 2 7B";
  if (model.includes("haiku")) return "Claude Haiku";
  if (model.includes("sonnet")) return "Claude Sonnet";
  if (model.includes("claude")) return "Claude";
  return model.split("/").pop() ?? model;
}

interface ParsedContent {
  thinking: string;
  thinkingDone: boolean;
  response: string;
}

function parseThinking(content: string): ParsedContent {
  if (content.startsWith("<think")) {
    const closeIdx = content.indexOf("</think>");
    if (closeIdx !== -1) {
      return {
        thinking: content.slice("<think>".length, closeIdx).trim(),
        thinkingDone: true,
        response: content.slice(closeIdx + "</think>".length).trimStart(),
      };
    }
    return {
      thinking: content.startsWith("<think>") ? content.slice("<think>".length) : "",
      thinkingDone: false,
      response: "",
    };
  }
  return { thinking: "", thinkingDone: true, response: content };
}

export function MessageBubble({ message, onFeedback, onRetry }: Props) {
  const [copied, setCopied] = useState(false);
  const [thinkExpanded, setThinkExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied
    }
  };

  const totalTokens = (message.tokens_in ?? 0) + (message.tokens_out ?? 0);
  const { thinking, thinkingDone, response } = parseThinking(message.content);
  const hasThinking = thinking.length > 0;

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end mb-5">
        <div
          className="max-w-[70%] px-4 py-3 text-sm leading-relaxed"
          style={{
            background: "var(--bubble-user)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-bubble)",
          }}
        >
          {message.content}
        </div>
        <span
          className="text-[10px] mt-1 mr-1"
          style={{ color: "var(--text-muted)" }}
          suppressHydrationWarning
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6 max-w-[85%]">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--accent)" }}
      >
        <SparkleSmall />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Thinking section */}
        {hasThinking && (
          thinkingDone ? (
            <div className="mb-3">
              <button
                onClick={() => setThinkExpanded((x) => !x)}
                className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80 mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                <BrainIcon />
                <span>Thought for a moment</span>
                <ChevronIcon expanded={thinkExpanded} />
              </button>
              {thinkExpanded && (
                <div
                  className="text-xs leading-relaxed pl-3 whitespace-pre-wrap"
                  style={{
                    color: "var(--text-muted)",
                    borderLeft: "2px solid var(--border)",
                    fontStyle: "italic",
                  }}
                >
                  {thinking}
                </div>
              )}
            </div>
          ) : (
            /* Still streaming inside <think> */
            <div className="mb-3">
              <div
                className="flex items-center gap-1.5 text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                <BrainIcon />
                <span>Thinking…</span>
                <span className="streaming-cursor" aria-hidden="true" />
              </div>
              <div
                className="text-xs leading-relaxed pl-3 whitespace-pre-wrap"
                style={{
                  color: "var(--text-muted)",
                  borderLeft: "2px solid var(--border)",
                  fontStyle: "italic",
                  maxHeight: "8rem",
                  overflowY: "auto",
                }}
              >
                {thinking}
              </div>
            </div>
          )
        )}

        <div
          className="text-sm leading-relaxed prose-sm"
          style={{ color: "var(--text)" }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code
                    className={className}
                    style={{
                      display: "block",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: "var(--hover-bg)",
                      border: "1px solid var(--border)",
                      fontSize: "0.8rem",
                      overflowX: "auto",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    style={{
                      padding: "0.15em 0.4em",
                      borderRadius: "4px",
                      background: "var(--hover-bg)",
                      fontSize: "0.85em",
                    }}
                  >
                    {children}
                  </code>
                );
              },
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
            }}
          >
            {response}
          </ReactMarkdown>
          {message.isStreaming && thinkingDone && (
            <span className="streaming-cursor" aria-hidden="true" />
          )}
        </div>

        {/* Action bar — timestamp, copy, retry, feedback, model info */}
        {!message.isStreaming && (
          <div
            className="flex items-center gap-1 mt-2.5"
            style={{ color: "var(--text-muted)" }}
          >
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
              title={copied ? "Copied!" : "Copy response"}
              style={{ color: copied ? "var(--accent)" : "var(--text-muted)" }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>

            {/* Retry button */}
            {onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                title="Retry"
                style={{ color: "var(--text-muted)" }}
              >
                <RetryIcon />
              </button>
            )}

            {/* Feedback */}
            <FeedbackButtons
              messageId={message.id}
              onFeedback={onFeedback ? (r) => onFeedback(message.id, r) : undefined}
            />

            {/* Timestamp + model + cost + tokens */}
            <span className="text-[11px] ml-1 flex items-center gap-1" suppressHydrationWarning>
              <span>{formatTime(message.timestamp)}</span>
              <span>·</span>
              <span>via {message.model_used ? modelShortName(message.model_used) : "auto"}</span>
              <span>·</span>
              <span>{formatCost(message.cost_usd ?? 0)}</span>
              {totalTokens > 0 && (
                <>
                  <span>·</span>
                  <span>{totalTokens.toLocaleString()} tok</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function SparkleSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9.5 2a2.5 2.5 0 0 1 5 0v.5" />
      <path d="M2 9.5a2.5 2.5 0 0 1 0 5H2.5" />
      <path d="M21.5 9.5a2.5 2.5 0 0 0 0 5H21" />
      <path d="M12 21.5a2.5 2.5 0 0 1-5 0V21" />
      <rect x="6" y="6" width="12" height="12" rx="3" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
