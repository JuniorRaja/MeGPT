"use client";

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
          className="max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: "var(--bubble-user)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-6 max-w-[80%]">
      <div
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: "var(--text)" }}
      >
        {message.content}
      </div>
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
    </div>
  );
}
