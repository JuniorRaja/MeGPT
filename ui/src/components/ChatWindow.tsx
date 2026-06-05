"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import type { Message } from "@/lib/types";

interface Props {
  messages: Message[];
  isLoading: boolean;
  onChipClick: (text: string) => void;
  onFeedback?: (messageId: string, rating: 1 | -1) => void;
}

export function ChatWindow({ messages, isLoading, onChipClick, onFeedback }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return <WelcomeScreen onChipClick={onChipClick} />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onFeedback={onFeedback} />
      ))}
      {isLoading && (
        <div className="flex gap-1 items-center py-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background: "var(--text-muted)",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
