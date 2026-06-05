"use client";

import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { sendMessage } from "@/lib/api";
import type { Message } from "@/lib/types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState<string>(() => uuidv4());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("groq");

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setError(null);

      const userMsg: Message = {
        id: uuidv4(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await sendMessage(text, sessionId, activeModel);
        const assistantMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: res.response,
          model_used: res.model_used,
          cost_usd: res.cost_usd,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, activeModel]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, sessionId, isLoading, error, send, clearMessages, activeModel, setActiveModel };
}
