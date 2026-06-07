"use client";

interface Props {
  onStart: () => void;
}

export function LandingModal({ onStart }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <SparkleIcon />
          <span className="text-base font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}>
            MeGPT
          </span>
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            An AI version of <strong>Prasanna Rajendran</strong> — PM, full-stack engineer, and builder from Chennai.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Ask him about his work, stack, projects, opinions, or anything else. Answers come from a personal knowledge base, in his own voice.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Start chatting
        </button>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 40 40" fill="none" style={{ color: "var(--accent)", flexShrink: 0 }}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="20" y1="4" x2="20" y2="14" />
        <line x1="20" y1="26" x2="20" y2="36" />
        <line x1="4" y1="20" x2="14" y2="20" />
        <line x1="26" y1="20" x2="36" y2="20" />
        <line x1="8.7" y1="8.7" x2="14.5" y2="14.5" />
        <line x1="25.5" y1="25.5" x2="31.3" y2="31.3" />
        <line x1="8.7" y1="31.3" x2="14.5" y2="25.5" />
        <line x1="25.5" y1="14.5" x2="31.3" y2="8.7" />
      </g>
    </svg>
  );
}
