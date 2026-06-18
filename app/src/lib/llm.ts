export type ProviderId = "deepseek" | "minimax" | "kimi";
export type ChatProtocol = "openai" | "anthropic";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  brand: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  /** OpenAI-compatible /chat/completions vs Anthropic Messages /v1/messages */
  protocol?: ChatProtocol;
}

export interface LLMSettings {
  defaultProvider: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
}

export const DEFAULT_SETTINGS: LLMSettings = {
  defaultProvider: "deepseek",
  providers: {
    deepseek: {
      id: "deepseek",
      name: "DeepSeek V4 Pro",
      brand: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-v4-pro",
      apiKey: "",
      enabled: true,
      protocol: "openai",
    },
    minimax: {
      id: "minimax",
      name: "MiniMax M2.7",
      brand: "MiniMax",
      baseUrl: "https://api.minimaxi.com/anthropic",
      model: "MiniMax-M2.7",
      apiKey: "",
      enabled: false,
      protocol: "anthropic",
    },
    kimi: {
      id: "kimi",
      name: "Kimi K2.5",
      brand: "Moonshot",
      baseUrl: "https://api.moonshot.cn/v1",
      model: "kimi-k2.5",
      apiKey: "",
      enabled: false,
      protocol: "openai",
    },
  },
};

const STORAGE_KEY = "amiba.llm.settings.v1";

export function loadSettings(): LLMSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LLMSettings>;
    return {
      defaultProvider: parsed.defaultProvider ?? DEFAULT_SETTINGS.defaultProvider,
      providers: {
        deepseek: { ...DEFAULT_SETTINGS.providers.deepseek, ...parsed.providers?.deepseek },
        minimax: { ...DEFAULT_SETTINGS.providers.minimax, ...parsed.providers?.minimax },
        kimi: { ...DEFAULT_SETTINGS.providers.kimi, ...parsed.providers?.kimi },
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: LLMSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/**
 * 取当前可用的 provider：优先 defaultProvider；若它没填 Key，则回退到任意
 * 已填 Key 的 provider（先 enabled，再任意）。保证只要配过一个 Key 就能调用成功。
 */
export function getActiveProvider(settings: LLMSettings): ProviderConfig | undefined {
  const def = settings.providers[settings.defaultProvider];
  if (def?.apiKey) return def;
  const all = Object.values(settings.providers);
  return all.find((p) => p.apiKey && p.enabled) || all.find((p) => p.apiKey);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Auto-detect protocol from baseUrl if explicit protocol isn't set. */
export function inferProtocol(baseUrl: string): ChatProtocol {
  return /\/anthropic\b/i.test(baseUrl) ? "anthropic" : "openai";
}

export async function chatStream(opts: {
  provider: ProviderConfig;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onChunk: (text: string) => void;
}): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl: opts.provider.baseUrl,
      model: opts.provider.model,
      apiKey: opts.provider.apiKey,
      protocol: opts.provider.protocol || inferProtocol(opts.provider.baseUrl),
      messages: opts.messages,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `请求失败：${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: split by \n\n; each event has lines like "data: {...}"
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const evt of events) {
      const line = evt.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || "";
        if (delta) opts.onChunk(delta);
      } catch {
        // ignore parse errors for keep-alive frames
      }
    }
  }
}
