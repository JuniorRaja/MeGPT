"use client";

const PROMPT_CHIPS = [
  "Who is PR?",
  "What's his tech stack?",
  "What has he built?",
  "Can I schedule a call?",
];

interface Props {
  onChipClick: (text: string) => void;
}

export function WelcomeScreen({ onChipClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text)" }}>
          Hi, I&apos;m SelfGPT
        </h1>
        <p className="text-base" style={{ color: "var(--text-muted)" }}>
          A digital twin. Trained on one human — Prasanna.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onChipClick(chip)}
            className="px-4 py-3 rounded-xl text-sm text-left transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{
              background: "var(--input-bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
