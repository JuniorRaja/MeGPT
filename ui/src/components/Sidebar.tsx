"use client";

interface Props {
  sessionId: string;
  onNewChat: () => void;
}

const SAMPLE_QUESTIONS = [
  "What frameworks does PR use?",
  "Where has PR worked?",
  "What's PR building right now?",
  "What does PR do for fun?",
];

export function Sidebar({ sessionId, onNewChat }: Props) {
  return (
    <aside
      className="w-64 flex flex-col h-full shrink-0"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
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

      <div className="px-3 pb-3">
        <p className="text-[11px] px-1 mb-2 font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Others asked
        </p>
        <ul className="space-y-1">
          {SAMPLE_QUESTIONS.map((q) => (
            <li
              key={q}
              className="text-xs px-2 py-1.5 rounded-lg truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {q}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto px-4 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
          Session: {sessionId.slice(0, 8)}…
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
