"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getSessionMessages, getStats, streamMessage } from "@/lib/api";
import type { Message, MessageRecord } from "@/lib/types";

function recordToMessage(r: MessageRecord): Message {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    model_used: r.model_used || undefined,
    cost_usd: r.cost_usd || undefined,
    tokens_in: r.tokens_in || undefined,
    tokens_out: r.tokens_out || undefined,
    timestamp: r.created ? new Date(r.created) : new Date(),
  };
}

function sumMessages(msgs: Message[]) {
  return msgs.reduce(
    (acc, m) => ({
      cost: acc.cost + (m.cost_usd ?? 0),
      tokens: acc.tokens + (m.tokens_in ?? 0) + (m.tokens_out ?? 0),
    }),
    { cost: 0, tokens: 0 }
  );
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());
  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("auto");

  // Session-level cost / token totals
  const [sessionCostUsd, setSessionCostUsd] = useState(0);
  const [sessionTokens, setSessionTokens] = useState(0);

  // All-time totals (fetched once on mount, incremented locally after that)
  const [allTimeCostUsd, setAllTimeCostUsd] = useState(0);
  const [allTimeTokens, setAllTimeTokens] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  // Fetch all-time stats once on mount
  useEffect(() => {
    getStats()
      .then((items) => {
        const totalCost = items.reduce((s, i) => s + (i.cost_usd ?? 0), 0);
        const totalTok = items.reduce(
          (s, i) => s + (i.tokens_in ?? 0) + (i.tokens_out ?? 0),
          0
        );
        setAllTimeCostUsd(totalCost);
        setAllTimeTokens(totalTok);
      })
      .catch(() => {});
  }, []);

  const send = useCallback(
    async (text: string, voiceMode?: boolean) => {
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
          activeModel === "auto" ? undefined : activeModel,
          isIncognito,
          (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId ? { ...m, content: m.content + token } : m
              )
            );
          },
          (_sid, modelUsed, costUsd, tokensIn, tokensOut) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? { ...m, isStreaming: false, model_used: modelUsed, cost_usd: costUsd, tokens_in: tokensIn, tokens_out: tokensOut }
                  : m
              )
            );
            setSessionCostUsd((c) => c + costUsd);
            setSessionTokens((t) => t + tokensIn + tokensOut);
            setAllTimeCostUsd((c) => c + costUsd);
            setAllTimeTokens((t) => t + tokensIn + tokensOut);
            setIsLoading(false);
          },
          abortRef.current.signal,
          voiceMode,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        }
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, activeModel, isIncognito]
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setSessionId(uuidv4());
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setIsReadOnly(false);
    setIsIncognito(false);
    setSessionCostUsd(0);
    setSessionTokens(0);
  }, []);

  const startIncognitoChat = useCallback(() => {
    abortRef.current?.abort();
    setSessionId(uuidv4());
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setIsReadOnly(false);
    setIsIncognito(true);
    setSessionCostUsd(0);
    setSessionTokens(0);
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    abortRef.current?.abort();
    setIsLoading(true);
    setError(null);
    try {
      const records = await getSessionMessages(sid);
      const msgs = records.map(recordToMessage);
      setSessionId(sid);
      setMessages(msgs);
      setIsReadOnly(true);
      setIsIncognito(false);
      // Compute session totals from loaded messages
      const { cost, tokens } = sumMessages(msgs);
      setSessionCostUsd(cost);
      setSessionTokens(tokens);
    } catch {
      setError("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(
    (messageId: string) => {
      if (isLoading || isReadOnly) return;
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx <= 0) return;
      let userMsg: Message | undefined;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user") { userMsg = messages[i]; break; }
      }
      if (!userMsg) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
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
        activeModel === "auto" ? undefined : activeModel,
        isIncognito,
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: m.content + token } : m
            )
          );
        },
        (_sid, modelUsed, costUsd, tokensIn, tokensOut) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? { ...m, isStreaming: false, model_used: modelUsed, cost_usd: costUsd, tokens_in: tokensIn, tokens_out: tokensOut }
                : m
            )
          );
          setSessionCostUsd((c) => c + costUsd);
          setSessionTokens((t) => t + tokensIn + tokensOut);
          setAllTimeCostUsd((c) => c + costUsd);
          setAllTimeTokens((t) => t + tokensIn + tokensOut);
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
    [isLoading, isReadOnly, messages, sessionId, activeModel, isIncognito]
  );

  const MAX_CONTEXT_TOKENS = 25_000;
  const contextPercent = Math.min(100, Math.round((sessionTokens / MAX_CONTEXT_TOKENS) * 100));

  return {
    messages,
    sessionId,
    isLoading,
    isReadOnly,
    isIncognito,
    error,
    send,
    retry,
    newChat,
    startIncognitoChat,
    loadSession,
    activeModel,
    setActiveModel,
    sessionCostUsd,
    sessionTokens,
    allTimeCostUsd,
    allTimeTokens,
    contextPercent,
  };
}
