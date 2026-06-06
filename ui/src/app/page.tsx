"use client";

import { useCallback } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatWindow } from "@/components/ChatWindow";
import { Sidebar } from "@/components/Sidebar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";

export default function HomePage() {
  const { messages, sessionId, isLoading, error, send, newChat, loadSession } = useChat();
  const { theme, setTheme } = useTheme();

  const handleFeedback = useCallback(
    async (messageId: string, rating: 1 | -1) => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/feedback/${messageId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating }),
          }
        );
      } catch {
        // feedback is best-effort
      }
    },
    []
  );

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      <Sidebar
        currentSessionId={sessionId}
        onNewChat={newChat}
        onLoadSession={loadSession}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {messages.length === 0 ? "New conversation" : "SelfGPT"}
          </span>
          <ThemeSwitcher current={theme} onChange={setTheme} />
        </header>

        {error && (
          <div
            className="mx-4 mt-3 px-4 py-2 rounded-lg text-sm"
            style={{ background: "#3a1a1a", color: "#ff7070", border: "1px solid #5a2020" }}
          >
            {error}
          </div>
        )}

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onChipClick={send}
          onFeedback={handleFeedback}
        />

        <ChatInput onSend={send} disabled={isLoading} />
      </div>
    </div>
  );
}
