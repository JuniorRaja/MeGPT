"use client";

import { useEffect, useState } from "react";
import { getSessions } from "@/lib/api";
import type { SessionRecord } from "@/lib/types";

interface Props {
  currentSessionId: string;
  onNewChat: () => void;
  onLoadSession: (sessionId: string) => void;
}

type DateBucket = "Recent" | "Older";

function groupSessions(sessions: SessionRecord[]): [DateBucket, SessionRecord[]][] {
  if (sessions.length === 0) return [];
  const recent = sessions.slice(0, 5);
  const older = sessions.slice(5);
  const result: [DateBucket, SessionRecord[]][] = [["Recent", recent]];
  if (older.length > 0) result.push(["Older", older]);
  return result;
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len).trimEnd() + "…" : str;
}

export function Sidebar({ currentSessionId, onNewChat, onLoadSession }: Props) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [currentSessionId]);

  const grouped = groupSessions(sessions);

  return (
    <aside
      className="w-64 flex flex-col h-full shrink-0"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}
        >
          SelfGPT
        </span>
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
          title="New chat"
          style={{ color: "var(--text-muted)" }}
        >
          <PencilIcon />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80"
          style={{
            color: "var(--accent)",
            border: "1px solid var(--accent)",
            background: "transparent",
          }}
        >
          <PlusIcon />
          New conversation
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="px-2 py-4">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Loading…
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-2 py-4">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              No past conversations yet.
            </p>
          </div>
        ) : (
          grouped.map(([bucket, items]) => (
            <div key={bucket} className="mb-3">
              <p
                className="text-[10px] px-2 mb-1 font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {bucket}
              </p>
              <ul className="space-y-0.5">
                {items.map((s) => {
                  const isActive = s.session_id === currentSessionId;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => onLoadSession(s.session_id)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all duration-100"
                        style={{
                          color: isActive ? "var(--accent)" : "var(--text-muted)",
                          background: isActive ? "var(--input-bg)" : "transparent",
                          borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                        }}
                      >
                        <span className="block truncate">
                          {truncate(s.title || "Untitled conversation", 38)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }} suppressHydrationWarning>
          Session: {currentSessionId.slice(0, 8)}…
        </p>
      </div>
    </aside>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
