"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare, X, Send, Sparkles, Loader2, Download, BookOpen, FileSpreadsheet,
  HelpCircle, RotateCcw, ArrowRightLeft,
} from "lucide-react";
import { chatStream, loadSettings, type ChatMessage, type LLMSettings } from "../../lib/llm";

export interface EngineChatContext {
  /** Page identifier, e.g. "规划引擎" */
  page: string;
  /** Current enterprise being discussed */
  enterprise?: string;
  /** Sub-context when user just clicked something specific, e.g. "内部转让定价公式" */
  subject?: string;
  /** Free-form facts the page wants to expose to the agent */
  facts?: Array<{ label: string; value: string }>;
  /** Custom cards rendered at the top of the drawer (e.g. 成本卡片 / 子流程卡片) */
  cards?: React.ReactNode;
  /** When this value changes, the drawer auto-opens (用于"点击节点自动弹出助手") */
  openSignal?: string | number;
}

interface UiMessage {
  role: "user" | "ai";
  content: string;
  loading?: boolean;
  /** Detected CSV / markdown table block for one-click download */
  csv?: string;
}

const ROLE_PROMPT = `你是 Amoeba Copilot 的页内辅助助手，由上海零参科技研发，专注帮制造业落地阿米巴经营。

## 你的能力
1. 解释当前页面 / 节点的概念，给出可操作的下一步建议
2. 当用户索要"模板 / 表格 / 工作底稿"时，生成结构化的 CSV 表格（用 \`\`\`csv 代码块\`\`\`）
3. 当用户要求"找资料 / 推荐阅读"时，给出 3-6 个相关学习路径与关键词（说明这些是建议方向，需用户自行验证）
4. 必要时用中文 markdown 表格 / 列表呈现

## 回答风格
- 中文、专业、克制、不用 emoji
- 不超过 6 段；首段 1-2 句直接回答用户问题
- 涉及数字时，引用上下文里给出的真实数据
- 当生成 CSV / 表格时，第一行必须是表头，编码 UTF-8`;

function buildSystemPrompt(ctx: EngineChatContext): string {
  const lines: string[] = [ROLE_PROMPT];
  lines.push("\n## 当前上下文");
  lines.push(`- 页面：${ctx.page}`);
  if (ctx.enterprise) lines.push(`- 服务企业：${ctx.enterprise}`);
  if (ctx.subject) lines.push(`- 用户正在关注：${ctx.subject}`);
  if (ctx.facts?.length) {
    lines.push("- 已知事实：");
    ctx.facts.forEach((f) => lines.push(`  · ${f.label}：${f.value}`));
  }
  return lines.join("\n");
}

export function EngineChat(props: EngineChatContext) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The context the agent is actually using. Stays frozen until the user
  // explicitly accepts a switch (so chat history never leaks into a new topic).
  const [effectiveCtx, setEffectiveCtx] = useState<EngineChatContext>(props);
  const [pendingCtx, setPendingCtx] = useState<EngineChatContext | null>(null);

  useEffect(() => { setSettings(loadSettings()); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, pendingCtx]);

  // 程序化自动弹出：openSignal 从无到有 / 变化即打开抽屉（如点击节点）。
  // 初始为 undefined，使得「点击后才挂载」的场景（子流程页）首次点击也能弹出。
  const prevSignal = useRef<string | number | undefined>(undefined);
  useEffect(() => {
    if (props.openSignal !== undefined && props.openSignal !== prevSignal.current) setOpen(true);
    prevSignal.current = props.openSignal;
  }, [props.openSignal]);

  // Detect when the parent passes a new subject/enterprise that diverges from
  // the active conversation. If we already have history, hold the switch
  // behind a user confirmation instead of silently leaking old context.
  useEffect(() => {
    const subjectChanged = (props.subject || null) !== (effectiveCtx.subject || null);
    const enterpriseChanged = (props.enterprise || null) !== (effectiveCtx.enterprise || null);
    const pageChanged = props.page !== effectiveCtx.page;

    if (!subjectChanged && !enterpriseChanged && !pageChanged) {
      // Light update only — keep current facts fresh without disrupting chat
      if (JSON.stringify(props.facts) !== JSON.stringify(effectiveCtx.facts)) {
        setEffectiveCtx((c) => ({ ...c, facts: props.facts }));
      }
      return;
    }

    if (messages.length === 0) {
      // No history yet → safe to auto-follow
      setEffectiveCtx(props);
      setPendingCtx(null);
    } else {
      // Hold the switch for user confirmation
      setPendingCtx(props);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.page, props.enterprise, props.subject, JSON.stringify(props.facts)]);

  const provider = settings?.providers[settings.defaultProvider];
  const ready = !!provider?.apiKey;

  async function send(userText: string) {
    if (!provider || !ready || streaming || !userText.trim()) return;
    const next: UiMessage[] = [...messages, { role: "user", content: userText }, { role: "ai", content: "", loading: true }];
    setMessages(next);
    setStreaming(true);

    const history: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(effectiveCtx) },
      ...next.slice(0, -1).map<ChatMessage>((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
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
          setMessages((cur) => {
            const copy = [...cur];
            copy[copy.length - 1] = { role: "ai", content: raw, csv: detectCsv(raw) };
            return copy;
          });
        },
      });
    } catch (e) {
      setMessages((cur) => {
        const copy = [...cur];
        copy[copy.length - 1] = { role: "ai", content: `⚠️ 调用失败：${(e as Error).message}` };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    send(text);
  }

  // Quick actions
  const quickActions = [
    {
      icon: HelpCircle, label: "解释当前节点",
      build: () => effectiveCtx.subject
        ? `请用 3 段话解释「${effectiveCtx.subject}」是什么、为什么阿米巴落地需要它、如何对一家像${effectiveCtx.enterprise || "我"}这样的企业落地。给出可执行的下一步建议。`
        : `请用 3 段话解释当前${effectiveCtx.page}的核心要点和落地步骤。`,
    },
    {
      icon: FileSpreadsheet, label: "生成 CSV 模板",
      build: () => effectiveCtx.subject
        ? `请为「${effectiveCtx.subject}」生成一份可直接使用的 CSV 工作底稿模板，包含必要的字段、示例行（2-3 行）、备注列。结果放在 \`\`\`csv 代码块中\`\`\`。`
        : `请为当前${effectiveCtx.page}阶段生成一份可直接使用的 CSV 工作底稿。结果放在 \`\`\`csv 代码块中\`\`\`。`,
    },
    {
      icon: BookOpen, label: "找相关资料",
      build: () => `请围绕「${effectiveCtx.subject || effectiveCtx.page}」，给我 5 条进一步学习的方向：每条包括 标题、关键词、为什么相关、可信度。说明这些是建议方向、需要用户自行检索验证。`,
    },
  ];

  function downloadCsv(csv: string) {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (effectiveCtx.subject || effectiveCtx.page || "amoeba-template") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    if (messages.length === 0) return;
    if (!confirm("清空当前对话？")) return;
    setMessages([]);
  }

  return (
    <>
      {/* Floating launcher — chip always reflects the LATEST clicked subject,
          so users get instant feedback when picking a new node. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm text-white shadow-lg shadow-[color:var(--accent)]/35 transition hover:brightness-110"
        >
          <Sparkles className="h-4 w-4" />
          AI 助手
          {props.subject && (
            <span className="ml-1 max-w-[140px] truncate rounded-md bg-white/20 px-1.5 py-0.5 text-[10px]">
              {props.subject}
            </span>
          )}
          {pendingCtx && (
            <span className="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" title="检测到上下文变化，进入后请选择" />
          )}
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <aside className="flex w-full max-w-[440px] flex-col border-l border-border bg-card shadow-2xl animate-fade-up">
            {/* Header */}
            <header className="border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-[color:var(--primary)]" />
                    Amoeba Copilot · {props.page}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                    {(pendingCtx?.enterprise || effectiveCtx.enterprise) && (
                      <span className="rounded-md bg-[color:var(--primary)]/10 px-1.5 py-0.5 text-[color:var(--primary)]">
                        企业：{pendingCtx?.enterprise || effectiveCtx.enterprise}
                      </span>
                    )}
                    {effectiveCtx.subject && (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700">
                        AI 记忆中：{effectiveCtx.subject}
                      </span>
                    )}
                    {pendingCtx?.subject && pendingCtx.subject !== effectiveCtx.subject && (
                      <span className="rounded-md border border-amber-300 bg-white px-1.5 py-0.5 text-amber-700">
                        待切换：{pendingCtx.subject}
                      </span>
                    )}
                    {!ready && (
                      <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-red-700">
                        未配置模型 API Key
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={reset} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="清空对话">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="关闭">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </header>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted/30 px-3 py-2">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    disabled={!ready || streaming}
                    onClick={() => send(a.build())}
                    className="flex flex-col items-center gap-1 rounded-md border border-border bg-card px-2 py-2 text-[11px] transition hover:border-[color:var(--primary)]/40 hover:text-[color:var(--primary)] disabled:opacity-50"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {a.label}
                  </button>
                );
              })}
            </div>

            {/* Context-switch confirmation */}
            {pendingCtx && (
              <SwitchBanner
                oldCtx={effectiveCtx}
                newCtx={pendingCtx}
                onKeep={() => setPendingCtx(null)}
                onSwitch={() => {
                  setEffectiveCtx(pendingCtx);
                  setMessages([]);
                  setPendingCtx(null);
                }}
              />
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {props.cards && <div className="space-y-2">{props.cards}</div>}
              {messages.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                  你好，我是 Amoeba Copilot 助手。<br />
                  上方有 3 个快捷动作；也可以直接提问。
                  {effectiveCtx.subject && (
                    <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-amber-700">
                      上下文已感知到 <b>{effectiveCtx.subject}</b>
                    </div>
                  )}
                </div>
              )}

              {messages.map((m, i) => {
                if (m.role === "user") {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[color:var(--primary)] px-3 py-2 text-xs text-white">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                      {m.loading && !m.content ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {m.content ? (
                        <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                          {m.content}
                        </div>
                      ) : (
                        <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2 text-xs text-muted-foreground">思考中...</div>
                      )}
                      {m.csv && (
                        <button
                          onClick={() => downloadCsv(m.csv!)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 px-2.5 py-1.5 text-[11px] text-[color:var(--primary)] hover:bg-[color:var(--primary)]/10"
                        >
                          <Download className="h-3 w-3" />
                          下载为 .csv
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            <form onSubmit={handleSubmit} className="border-t border-border bg-card px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault(); handleSubmit();
                    }
                  }}
                  placeholder={ready ? "提问 / 让助手帮忙做...   ⌘ Enter 发送" : "请先到「模型与设置」配置 API Key"}
                  rows={2}
                  disabled={!ready || streaming}
                  className="flex-1 resize-none rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!ready || streaming || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--primary)] text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              {!ready && (
                <a href="/settings" className="mt-1 inline-flex items-center gap-1 text-[10px] text-[color:var(--primary)] hover:underline">
                  <MessageSquare className="h-3 w-3" /> 前往模型设置
                </a>
              )}
            </form>
          </aside>
        </div>
      )}
    </>
  );
}

// =====================================================================
// Switch confirmation banner
// =====================================================================
function SwitchBanner({
  oldCtx, newCtx, onKeep, onSwitch,
}: {
  oldCtx: EngineChatContext;
  newCtx: EngineChatContext;
  onKeep: () => void;
  onSwitch: () => void;
}) {
  const changes: Array<{ label: string; from?: string; to?: string }> = [];
  if ((oldCtx.subject || null) !== (newCtx.subject || null)) {
    changes.push({ label: "讨论主题", from: oldCtx.subject || "（无）", to: newCtx.subject || "（无）" });
  }
  if ((oldCtx.enterprise || null) !== (newCtx.enterprise || null)) {
    changes.push({ label: "服务企业", from: oldCtx.enterprise || "（无）", to: newCtx.enterprise || "（无）" });
  }
  if (oldCtx.page !== newCtx.page) {
    changes.push({ label: "所在页面", from: oldCtx.page, to: newCtx.page });
  }

  const keepLabel = oldCtx.subject || oldCtx.enterprise || "原话题";
  const switchLabel = newCtx.subject || newCtx.enterprise || "新话题";

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 animate-fade-up">
      <div className="mb-2 flex items-start gap-2 text-xs text-amber-900">
        <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="flex-1">
          <div className="font-semibold">检测到上下文变化</div>
          <ul className="mt-1 space-y-0.5">
            {changes.map((c, i) => (
              <li key={i} className="text-[11px]">
                <span className="opacity-70">{c.label}：</span>
                <span className="line-through opacity-60">{c.from}</span>
                <span className="mx-1">→</span>
                <span className="font-semibold">{c.to}</span>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 text-[11px] text-amber-800">
            当前对话还有历史。如果你想换一个话题，建议清空对话避免之前的内容影响新主题的回答。
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onKeep}
          className="flex-1 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
        >
          继续讨论「{keepLabel}」
        </button>
        <button
          onClick={onSwitch}
          className="flex-1 rounded-md bg-[color:var(--primary)] px-3 py-1.5 text-[11px] font-medium text-white hover:brightness-110"
        >
          切换到「{switchLabel}」并清空对话
        </button>
      </div>
    </div>
  );
}

/** Extract the first ```csv ... ``` block from the response (if any). */
function detectCsv(raw: string): string | undefined {
  const m = raw.match(/```csv\s*([\s\S]*?)```/i);
  if (m) return m[1].trim();
  // also accept generic ```markdown table with leading "|" + header
  const m2 = raw.match(/```(?:csv|md|markdown)?\s*((?:^[^\n]+,[^\n]+\n){2,}[\s\S]*?)```/m);
  if (m2) return m2[1].trim();
  return undefined;
}
