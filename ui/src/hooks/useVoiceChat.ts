"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech, transcribeAudio } from "@/lib/api";

export type OrbState = "idle" | "listening" | "processing" | "speaking";

export function useVoiceChat(
  send: (text: string) => void,
  streamingText: string,
  isStreaming: boolean,
) {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const processedSentencesRef = useRef(0);
  const isVoiceActiveRef = useRef(false);
  const streamingTextRef = useRef("");
  const prevStreamingRef = useRef(false);

  // Keep refs in sync
  isVoiceActiveRef.current = isVoiceActive;
  streamingTextRef.current = streamingText;

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  const playNext = useCallback(() => {
    if (!audioQueueRef.current.length) {
      isPlayingRef.current = false;
      setOrbState("idle");
      setAnalyserNode(null);
      return;
    }

    const url = audioQueueRef.current.shift()!;
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    currentAudioRef.current = audio;

    const ctx = getAudioCtx();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    setAnalyserNode(analyser);
    setOrbState("speaking");
    isPlayingRef.current = true;

    const advance = () => {
      URL.revokeObjectURL(url);
      playNext();
    };
    audio.onended = advance;
    audio.onerror = advance;
    audio.play().catch(advance);
  }, []); // stable — only uses refs and setters

  const fetchAndEnqueue = useCallback(
    async (text: string) => {
      if (!text.trim() || !isVoiceActiveRef.current) return;
      try {
        const blob = await synthesizeSpeech(text);
        if (!isVoiceActiveRef.current) {
          // Voice was closed while we awaited — discard
          return;
        }
        const url = URL.createObjectURL(blob);
        audioQueueRef.current.push(url);
        if (!isPlayingRef.current) playNext();
      } catch {
        // TTS failure is non-fatal; skip this sentence
      }
    },
    [playNext],
  );

  // Flush completed sentences while the LLM is streaming
  useEffect(() => {
    if (!isVoiceActive || !isStreaming || !streamingText) return;
    const sentences = streamingText.match(/[^.!?]+[.!?]+/g) ?? [];
    const count = sentences.length;
    if (count > processedSentencesRef.current) {
      const newOnes = sentences.slice(processedSentencesRef.current);
      processedSentencesRef.current = count;
      for (const s of newOnes) {
        const t = s.trim();
        if (t.length > 3) fetchAndEnqueue(t);
      }
    }
  }, [streamingText, isVoiceActive, isStreaming, fetchAndEnqueue]);

  // Flush remainder when LLM stream ends
  useEffect(() => {
    if (!isVoiceActive) return;
    const justFinished = prevStreamingRef.current && !isStreaming;
    prevStreamingRef.current = isStreaming;

    if (justFinished) {
      const text = streamingTextRef.current;
      const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
      const processedText = sentences.join("");
      const remainder = text.slice(processedText.length).trim();
      if (remainder.length > 3) fetchAndEnqueue(remainder);
      processedSentencesRef.current = 0;
    }
  }, [isStreaming, isVoiceActive, fetchAndEnqueue]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      // Not connected to destination — prevents mic monitoring feedback

      setAnalyserNode(analyser);
      setOrbState("listening");
      setIsRecording(true);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        setAnalyserNode(null);
        setOrbState("processing");
        setIsRecording(false);

        try {
          const transcript = await transcribeAudio(blob);
          if (transcript.trim() && isVoiceActiveRef.current) {
            setLiveTranscript(transcript);
            send(transcript);
          } else {
            setOrbState("idle");
          }
        } catch {
          setOrbState("idle");
        }
      };

      recorder.start();
    } catch {
      setOrbState("idle");
      setIsRecording(false);
    }
  }, [send]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const openVoice = useCallback(() => {
    setIsVoiceActive(true);
    setOrbState("idle");
    setLiveTranscript("");
    setAnalyserNode(null);
    processedSentencesRef.current = 0;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    prevStreamingRef.current = false;
  }, []);

  const closeVoice = useCallback(() => {
    setIsVoiceActive(false);
    // Stop mic recording
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    // Stop current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    // Revoke all queued blob URLs
    audioQueueRef.current.forEach(URL.revokeObjectURL);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    processedSentencesRef.current = 0;
    setOrbState("idle");
    setAnalyserNode(null);
    setIsRecording(false);
    setLiveTranscript("");
  }, []);

  return {
    orbState,
    analyserNode,
    liveTranscript,
    isVoiceActive,
    isRecording,
    openVoice,
    closeVoice,
    startListening,
    stopListening,
  };
}
