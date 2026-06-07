export type Theme = "claude" | "gpt" | "grok";
export type ThemeMode = "light" | "dark";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  cost_usd?: number;
  tokens_in?: number;
  tokens_out?: number;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface SessionRecord {
  id: string;
  session_id: string;
  title: string;
  incognito?: boolean;
  created?: string;
}

export interface MessageRecord {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  model_used: string;
  cost_usd: number;
  tokens_in?: number;
  tokens_out?: number;
  created?: string;
}

export interface StatItem {
  cost_usd: number;
  tokens_in?: number;
  tokens_out?: number;
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
