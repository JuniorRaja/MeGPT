"use client";

import { useState } from "react";
import type { SessionRecord } from "@/lib/types";
import { ThemeSwitcher } from "./ThemeSwitcher";
import type { Theme, ThemeMode } from "@/lib/types";
import { track } from "@/lib/tracking";

interface Props {
  currentSessionId: string;
  sessions: SessionRecord[];
  sessionsLoading: boolean;
  onNewChat: () => void;
  onLoadSession: (sessionId: string) => void;
  allTimeCostUsd: number;
  allTimeTokens: number;
  onClose?: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  mode: ThemeMode;
  onToggleMode: () => void;
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len).trimEnd() + "…" : str;
}

const INR_PER_USD = 83.5;

function fmtCost(usd: number): string {
  const inr = usd * INR_PER_USD;
  return inr < 0.01 ? "₹0.00" : `₹${inr.toFixed(2)}`;
}

export function Sidebar({ currentSessionId, sessions, sessionsLoading, onNewChat, onLoadSession, allTimeCostUsd, allTimeTokens, onClose, theme, onThemeChange, mode, onToggleMode }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside
        className="w-16 flex flex-col items-center h-full shrink-0 py-4"
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)" }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg transition-colors hover:opacity-70"
          style={{ color: "var(--text)" }}
          title="Expand sidebar"
        >
          <SidebarIcon />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="w-64 flex flex-col h-full shrink-0"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <span
          className="text-base font-semibold"
          style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}
        >
          MeGPT
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setCollapsed(true); onClose?.(); }}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
            title="Collapse sidebar"
            style={{ color: "var(--text-muted)" }}
          >
            <SidebarIcon />
          </button>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 mb-1">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors"
          style={{ color: "var(--text)", background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <PlusCircleIcon />
          New chat
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 mb-2">
        <NavItem icon={<ChatsIcon />} label="Chats" active />
        <NavItem icon={<ProjectsIcon />} label="Projects" />
        <NavItem icon={<ArtifactsIcon />} label="Artifacts" />
        <NavItem icon={<CustomizeIcon />} label="Customize" />
      </nav>

      {/* Divider */}
      <div className="px-4 my-1">
        <div style={{ height: "1px", background: "var(--border)" }} />
      </div>

      {/* Products section */}
      <div className="px-3 mt-2">
        <p
          className="text-[11px] px-3 mb-1 font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Products
        </p>
        <NavItem icon={<CodeIcon />} label="Code" />
        <NavItem icon={<CoworkIcon />} label="Cowork" />
        <NavItem icon={<DesignIcon />} label="Design" />
      </div>

      {/* Recents */}
      <div className="px-3 mt-3 flex items-center justify-between">
        <p
          className="text-[11px] px-3 font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Recents
        </p>
        <button
          className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-muted)" }}
          title="Filter"
        >
          <FilterIcon />
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 mt-1">
        {sessionsLoading ? (
          <div className="px-3 py-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Loading…
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No conversations yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((s) => {
              const isActive = s.session_id === currentSessionId;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => { track("load_session"); onLoadSession(s.session_id); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors"
                    style={{
                      color: isActive ? "var(--text)" : "var(--text-muted)",
                      background: isActive ? "var(--hover-bg)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span className="block truncate">
                      {truncate(s.title || "Untitled conversation", 30)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            P
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
              Prasanna
            </p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
              Ask me anything
            </p>
          </div>
          {/* ThemeSwitcher hidden */}
          <button
            onClick={onToggleMode}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70 shrink-0"
            style={{ color: "var(--text-muted)" }}
            title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {mode === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
        {(allTimeCostUsd > 0 || allTimeTokens > 0) && (
          <div
            className="text-[10px] px-1 flex items-center gap-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            <span>All-time:</span>
            <span>{fmtCost(allTimeCostUsd)}</span>
            <span>·</span>
            <span>{allTimeTokens.toLocaleString()} tok</span>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── Nav Item ──────────────────────────────────────────────────────────────── */
function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors"
      style={{
        color: active ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--hover-bg)" : "transparent",
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */
function SidebarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 3v18" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ChatsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ArtifactsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function CustomizeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function CoworkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DesignIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="21.17" y1="8" x2="12" y2="8" />
      <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
      <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
