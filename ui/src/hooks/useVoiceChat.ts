"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech, transcribeAudio } from "@/lib/api";

export type OrbState = "idle" | "listening" | "processing" | "speaking";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isStreaming: boolean;
}

const GREETINGS = [
  "Hey, what's on your mind?",
  "Hello! What would you like to talk about?",
  "Hi there, I'm MeGPT — how can I help?",
];

const SILENCE_THRESHOLD = 12; // 0–255 frequency average; tune up if false-triggers
const SILENCE_DURATION_MS = 1500;
const TTS_GAIN = 1.8;          // volume multiplier applied to all TTS playback
const TTS_PLAYBACK_RATE = 1.3; // speed multiplier (1.0 = normal, 1.3 = 30% faster)

export function useVoiceChat(
  send: (text: string, voiceMode?: boolean) => void,
  streamingText: string,
  isStreaming: boolean,
) {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Tap to speak");
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Ordered slot array: null = TTS pending, "" = consumed/failed, "blob:..." = ready to play
  const audioQueueRef = useRef<(string | null)[]>([]);
  // Index of the next slot to play (never decrements; array is never shifted)
  const playHeadRef = useRef(0);
  const isPlayingRef = useRef(false);
  const processedSentencesRef = useRef(0);
  const isVoiceActiveRef = useRef(false);
  const streamingTextRef = useRef("");
  const prevStreamingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadSpeechRef = useRef(false);
  const levelCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  isVoiceActiveRef.current = isVoiceActive;
  // Only update when non-empty — flush effect reads this ref AFTER streamingText
  // has already become "" (findLast no longer finds an isStreaming message)
  if (streamingText) streamingTextRef.current = streamingText;

  async function getAudioCtx(): Promise<AudioContext> {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  const stopSilenceDetection = useCallback(() => {
    if (levelCheckIntervalRef.current) {
      clearInterval(levelCheckIntervalRef.current);
      levelCheckIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const playNext = useCallback(async () => {
    const queue = audioQueueRef.current;

    // Advance past consumed/failed slots
    while (playHeadRef.current < queue.length && queue[playHeadRef.current] === "") {
      playHeadRef.current++;
    }

    // Queue exhausted — return to idle
    if (playHeadRef.current >= queue.length) {
      isPlayingRef.current = false;
      setOrbState("idle");
      setAnalyserNode(null);
      setStatusLabel("Tap to speak");
      return;
    }

    // Next slot still waiting for TTS to complete — playNext will be re-triggered
    // by fetchAndEnqueue when the slot fills
    if (queue[playHeadRef.current] === null) {
      isPlayingRef.current = false;
      return;
    }

    const url = queue[playHeadRef.current]!;
    queue[playHeadRef.current] = ""; // mark consumed before advancing
    playHeadRef.current++;

    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.playbackRate = TTS_PLAYBACK_RATE;
    currentAudioRef.current = audio;

    const ctx = await getAudioCtx();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const gainNode = ctx.createGain();
    gainNode.gain.value = TTS_GAIN;
    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(ctx.destination);

    setAnalyserNode(analyser);
    setOrbState("speaking");
    setStatusLabel("Speaking…");
    isPlayingRef.current = true;

    const advance = () => {
      URL.revokeObjectURL(url);
      void playNext();
    };
    audio.onended = advance;
    audio.onerror = advance;
    audio.play().catch(advance);
  }, []);

  const fetchAndEnqueue = useCallback(
    async (text: string) => {
      if (!text.trim() || !isVoiceActiveRef.current) return;

      // Reserve an ordered slot synchronously before any await so that
      // concurrent TTS calls for different sentences always play in text order
      // regardless of which network response returns first.
      const slot = audioQueueRef.current.length;
      audioQueueRef.current.push(null);

      try {
        const blob = await synthesizeSpeech(text);
        if (!isVoiceActiveRef.current) {
          audioQueueRef.current[slot] = ""; // discard if voice closed mid-flight
          return;
        }
        const url = URL.createObjectURL(blob);
        audioQueueRef.current[slot] = url;
        if (!isPlayingRef.current) void playNext();
      } catch {
        audioQueueRef.current[slot] = ""; // skip sentence on TTS failure
        if (!isPlayingRef.current) void playNext();
      }
    },
    [playNext],
  );

  // Update streaming assistant bubble + enqueue sentences as LLM generates
  useEffect(() => {
    if (!isVoiceActive || !isStreaming || !streamingText) return;

    setVoiceMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.isStreaming) {
        return [...prev.slice(0, -1), { ...last, text: streamingText }];
      }
      return prev;
    });

    // Transition label from "Thinking…" to "Preparing voice…" on first token
    setStatusLabel((prev) => (prev === "Thinking…" ? "Preparing voice…" : prev));

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

  // Flush remainder and finalise message when LLM stream ends
  useEffect(() => {
    if (!isVoiceActive) return;
    const justFinished = prevStreamingRef.current && !isStreaming;
    prevStreamingRef.current = isStreaming;

    if (justFinished) {
      const text = streamingTextRef.current;
      setVoiceMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, text, isStreaming: false }];
        }
        return prev;
      });

      const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
      const processedText = sentences.join("");
      const remainder = text.slice(processedText.length).trim();
      if (remainder.length > 3) fetchAndEnqueue(remainder);
      processedSentencesRef.current = 0;
    }
  }, [isStreaming, isVoiceActive, fetchAndEnqueue]);

  const stopAndSubmitRecording = useCallback(() => {
    stopSilenceDetection();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    hadSpeechRef.current = false;
  }, [stopSilenceDetection]);

  const startListening = useCallback(async () => {
    // Interrupt speaking if active
    if (isPlayingRef.current && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
      audioQueueRef.current.forEach((url) => { if (url) URL.revokeObjectURL(url); });
      audioQueueRef.current = [];
      playHeadRef.current = 0;
      isPlayingRef.current = false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const ctx = await getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      setAnalyserNode(analyser);
      setOrbState("listening");
      setStatusLabel("Listening…");
      setIsRecording(true);
      hadSpeechRef.current = false;

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
        stopSilenceDetection();
        stream.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        micAnalyserRef.current = null;
        setAnalyserNode(null);
        setOrbState("processing");
        setStatusLabel("Transcribing…");
        setIsRecording(false);

        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });

        try {
          const transcript = await transcribeAudio(blob);
          if (transcript.trim() && isVoiceActiveRef.current) {
            setStatusLabel("Thinking…");
            setVoiceMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "user", text: transcript, isStreaming: false },
              { id: crypto.randomUUID(), role: "assistant", text: "", isStreaming: true },
            ]);
            send(transcript, true);
          } else {
            setOrbState("idle");
            setStatusLabel("Tap to speak");
          }
        } catch {
          setOrbState("idle");
          setStatusLabel("Tap to speak");
        }
      };

      recorder.start();

      // Silence detection — auto-submit after SILENCE_DURATION_MS of quiet post-speech
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      levelCheckIntervalRef.current = setInterval(() => {
        if (!micAnalyserRef.current) return;
        micAnalyserRef.current.getByteFrequencyData(freqData);
        const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;

        if (avg > SILENCE_THRESHOLD) {
          hadSpeechRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hadSpeechRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(stopAndSubmitRecording, SILENCE_DURATION_MS);
        }
      }, 100);
    } catch {
      setOrbState("idle");
      setStatusLabel("Tap to speak");
      setIsRecording(false);
    }
  }, [send, stopSilenceDetection, stopAndSubmitRecording]);

  const stopListening = useCallback(() => {
    stopAndSubmitRecording();
  }, [stopAndSubmitRecording]);

  const openVoice = useCallback(() => {
    setIsVoiceActive(true);
    setOrbState("idle");
    setStatusLabel("Tap to speak");
    setVoiceMessages([]);
    setAnalyserNode(null);
    processedSentencesRef.current = 0;
    audioQueueRef.current = [];
    playHeadRef.current = 0;
    isPlayingRef.current = false;
    prevStreamingRef.current = false;
    hadSpeechRef.current = false;
  }, []);

  // Play welcome greeting on each open
  useEffect(() => {
    if (!isVoiceActive) return;
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setVoiceMessages([{ id: crypto.randomUUID(), role: "assistant", text: greeting, isStreaming: false }]);
    fetchAndEnqueue(greeting);
    // intentionally omitting fetchAndEnqueue from deps — it's stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceActive]);

  const closeVoice = useCallback(() => {
    setIsVoiceActive(false);
    stopAndSubmitRecording();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    audioQueueRef.current.forEach((url) => { if (url) URL.revokeObjectURL(url); });
    audioQueueRef.current = [];
    playHeadRef.current = 0;
    isPlayingRef.current = false;
    processedSentencesRef.current = 0;
    setOrbState("idle");
    setAnalyserNode(null);
    setIsRecording(false);
    setStatusLabel("Tap to speak");
    setVoiceMessages([]);
  }, [stopAndSubmitRecording]);

  return {
    orbState,
    analyserNode,
    isVoiceActive,
    isRecording,
    statusLabel,
    voiceMessages,
    openVoice,
    closeVoice,
    startListening,
    stopListening,
  };
}
