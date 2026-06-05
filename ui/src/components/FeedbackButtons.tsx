"use client";

import { useState } from "react";

interface Props {
  messageId: string;
  onFeedback?: (rating: 1 | -1) => void;
}

export function FeedbackButtons({ messageId, onFeedback }: Props) {
  const [voted, setVoted] = useState<1 | -1 | null>(null);

  const handleVote = (rating: 1 | -1) => {
    if (voted !== null) return;
    setVoted(rating);
    onFeedback?.(rating);
  };

  return (
    <div className="flex gap-2 mt-1">
      <button
        onClick={() => handleVote(1)}
        title="Good response"
        className="transition-opacity"
        style={{
          opacity: voted === null || voted === 1 ? 1 : 0.3,
          color: voted === 1 ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        <ThumbUp />
      </button>
      <button
        onClick={() => handleVote(-1)}
        title="Bad response"
        className="transition-opacity"
        style={{
          opacity: voted === null || voted === -1 ? 1 : 0.3,
          color: voted === -1 ? "#e05555" : "var(--text-muted)",
        }}
      >
        <ThumbDown />
      </button>
    </div>
  );
}

function ThumbUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}
