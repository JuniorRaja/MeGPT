"use client";

import { useCallback, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getSessionMessages, streamMessage } from "@/lib/api";
import type { Message, MessageRecord } from "@/lib/types";

function recordToMessage(r: MessageRecord): Message {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    model_used: r.model_used || undefined,
    cost_usd: r.cost_usd || undefined,
    timestamp: r.created ? new Date(r.created) : new Date(),
  };
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("selfgpt-free");
  const abortRef = useRef<AbortController | null>(null);

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

      const streamingId = uuidv4();
      setMessages((prev) => [
        ...prev,
        { id: streamingId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true },
      ]);

      abortRef.current = new AbortController();

      try {
        await streamMessage(
          text,
          sessionId,
          activeModel,
          (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId ? { ...m, content: m.content + token } : m
              )
            );
          },
          (_sid, modelUsed, costUsd) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? { ...m, isStreaming: false, model_used: modelUsed, cost_usd: costUsd }
                  : m
              )
            );
            setIsLoading(false);
          },
          abortRef.current.signal
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        }
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, activeModel]
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setSessionId(uuidv4());
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    abortRef.current?.abort();
    setIsLoading(true);
    setError(null);
    try {
      const records = await getSessionMessages(sid);
      setSessionId(sid);
      setMessages(records.map(recordToMessage));
    } catch {
      setError("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(
    (messageId: string) => {
      if (isLoading) return;
      // Find the user message that preceded this assistant message
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx <= 0) return;
      // Walk backward to find the last user message before this assistant message
      let userMsg: Message | undefined;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userMsg = messages[i];
          break;
        }
      }
      if (!userMsg) return;
      // Remove the assistant message being retried
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      // Re-send (send will add the streaming message)
      setError(null);
      setIsLoading(true);

      const streamingId = uuidv4();
      setMessages((prev) => [
        ...prev,
        { id: streamingId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true },
      ]);

      abortRef.current = new AbortController();

      streamMessage(
        userMsg.content,
        sessionId,
        activeModel,
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: m.content + token } : m
            )
          );
        },
        (_sid, modelUsed, costUsd) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? { ...m, isStreaming: false, model_used: modelUsed, cost_usd: costUsd }
                : m
            )
          );
          setIsLoading(false);
        },
        abortRef.current.signal
      ).catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        }
        setIsLoading(false);
      });
    },
    [isLoading, messages, sessionId, activeModel]
  );

  return {
    messages,
    sessionId,
    isLoading,
    error,
    send,
    retry,
    newChat,
    loadSession,
    activeModel,
    setActiveModel,
  };
}
