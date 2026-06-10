"use client";

import type { OrbState } from "@/hooks/useVoiceChat";
import { VoiceOrb } from "./VoiceOrb";

interface Props {
  orbState: OrbState;
  analyserNode: AnalyserNode | null;
  liveTranscript: string;
  assistantText: string;
  isRecording: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onClose: () => void;
  theme: string;
}

export function VoiceChatModal({
  orbState,
  analyserNode,
  liveTranscript,
  assistantText,
  isRecording,
  onStartListening,
  onStopListening,
  onClose,
  theme,
}: Props) {
  void theme; // theme drives CSS vars globally; no explicit use needed here

  const handleMicToggle = () => {
    if (isRecording) {
      onStopListening();
    } else if (orbState === "idle") {
      onStartListening();
    }
  };

  const stateLabel: Record<OrbState, string> = {
    idle: "Tap to speak",
    listening: "Listening…",
    processing: "Thinking…",
    speaking: "Speaking…",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ background: "var(--hover-bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        aria-label="Close voice mode"
      >
        <CloseIcon />
      </button>

      {/* Orb */}
      <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
        <div style={{ filter: "drop-shadow(0 0 24px var(--accent))" }}>
          <VoiceOrb state={orbState} analyserNode={analyserNode} size={240} />
        </div>

        {/* State label */}
        <p
          className="text-sm font-medium tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {stateLabel[orbState]}
        </p>

        {/* User transcript */}
        {liveTranscript && (
          <div
            className="w-full px-4 py-3 rounded-xl text-sm text-center"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block", marginBottom: "4px" }}>
              YOU
            </span>
            {liveTranscript}
          </div>
        )}

        {/* AI response text */}
        {assistantText && (
          <div
            className="w-full px-4 py-3 rounded-xl text-sm max-h-36 overflow-y-auto"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <span style={{ color: "var(--accent)", fontSize: "0.7rem", display: "block", marginBottom: "4px" }}>
              MEGPT
            </span>
            {assistantText}
          </div>
        )}

        {/* Mic button */}
        <button
          onClick={handleMicToggle}
          disabled={orbState === "processing" || orbState === "speaking"}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isRecording ? "#ef4444" : "var(--accent)",
            boxShadow: isRecording
              ? "0 0 0 6px rgba(239,68,68,0.25), 0 0 0 12px rgba(239,68,68,0.1)"
              : "0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)",
            color: "#fff",
          }}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <StopIcon /> : <MicIcon />}
        </button>
      </div>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
