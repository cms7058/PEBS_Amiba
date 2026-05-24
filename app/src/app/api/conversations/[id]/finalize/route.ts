import { getCurrentSession } from "../../../../../lib/auth";
import { getConversation, updateConversation } from "../../../../../lib/conversations";
import { getEnterprise, updateEnterprise } from "../../../../../lib/enterprises";
import { MEMORY_GENERATION_PROMPT } from "../../../../../lib/prompts";
import { appendSample } from "../../../../../lib/benchmark";
import { DIMENSION_KEYS } from "../../../../../lib/diagnosis-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BodyIn {
  /** Optional LLM provider config so we can generate memory server-side */
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) return Response.json({ error: "会话不存在" }, { status: 404 });
  if (s.role !== "admin" && conv.ownerId !== s.sub) return Response.json({ error: "无权限" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as BodyIn;

  // 1) Mark conversation completed
  const completedAt = new Date().toISOString();
  const updated = await updateConversation(id, { status: "completed", completedAt });

  // 2) Update enterprise summary + try to generate memory (best-effort)
  const ent = await getEnterprise(conv.enterpriseId);
  if (!ent) return Response.json({ conversation: updated });

  let memory: string | undefined;
  if (body.baseUrl && body.model && body.apiKey) {
    try {
      memory = await generateMemory({ baseUrl: body.baseUrl, model: body.model, apiKey: body.apiKey }, conv.turns);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[finalize] memory generation failed", e);
    }
  }

  await updateEnterprise(ent.id, {
    latestSummary: conv.summary || ent.latestSummary,
    latestConversationId: conv.id,
    memory: memory ? mergeMemory(ent.memory, memory) : ent.memory,
  });

  // Append anonymized benchmark sample (best-effort; only if we have a summary)
  if (conv.summary) {
    try {
      const dims = conv.summary.dimension_scores || conv.progress;
      // Fill any missing dims from progress so we always have all 6
      const dimensions = Object.fromEntries(
        DIMENSION_KEYS.map((k) => [k, Math.round(dims[k] ?? conv.progress[k] ?? 0)])
      ) as Record<typeof DIMENSION_KEYS[number], number>;
      await appendSample({
        industry: ent.industry,
        score: conv.summary.score,
        level: conv.summary.level,
        dimensions,
        scale: ent.scale,
        at: completedAt,
      });
    } catch {
      // ignore
    }
  }

  return Response.json({ conversation: updated, memoryGenerated: !!memory });
}

async function generateMemory(
  cfg: Required<BodyIn>,
  turns: import("../../../../../lib/diagnosis-types").ConversationTurn[]
): Promise<string> {
  const transcript = turns
    .map((t) => `${t.role === "ai" ? "AI" : "用户"}：${t.text || (t.card?.question ?? "")}`)
    .join("\n");
  const isAnthropic = /\/anthropic\b/i.test(cfg.baseUrl);
  if (isAnthropic) {
    const res = await fetch(cfg.baseUrl.replace(/\/+$/, "") + "/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1500,
        system: MEMORY_GENERATION_PROMPT,
        messages: [{ role: "user", content: transcript }],
        stream: false,
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new Error("memory gen upstream " + res.status);
    const data = await res.json();
    // Anthropic content shape: { content: [{type:"text", text: "..."}] }
    const text: string = Array.isArray(data?.content)
      ? data.content.filter((c: { type?: string }) => c.type === "text").map((c: { text?: string }) => c.text || "").join("")
      : (data?.completion || "");
    return text.trim().slice(0, 1500);
  }
  const res = await fetch(cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: MEMORY_GENERATION_PROMPT },
        { role: "user", content: transcript },
      ],
      stream: false,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error("memory gen upstream " + res.status);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content || "";
  return text.trim().slice(0, 1500);
}

function mergeMemory(prev: string | undefined, next: string): string {
  if (!prev) return next;
  // Append new memory section dated, cap total to ~3000 chars
  const merged = `${prev.trim()}\n\n— ${new Date().toISOString().slice(0, 10)} 更新 —\n${next.trim()}`;
  return merged.length > 3000 ? merged.slice(-3000) : merged;
}
