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
  onRetry?: (messageId: string) => void;
}

export function ChatWindow({ messages, isLoading, onChipClick, onFeedback, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return <WelcomeScreen onChipClick={onChipClick} />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onFeedback={onFeedback} onRetry={onRetry} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
