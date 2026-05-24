"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Loader2, Settings as SettingsIcon, Building2, Plus, ChevronRight,
  Download, Flag, History, ArrowLeft,
} from "lucide-react";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input, Label } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";
import { QuestionCard } from "../../../components/diagnosis/QuestionCard";
import { DimensionProgress } from "../../../components/diagnosis/DimensionProgress";
import { IndustryComparison } from "../../../components/diagnosis/IndustryComparison";
import { chatStream, loadSettings, type ChatMessage, type LLMSettings } from "../../../lib/llm";
import { buildDiagnosisSystemPrompt } from "../../../lib/prompts";
import {
  DIMENSION_KEYS, INDUSTRY_LABELS, type AIEnvelope, type ConversationTurn,
  type DimensionKey, type Industry,
} from "../../../lib/diagnosis-types";

interface Enterprise {
  id: string; name: string; industry: Industry; scale?: string;
  createdAt: string; memory?: string;
}
interface Conversation {
  id: string; enterpriseId: string; status: "in_progress" | "completed" | "abandoned";
  turns: ConversationTurn[]; progress: Record<DimensionKey, number>;
  currentDimension: DimensionKey;
  updatedAt: string; createdAt: string; completedAt?: string;
  summary?: import("../../../lib/diagnosis-types").DiagnosisSummary | null;
}

type Stage = "pick-enterprise" | "pick-conversation" | "chat";

export default function DiagnosisPage() {
  const [stage, setStage] = useState<Stage>("pick-enterprise");
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [showNewEnt, setShowNewEnt] = useState(false);
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<{ id: string; dimension: DimensionKey; level: string; type: string; question: string; options?: string[] }[]>([]);

  useEffect(() => {
    setSettings(loadSettings());
    fetch("/api/enterprises").then((r) => r.json()).then((d) => setEnterprises(d.enterprises || []));
    fetch("/api/questions?status=active").then((r) => r.json()).then((d) => setActiveQuestions(d.questions || []));
  }, []);

  async function refreshConvs(entId: string) {
    const res = await fetch(`/api/conversations?enterpriseId=${entId}`);
    const data = await res.json();
    setConvs(data.conversations || []);
  }

  async function refreshEnterpriseFresh(entId: string) {
    // Pull the latest enterprise record (latestSummary may have just been written)
    const r = await fetch(`/api/enterprises/${entId}`);
    if (!r.ok) return;
    const d = await r.json();
    if (d.enterprise) {
      setEnterprise(d.enterprise);
      setEnterprises((arr) => arr.map((x) => x.id === d.enterprise.id ? d.enterprise : x));
    }
  }

  async function selectEnterprise(e: Enterprise) {
    setEnterprise(e);
    await refreshConvs(e.id);
    setStage("pick-conversation");
  }

  async function startNewConversation() {
    if (!enterprise) return;
    const res = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enterpriseId: enterprise.id }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "创建失败");
    setConv(data.conversation);
    setStage("chat");
  }

  async function resumeConversation(c: { id: string }) {
    const res = await fetch(`/api/conversations/${c.id}`);
    const data = await res.json();
    if (!res.ok) return alert(data.error || "加载失败");
    setConv(data.conversation);
    setStage("chat");
  }

  return (
    <PageShell title="诊断引擎" subtitle="多轮卡片式问询 · 自动持久化 · 可恢复 / 可导出">
      {stage === "pick-enterprise" && (
        <EnterprisePicker enterprises={enterprises} onPick={selectEnterprise} onNew={() => setShowNewEnt(true)} />
      )}
      {stage === "pick-conversation" && enterprise && (
        <ConversationPicker
          enterprise={enterprise} conversations={convs}
          onBack={() => setStage("pick-enterprise")}
          onNew={startNewConversation} onResume={resumeConversation}
        />
      )}
      {stage === "chat" && enterprise && conv && settings && (
        <ChatStage
          enterprise={enterprise} settings={settings} activeQuestions={activeQuestions}
          initialConv={conv}
          onExit={async () => {
            // Refresh both lists so picker reflects the latest status / summary
            await refreshConvs(enterprise.id);
            await refreshEnterpriseFresh(enterprise.id);
            setStage("pick-conversation");
          }}
        />
      )}

      {showNewEnt && (
        <NewEnterpriseDialog
          onClose={() => setShowNewEnt(false)}
          onCreated={(e) => {
            setEnterprises((arr) => [e, ...arr]);
            setShowNewEnt(false);
            selectEnterprise(e);
          }}
        />
      )}
    </PageShell>
  );
}

// =============================================================
// Stage 1: enterprise picker
// =============================================================
function EnterprisePicker({
  enterprises, onPick, onNew,
}: { enterprises: Enterprise[]; onPick: (e: Enterprise) => void; onNew: () => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader
          title="选择服务的企业"
          desc="每个企业的对话与画像独立保存，可随时继续"
          action={<Button onClick={onNew}><Plus className="h-4 w-4" /> 新建企业</Button>}
        />
        <CardBody className="px-0 py-0">
          {enterprises.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              还没有企业档案 — 点击右上「新建企业」开始
            </div>
          ) : (
            <ul>
              {enterprises.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => onPick(e)}
                    className="flex w-full items-center justify-between border-b border-border px-5 py-3 text-left transition hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {INDUSTRY_LABELS[e.industry]} {e.scale && `· ${e.scale}`}
                          {e.memory && <span className="ml-2 text-[color:var(--primary)]">· 已有历史记忆</span>}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function NewEnterpriseDialog({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (e: Enterprise) => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<Industry>("auto_parts");
  const [scale, setScale] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/enterprises", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, industry, scale, contact }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      onCreated(data.enterprise);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl">
        <div>
          <h3 className="text-lg font-semibold">新建企业档案</h3>
          <p className="text-xs text-muted-foreground">仅基本信息，后续可在对话中补充</p>
        </div>
        <div>
          <Label htmlFor="ne-name">公司名称</Label>
          <Input id="ne-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>所属行业</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
              <button
                key={k} type="button" onClick={() => setIndustry(k)}
                className={`rounded-md border px-3 py-2 text-xs transition ${
                  industry === k
                    ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]"
                    : "border-border hover:bg-muted"
                }`}
              >
                {INDUSTRY_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="ne-scale" hint="可选">规模描述</Label>
          <Input id="ne-scale" value={scale} onChange={(e) => setScale(e.target.value)} placeholder="如：320 人 / 年营收 2.8 亿" />
        </div>
        <div>
          <Label htmlFor="ne-contact" hint="可选">联系人 / 备注</Label>
          <Input id="ne-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} 创建</Button>
        </div>
      </form>
    </div>
  );
}

// =============================================================
// Stage 2: conversation picker
// =============================================================
function ConversationPicker({
  enterprise, conversations, onBack, onNew, onResume,
}: {
  enterprise: Enterprise; conversations: Conversation[];
  onBack: () => void; onNew: () => void; onResume: (c: { id: string }) => void;
}) {
  const inProgress = conversations.find((c) => c.status === "in_progress");
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回企业列表
      </button>
      <Card>
        <CardHeader
          title={enterprise.name}
          desc={`${INDUSTRY_LABELS[enterprise.industry]}${enterprise.scale ? " · " + enterprise.scale : ""}`}
          action={
            <Button onClick={onNew} disabled={!!inProgress}>
              <Plus className="h-4 w-4" /> {inProgress ? "已有进行中对话" : "新开诊断"}
            </Button>
          }
        />
        <CardBody className="space-y-2">
          {enterprise.memory && (
            <div className="mb-3 rounded-lg border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 p-3 text-xs">
              <div className="mb-1 font-medium text-[color:var(--primary)]">长期记忆已加载</div>
              <div className="whitespace-pre-wrap text-foreground">{enterprise.memory}</div>
            </div>
          )}
          {conversations.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">还没有诊断记录</div>
          ) : (
            <ul className="divide-y divide-border">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button onClick={() => onResume(c)} className="flex w-full items-start justify-between py-3 text-left hover:bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(c.createdAt).toLocaleString("zh-CN")}
                        <Badge tone={c.status === "completed" ? "success" : c.status === "in_progress" ? "primary" : "muted"}>
                          {c.status === "completed" ? "已完成" : c.status === "in_progress" ? "进行中" : "已放弃"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        覆盖度 {Math.round(DIMENSION_KEYS.reduce((s, k) => s + (c.progress[k] || 0), 0) / DIMENSION_KEYS.length)}%
                        · 最后更新 {new Date(c.updatedAt).toLocaleString("zh-CN")}
                        {c.summary && ` · 综合就绪度 ${c.summary.score}/100`}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 self-center text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// =============================================================
// Stage 3: chat
// =============================================================
function ChatStage({
  enterprise, settings, activeQuestions, initialConv, onExit,
}: {
  enterprise: Enterprise; settings: LLMSettings;
  activeQuestions: { id: string; dimension: DimensionKey; level: string; type: string; question: string; options?: string[] }[];
  initialConv: Conversation; onExit: () => void;
}) {
  const [conv, setConv] = useState<Conversation>(initialConv);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conv.turns]);

  const provider = settings.providers[settings.defaultProvider];
  const ready = !!provider?.apiKey;
  const activeCard = conv.turns[conv.turns.length - 1]?.card;
  const isDone = conv.status === "completed" || activeCard?.type === "done";

  const systemPrompt = useMemo(
    () => buildDiagnosisSystemPrompt({
      industry: enterprise.industry,
      enterpriseName: enterprise.name,
      enterpriseMemory: enterprise.memory,
      activeQuestions: activeQuestions.map((q) => ({
        id: q.id, dimension: q.dimension,
        level: q.level as "L1" | "L2" | "L3", type: q.type, question: q.question, options: q.options,
      })),
    }),
    [enterprise, activeQuestions]
  );

  const persist = useCallback(async (next: Conversation) => {
    try {
      await fetch(`/api/conversations/${next.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: next.turns,
          progress: next.progress,
          currentDimension: next.currentDimension,
          status: next.status,            // ← 关键：把 status 也持久化（之前漏了）
          summary: next.summary || undefined,
        }),
      });
    } catch { /* swallow */ }
  }, []);

  async function handleAnswer(answer: string) {
    if (!ready || streaming) {
      if (!ready) alert("请先在「模型与设置」配置 API Key");
      return;
    }

    const userTurn: ConversationTurn = { role: "user", text: answer, at: new Date().toISOString() };
    const aiPending: ConversationTurn = { role: "ai", text: "", at: new Date().toISOString() };
    const cleared: Conversation = {
      ...conv,
      turns: [
        ...conv.turns.map((t, i) => (i === conv.turns.length - 1 ? { ...t, card: undefined } : t)),
        userTurn, aiPending,
      ],
    };
    setConv(cleared);
    setStreaming(true);

    const history: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...cleared.turns.slice(0, -1).map<ChatMessage>((t) => ({
        role: t.role === "ai" ? "assistant" : "user",
        content: t.role === "ai"
          ? `${t.text || ""}\n\`\`\`json\n${JSON.stringify(t.envelope || {})}\n\`\`\``
          : t.text,
      })),
    ];

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let raw = "";

    try {
      await chatStream({
        provider, messages: history, signal: ctrl.signal,
        onChunk: (delta) => {
          raw += delta;
          setConv((cur) => {
            const copy = { ...cur, turns: [...cur.turns] };
            copy.turns[copy.turns.length - 1] = { ...copy.turns[copy.turns.length - 1], text: stripJson(raw) };
            return copy;
          });
        },
      });

      const env = extractEnvelope(raw);
      const finalTurn: ConversationTurn = {
        role: "ai",
        text: stripJson(raw).trim(),
        envelope: env || undefined,
        card: env?.card,
        at: new Date().toISOString(),
      };

      const next: Conversation = {
        ...cleared,
        turns: [...cleared.turns.slice(0, -1), finalTurn],
        progress: env?.progress || cleared.progress,
        currentDimension: env?.current_dimension || cleared.currentDimension,
        summary: env?.summary || cleared.summary,
        status: env?.card?.type === "done" ? "completed" : cleared.status,
      };
      setConv(next);
      persist(next);

      // If the AI just signalled completion, auto-finalize so the
      // enterprise.latestSummary is written and 企业画像 / 列表都能看到。
      if (env?.card?.type === "done" && env?.summary && cleared.status !== "completed") {
        // fire-and-forget; user sees the result update in-place
        finalizeConversation(next.id, provider).then((updated) => {
          if (updated) setConv(updated);
        });
      }
    } catch (e) {
      setConv((cur) => {
        const copy = { ...cur, turns: [...cur.turns] };
        copy.turns[copy.turns.length - 1] = {
          role: "ai", text: `调用失败：${(e as Error).message}`, at: new Date().toISOString(),
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function handleFinalize() {
    if (!ready) return alert("请先配置 API Key");
    const updated = await finalizeConversation(conv.id, provider, true);
    if (updated) setConv(updated);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex h-[calc(100vh-9rem)] flex-col">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--primary)]" />
              {enterprise.name}
              <Badge tone={conv.status === "completed" ? "success" : "primary"}>
                {conv.status === "completed" ? "已完成" : "进行中"}
              </Badge>
            </div>
          }
          desc={`${INDUSTRY_LABELS[enterprise.industry]} · ${provider?.name || "未配置模型"}`}
          action={
            <div className="flex flex-wrap gap-2">
              <a href={`/api/conversations/${conv.id}/export`} target="_blank" rel="noopener">
                <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> 导出 MD</Button>
              </a>
              <Button variant="outline" size="sm" onClick={handleFinalize}>
                <Flag className="h-3.5 w-3.5" /> {isDone ? "重新生成画像" : "标记完成"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onExit}>
                <ArrowLeft className="h-3.5 w-3.5" /> 切换对话
              </Button>
              <Link href="/settings"><Button variant="outline" size="sm"><SettingsIcon className="h-3.5 w-3.5" /></Button></Link>
            </div>
          }
        />
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {conv.turns.map((t, i) => {
            const isLast = i === conv.turns.length - 1;
            if (t.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-[color:var(--primary)] px-4 py-2 text-sm text-white">
                    {t.text}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="space-y-3">
                {t.text && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-2 text-sm text-foreground whitespace-pre-wrap">
                      {t.text}
                    </div>
                  </div>
                )}
                {!t.text && isLast && streaming && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/10">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--primary)]" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-2 text-sm text-muted-foreground">思考中...</div>
                  </div>
                )}
                {t.card && isLast && !isDone && (
                  <div className="ml-10">
                    <QuestionCard card={t.card} onSubmit={handleAnswer} disabled={streaming} />
                  </div>
                )}
                {t.envelope?.propose_question && (
                  <div className="ml-10 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    智能体发现新现象，已提交建议题目供管理员审核：「{t.envelope.propose_question.question}」
                  </div>
                )}
              </div>
            );
          })}
          {isDone && conv.summary && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                <div className="mb-2 text-sm font-semibold text-emerald-700">诊断完成 · 综合就绪度 {conv.summary.score}/100</div>
                <div className="text-xs text-emerald-800">推荐档次 {conv.summary.level} · 预计周期 {conv.summary.cycle}</div>
              </div>
              <IndustryComparison
                industry={enterprise.industry}
                score={conv.summary.score}
                dimensionScores={conv.summary.dimension_scores || conv.progress}
              />
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="六维诊断进度" desc="对话覆盖度自动更新" />
          <CardBody><DimensionProgress progress={conv.progress} current={conv.currentDimension} /></CardBody>
        </Card>
        {enterprise.memory && (
          <Card>
            <CardHeader title="企业长期记忆" desc="历次诊断沉淀，AI 已自动加载" />
            <CardBody>
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-foreground">
                {enterprise.memory}
              </div>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="使用提示" />
          <CardBody className="space-y-1.5 text-xs text-muted-foreground">
            <p>• 每轮回答自动保存到云端，可随时离开</p>
            <p>• 点「导出 MD」生成完整诊断报告</p>
            <p>• AI 发现新现象会自动提交建议题目给管理员</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/**
 * Call /api/conversations/[id]/finalize and return the updated conversation.
 * Used both for manual "标记完成" clicks and for auto-finalization when the
 * AI emits a done card.
 */
async function finalizeConversation(
  convId: string,
  provider: { baseUrl: string; model: string; apiKey: string; protocol?: "openai" | "anthropic" } | undefined,
  showAlert = false
): Promise<Conversation | null> {
  if (!provider?.apiKey) {
    if (showAlert) alert("尚未配置 API Key");
    return null;
  }
  try {
    const res = await fetch(`/api/conversations/${convId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: provider.baseUrl,
        model: provider.model,
        apiKey: provider.apiKey,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (showAlert) alert("生成画像失败：" + txt.slice(0, 200));
      return null;
    }
    const d = await res.json();
    if (showAlert) alert(d.memoryGenerated ? "诊断已完成，已生成长期记忆 ✓" : "诊断已完成 ✓");
    return d.conversation as Conversation;
  } catch (e) {
    if (showAlert) alert("生成画像失败：" + (e as Error).message);
    return null;
  }
}

function stripJson(raw: string): string {
  const i = raw.indexOf("```json");
  return i >= 0 ? raw.slice(0, i).trim() : raw;
}
function extractEnvelope(raw: string): AIEnvelope | null {
  const m = raw.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1].trim());
    if (!parsed.card || !parsed.progress) return null;
    return parsed as AIEnvelope;
  } catch { return null; }
}
