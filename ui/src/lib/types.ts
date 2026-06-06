export type Theme = "claude" | "gpt" | "grok";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  cost_usd?: number;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface SessionRecord {
  id: string;
  session_id: string;
  title: string;
  created?: string;
}

export interface MessageRecord {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  model_used: string;
  cost_usd: number;
  created?: string;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  model_used: string;
  cost_usd: number;
  sources: string[];
}

export interface HealthResponse {
  status: string;
  services: Record<string, string>;
}
