import type { ChatResponse, HealthResponse, MessageRecord, SessionRecord, StatItem } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function sendMessage(
  message: string,
  sessionId: string,
  model?: string
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId, model }),
  });
}

export async function streamMessage(
  message: string,
  sessionId: string,
  model: string | undefined,
  incognito: boolean,
  onToken: (token: string) => void,
  onDone: (sessionId: string, modelUsed: string, costUsd: number, tokensIn: number, tokensOut: number) => void,
  signal?: AbortSignal,
  voiceMode?: boolean,
  chatMode?: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      model,
      title: message.slice(0, 60),
      incognito,
      voice_mode: voiceMode ?? false,
      mode: chatMode ?? "natural",
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      // Parse separately so malformed JSON is skipped but backend errors propagate
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(line.slice(6)) as Record<string, unknown>;
      } catch {
        continue; // skip malformed frames
      }
      if (data.token) onToken(data.token as string);
      if (data.done) {
        onDone(
          data.session_id as string,
          (data.model_used as string) ?? "",
          (data.cost_usd as number) ?? 0,
          (data.tokens_in as number) ?? 0,
          (data.tokens_out as number) ?? 0
        );
      }
      if (data.error) throw new Error(data.error as string);
    }
  }
}

export async function getSessions(): Promise<SessionRecord[]> {
  const data = await apiFetch<{ sessions: SessionRecord[] }>("/sessions");
  return data.sessions ?? [];
}

export async function getSessionMessages(sessionId: string): Promise<MessageRecord[]> {
  const data = await apiFetch<{ messages: MessageRecord[] }>(
    `/sessions/${sessionId}/messages`
  );
  return data.messages ?? [];
}

export async function getStats(): Promise<StatItem[]> {
  const data = await apiFetch<{ items: StatItem[] }>("/sessions/stats");
  return data.items ?? [];
}

export async function submitFeedback(
  messageId: string,
  rating: 1 | -1,
  question?: string,
  answer?: string,
  sessionId?: string,
): Promise<void> {
  await apiFetch(`/feedback/${messageId}`, {
    method: "POST",
    body: JSON.stringify({ rating, question: question ?? "", answer: answer ?? "", session_id: sessionId ?? "" }),
  });
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("mp4") ? "mp4" : "wav";
  const form = new FormData();
  form.append("file", blob, `recording.${ext}`);
  const res = await fetch(`${API_URL}/audio/transcribe`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Transcribe error ${res.status}`);
  const data = await res.json();
  return data.transcript ?? "";
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/audio/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Synthesize error ${res.status}`);
  return res.blob();
}
