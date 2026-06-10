"use client";

import { useEffect, useRef } from "react";
import type { OrbState } from "@/hooks/useVoiceChat";

interface Props {
  state: OrbState;
  analyserNode: AnalyserNode | null;
  size?: number;
}

export function VoiceOrb({ state, analyserNode, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const BASE_R = size * 0.27;
    const MAX_AMP = size * 0.1;
    const IDLE_AMP = size * 0.02;
    const N = 80;
    const startTime = performance.now();

    function getAccent(): string {
      return getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#888888";
    }

    function drawFrame(now: number) {
      const t = (now - startTime) / 1000;
      ctx.clearRect(0, 0, size, size);

      const accent = getAccent();
      const freqData = new Uint8Array(analyserNode ? analyserNode.frequencyBinCount : 0);
      if (analyserNode) analyserNode.getByteFrequencyData(freqData);

      const pts: [number, number][] = [];

      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
        let disp = 0;

        if (state === "idle") {
          disp =
            Math.sin(t * 0.9 + i * 0.5) * IDLE_AMP +
            Math.sin(t * 1.4 + i * 0.25) * IDLE_AMP * 0.4;
        } else if (state === "processing") {
          disp =
            Math.sin(t * 2.4 + i * 0.45) * IDLE_AMP * 2.0 +
            Math.abs(Math.sin(t * 0.8)) * IDLE_AMP;
        } else if (freqData.length > 0) {
          // listening or speaking — driven by actual audio frequency
          const freqIdx = Math.floor((i / N) * freqData.length * 0.55);
          const amp = freqData[freqIdx] / 255;
          disp = amp * MAX_AMP * 1.5;
          disp += Math.sin(t * 1.1 + i * 0.4) * IDLE_AMP * 0.4;
        } else {
          // listening/speaking but no data yet — fall back to idle motion
          disp = Math.sin(t * 1.0 + i * 0.5) * IDLE_AMP;
        }

        const r = BASE_R + disp;
        pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }

      // Draw smooth closed blob via quadratic bezier midpoints
      ctx.beginPath();
      const mx0 = (pts[0][0] + pts[N - 1][0]) / 2;
      const my0 = (pts[0][1] + pts[N - 1][1]) / 2;
      ctx.moveTo(mx0, my0);
      for (let i = 0; i < N; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % N];
        ctx.quadraticCurveTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
      }
      ctx.closePath();

      // Glow layer
      ctx.save();
      ctx.shadowBlur = state === "idle" ? 14 : 30;
      ctx.shadowColor = accent;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();

      // Highlight — soft white radial from top-left inside blob
      const highlight = ctx.createRadialGradient(
        cx - BASE_R * 0.22,
        cy - BASE_R * 0.22,
        0,
        cx,
        cy,
        BASE_R * 1.1
      );
      highlight.addColorStop(0, "rgba(255,255,255,0.22)");
      highlight.addColorStop(0.5, "rgba(255,255,255,0.06)");
      highlight.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = highlight;
      ctx.fill();

      // Processing: rotating spinner arc outside blob
      if (state === "processing") {
        const spinStart = (t * 2.8) % (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, BASE_R * 1.38, spinStart, spinStart + Math.PI * 1.35);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.55;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state, analyserNode, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
