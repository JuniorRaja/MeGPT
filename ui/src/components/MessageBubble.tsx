"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FeedbackButtons } from "./FeedbackButtons";
import type { Message } from "@/lib/types";

interface Props {
  message: Message;
  onFeedback?: (messageId: string, rating: 1 | -1) => void;
}

const INR_PER_USD = 83.5;

function formatCost(usd: number): string {
  const inr = usd * INR_PER_USD;
  return inr < 0.01 ? "₹0.00" : `₹${inr.toFixed(2)}`;
}

function modelShortName(model: string): string {
  if (model.includes("llama")) return "groq";
  if (model.includes("claude")) return "claude";
  if (model.includes("gpt-4o")) return "gpt-4o";
  return model.split("/").pop() ?? model;
}

export function MessageBubble({ message, onFeedback }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-6 max-w-[82%]">
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
                    borderRadius: "6px",
                    background: "var(--input-bg)",
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
                    padding: "0.1em 0.3em",
                    borderRadius: "3px",
                    background: "var(--input-bg)",
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
          {message.content}
        </ReactMarkdown>
        {message.isStreaming && (
          <span className="streaming-cursor" aria-hidden="true" />
        )}
      </div>
      {!message.isStreaming && (
        <div
          className="flex items-center gap-3 mt-2"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-[11px]">
            via {message.model_used ? modelShortName(message.model_used) : "groq"} •{" "}
            {formatCost(message.cost_usd ?? 0)}
          </span>
          <FeedbackButtons
            messageId={message.id}
            onFeedback={onFeedback ? (r) => onFeedback(message.id, r) : undefined}
          />
        </div>
      )}
    </div>
  );
}
