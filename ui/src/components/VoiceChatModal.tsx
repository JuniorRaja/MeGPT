"use client";

import { useEffect, useRef } from "react";
import type { OrbState, VoiceMessage } from "@/hooks/useVoiceChat";
import { VoiceOrb } from "./VoiceOrb";

interface Props {
  orbState: OrbState;
  analyserNode: AnalyserNode | null;
  voiceMessages: VoiceMessage[];
  statusLabel: string;
  isRecording: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onClose: () => void;
  theme: string;
}

export function VoiceChatModal({
  orbState,
  analyserNode,
  voiceMessages,
  statusLabel,
  isRecording,
  onStartListening,
  onStopListening,
  onClose,
  theme,
}: Props) {
  void theme;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [voiceMessages]);

  const handleMicClick = () => {
    if (isRecording) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const orbSize = voiceMessages.length > 0 ? 160 : 220;
  const micDisabled = orbState === "processing";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(6,6,10,0.88)", backdropFilter: "blur(16px)" }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{
          background: "rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        aria-label="Close voice chat"
      >
        <CloseIcon />
      </button>

      {/* Conversation bubbles — grows to fill, sticks to bottom */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 pt-16 pb-3"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="flex flex-col gap-3 justify-end min-h-full">
          {voiceMessages.map((msg) => (
            <BubbleRow key={msg.id} msg={msg} orbState={orbState} />
          ))}
        </div>
      </div>

      {/* Orb + controls */}
      <div className="flex-none flex flex-col items-center gap-4 pb-10 pt-3">
        <div style={{ filter: `drop-shadow(0 0 ${orbSize / 6}px var(--accent))` }}>
          <VoiceOrb state={orbState} analyserNode={analyserNode} size={orbSize} />
        </div>

        <p
          className="text-sm font-medium tracking-wide transition-all duration-300"
          style={{ color: "rgba(255,255,255,0.4)", minHeight: "1.25rem" }}
        >
          {statusLabel}
        </p>

        <MicButton
          isRecording={isRecording}
          disabled={micDisabled}
          onClick={handleMicClick}
        />

        <p
          className="text-xs transition-opacity duration-300"
          style={{
            color: "rgba(255,255,255,0.2)",
            opacity: !isRecording && orbState === "idle" ? 1 : 0,
          }}
        >
          Auto-stops on silence
        </p>
      </div>

      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40%           { opacity: 1;   transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

/* ── Bubble row ─────────────────────────────────────────────────────────────── */

function BubbleRow({ msg, orbState }: { msg: VoiceMessage; orbState: OrbState }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      style={{ animation: "bubbleIn 0.22s ease-out both" }}
    >
      <div
        className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: "var(--accent)",
                color: "#fff",
                borderRadius: "18px 18px 4px 18px",
              }
            : {
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "18px 18px 18px 4px",
              }
        }
      >
        {msg.isStreaming && orbState !== "speaking"
          ? <TypingDots />
          : (msg.text || (msg.isStreaming ? <TypingDots /> : null))}
      </div>
    </div>
  );
}

/* ── Typing dots ────────────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <span className="flex gap-1 items-center" style={{ height: "1.1rem" }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.45)",
            display: "inline-block",
            animation: `dotBounce 1.2s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

/* ── Mic button ─────────────────────────────────────────────────────────────── */

function MicButton({
  isRecording,
  disabled,
  onClick,
}: {
  isRecording: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background: isRecording ? "#ef4444" : "var(--accent)",
        boxShadow: isRecording
          ? "0 0 0 6px rgba(239,68,68,0.22), 0 0 0 14px rgba(239,68,68,0.07)"
          : "0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)",
        color: "#fff",
      }}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {isRecording ? <StopIcon /> : <MicIcon />}
    </button>
  );
}

/* ── SVG icons ──────────────────────────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
