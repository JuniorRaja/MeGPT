"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatWindow } from "@/components/ChatWindow";
import { LandingModal } from "@/components/LandingModal";
import { Sidebar } from "@/components/Sidebar";
import { getSessions } from "@/lib/api";
import type { SessionRecord } from "@/lib/types";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";

const INR_PER_USD = 83.5;

function fmtCost(usd: number): string {
  const inr = usd * INR_PER_USD;
  return inr < 0.01 ? "₹0.00" : `₹${inr.toFixed(2)}`;
}

export default function HomePage() {
  const {
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
  } = useChat();
  const { mode, toggleMode } = useTheme();

  const [showModal, setShowModal] = useState(true);
  // Sessions list owned here so Sidebar remounts don't cause fetch-flicker
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const prevLoadingRef = useRef(false);

  // Initial load
  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  // Refresh sidebar after each completed (non-read-only) message so new sessions appear
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && !isReadOnly && !isIncognito) {
      getSessions().then(setSessions).catch(() => {});
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, isReadOnly, isIncognito]);

  const hasMessages = messages.length > 0 || isLoading;

  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex h-full overflow-x-hidden" style={{ background: "var(--bg)" }}>
      {showModal && <LandingModal onStart={() => setShowModal(false)} />}

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar wrapper — drawer on mobile, in-flow on desktop */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-30 transition-transform duration-200",
          "md:relative md:inset-auto md:z-auto md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar
          currentSessionId={sessionId}
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          onNewChat={newChat}
          onLoadSession={loadSession}
          allTimeCostUsd={allTimeCostUsd}
          allTimeTokens={allTimeTokens}
          onClose={() => setSidebarOpen(false)}
          mode={mode}
          onToggleMode={toggleMode}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center px-4 py-3 shrink-0 gap-3 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 rounded-lg transition-opacity hover:opacity-70 shrink-0"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setSidebarOpen(true)}
            title="Open sidebar"
          >
            <MenuIcon />
          </button>

          {/* Right-side controls */}
          <div className="flex items-center gap-3 ml-auto min-w-0">
            {/* Session stats */}
            {hasMessages && (sessionCostUsd > 0 || sessionTokens > 0) && (
              <div
                className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap"
                style={{
                  color: "var(--text-muted)",
                  background: "var(--hover-bg)",
                  border: "1px solid var(--border)",
                }}
                suppressHydrationWarning
              >
                <span>{fmtCost(sessionCostUsd)}</span>
                <span>·</span>
                <span>{sessionTokens.toLocaleString()} tok</span>
              </div>
            )}

            {/* Incognito button */}
            <button
              onClick={isIncognito ? newChat : startIncognitoChat}
              title={isIncognito ? "Exit incognito (start normal chat)" : "Start incognito chat"}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{
                color: isIncognito ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <IncognitoIcon />
            </button>
          </div>
        </header>

        {/* Incognito banner */}
        {isIncognito && (
          <div
            className="mx-4 mb-1 px-4 py-1.5 rounded-lg text-xs flex items-center gap-2"
            style={{
              background: "var(--hover-bg)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            <IncognitoIcon size={13} />
            <span>Incognito — this conversation won&apos;t appear in your history</span>
          </div>
        )}

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
          onRetry={isReadOnly ? undefined : retry}
          onNewChat={newChat}
          model={activeModel}
          onModelChange={setActiveModel}
        />

        {hasMessages && (
          <ChatInput
            onSend={send}
            onNewChat={newChat}
            disabled={isLoading}
            readOnly={isReadOnly}
            contextFull={!isReadOnly && contextPercent >= 100}
            model={activeModel}
            onModelChange={setActiveModel}
          />
        )}
      </div>
    </div>
  );
}

/* ── Menu / Hamburger SVG ──────────────────────────────────────────────────── */
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

/* ── Incognito SVG ─────────────────────────────────────────────────────────── */
function IncognitoIcon({ size = 20 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <g>
          <path d="M6.99951 8.66672C7.5518 8.66672 7.99951 9.11443 7.99951 9.66672C7.9993 10.2188 7.55166 10.6667 6.99951 10.6667C6.44736 10.6667 5.99973 10.2188 5.99951 9.66672C5.99951 9.11443 6.44723 8.66672 6.99951 8.66672Z" />
          <path d="M12.9995 8.66672C13.5518 8.66672 13.9995 9.11443 13.9995 9.66672C13.9993 10.2188 13.5517 10.6667 12.9995 10.6667C12.4474 10.6667 11.9997 10.2188 11.9995 9.66672C11.9995 9.11443 12.4472 8.66672 12.9995 8.66672Z" />
        </g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 2C14.326 2.00018 17.9998 5.67403 18 10V17.3123C17.9997 17.5427 17.8411 17.8079 17.6172 17.8623C17.3932 17.9165 17.1614 17.7456 17.0557 17.5408C16.7805 17.007 16.3658 16.5937 16.062 16.2878C15.7793 16.0034 15.4503 15.8338 14.9771 15.8337C14.2092 15.8339 13.4371 16.3862 12.9487 17.53C12.8701 17.7138 12.6887 17.8621 12.4888 17.8623C12.2888 17.8623 12.1076 17.7138 12.0288 17.53C11.5404 16.386 10.7674 15.8339 9.99951 15.8337C9.23161 15.8339 8.45959 16.386 7.97119 17.53C7.89253 17.7138 7.71118 17.8621 7.51123 17.8623C7.31122 17.8623 7.13006 17.7138 7.05127 17.53C6.56296 16.3862 5.78982 15.834 5.02197 15.8337C4.54861 15.8338 4.21974 16.0032 3.93701 16.2878C3.63309 16.5937 3.21952 17.0715 2.94434 17.6055C2.83865 17.8103 2.60589 17.9165 2.38184 17.8623C2.15801 17.8079 2.00033 17.6073 2 17.377V10C2.00018 5.67403 5.67403 2.00018 10 2ZM10 3C6.22631 3.00018 3.00018 6.22631 3 10V15.8633C3.0205 15.8414 3.20696 15.6049 3.22803 15.5837C3.67524 15.1336 4.251 14.8338 5.02197 14.8337C6.03838 14.8341 6.90232 15.4025 7.51025 16.2937C8.11828 15.4018 8.9824 14.8338 9.99951 14.8337C11.0163 14.8338 11.8798 15.4022 12.4878 16.2937C13.0959 15.4018 13.9601 14.8339 14.9771 14.8337C15.7481 14.8338 16.3247 15.1336 16.772 15.5837C16.772 15.5837 16.9796 15.812 17 15.8337V10C16.9998 6.22631 13.7737 3.00018 10 3Z"
        />
      </svg>
    </div>
  );
}
