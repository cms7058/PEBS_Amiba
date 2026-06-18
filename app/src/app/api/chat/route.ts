export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Protocol = "openai" | "anthropic";

interface Body {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  protocol?: Protocol;
  messages?: { role: string; content: string }[];
  /** Anthropic max_tokens; defaults to 4096 */
  maxTokens?: number;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("invalid json body", { status: 400 });
  }

  const { baseUrl, model, apiKey, messages, maxTokens } = body;
  if (!baseUrl || !model || !messages?.length) {
    return new Response("缺少必要参数：baseUrl / model / messages", { status: 400 });
  }
  if (!apiKey) {
    return new Response("尚未配置 API Key，请到「模型与设置」页面填入。", { status: 400 });
  }

  const protocol: Protocol = body.protocol || (/\/anthropic\b/i.test(baseUrl) ? "anthropic" : "openai");

  try {
    if (protocol === "anthropic") {
      return await handleAnthropic({ baseUrl, model, apiKey, messages, maxTokens: maxTokens || 4096 });
    }
    return await handleOpenAI({ baseUrl, model, apiKey, messages });
  } catch (e) {
    // 上游连接失败（如 baseUrl 缺少 https://、网络不可达）——返回可读信息而非 500
    const msg = (e as Error).message || String(e);
    return new Response(`无法连接上游模型：${msg}。请检查「模型与设置」的 Base URL（需以 https:// 开头）与网络。`, { status: 502 });
  }
}

// =====================================================================
// OpenAI: pipe through unchanged
// =====================================================================
async function handleOpenAI(opts: {
  baseUrl: string; model: string; apiKey: string;
  messages: { role: string; content: string }[];
}): Promise<Response> {
  const endpoint = opts.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: 0.6,
    }),
  });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(`上游模型调用失败 (${upstream.status})：${text.slice(0, 500)}`, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// =====================================================================
// Anthropic Messages: translate request + response back to OpenAI SSE
// =====================================================================
async function handleAnthropic(opts: {
  baseUrl: string; model: string; apiKey: string;
  messages: { role: string; content: string }[];
  maxTokens: number;
}): Promise<Response> {
  const endpoint = opts.baseUrl.replace(/\/+$/, "") + "/v1/messages";

  // Split system messages out (Anthropic uses a separate `system` field)
  const systemTexts: string[] = [];
  const chat: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of opts.messages) {
    if (m.role === "system") {
      systemTexts.push(m.content);
    } else if (m.role === "user" || m.role === "assistant") {
      chat.push({ role: m.role, content: m.content });
    }
  }
  // Anthropic requires the conversation to start with user; if it starts
  // with assistant (rare but possible from our diagnosis flow), prepend a
  // placeholder user message.
  if (chat.length > 0 && chat[0].role !== "user") {
    chat.unshift({ role: "user", content: "（继续）" });
  }
  // Anthropic requires alternating user/assistant — collapse consecutive
  // same-role messages by joining.
  const collapsed: typeof chat = [];
  for (const m of chat) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.role === m.role) {
      last.content += "\n\n" + m.content;
    } else {
      collapsed.push({ ...m });
    }
  }

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // MiniMax-Anthropic proxy accepts Bearer; standard Anthropic uses x-api-key.
      // Send both so we work with either gateway.
      Authorization: `Bearer ${opts.apiKey}`,
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: systemTexts.join("\n\n") || undefined,
      messages: collapsed,
      stream: true,
      temperature: 0.6,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(`上游模型调用失败 (${upstream.status})：${text.slice(0, 500)}`, { status: 502 });
  }

  // Re-emit Anthropic stream as OpenAI-style SSE so the existing front-end
  // SSE parser (looking for {choices:[{delta:{content}}]}) keeps working.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let done = false;

      const writeDelta = (text: string) => {
        const chunk = `data: ${JSON.stringify({
          choices: [{ delta: { content: text } }],
        })}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        while (!done) {
          const { value, done: rd } = await reader.read();
          done = rd;
          if (value) buffer += decoder.decode(value, { stream: true });

          // Anthropic SSE: blocks separated by \n\n
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            // each block has `event: X\ndata: {...}` lines
            const lines = block.split("\n");
            let eventName = "";
            let dataLine = "";
            for (const line of lines) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLine = line.slice(5).trim();
            }
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine);
              if (payload.type === "content_block_delta") {
                const delta = payload.delta;
                if (delta?.type === "text_delta" && typeof delta.text === "string") {
                  writeDelta(delta.text);
                }
              } else if (payload.type === "message_stop" || eventName === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              } else if (payload.type === "error") {
                // surface upstream errors as a final delta + done
                writeDelta(`\n⚠️ 上游错误：${payload.error?.message || JSON.stringify(payload.error)}`);
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // ignore non-JSON keepalives
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = (err as Error).message || String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          choices: [{ delta: { content: `\n⚠️ 流读取失败：${msg}` } }],
        })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
