"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import { MobileShell } from "../../../../components/mobile/MobileShell";
import { Badge } from "../../../../components/ui/Badge";
import {
  DIMENSION_LABELS, INDUSTRY_LABELS,
  type ConversationTurn, type DimensionKey, type DiagnosisSummary, type Industry,
} from "../../../../lib/diagnosis-types";

interface Conversation {
  id: string; enterpriseId: string; status: string;
  turns: ConversationTurn[]; progress: Record<DimensionKey, number>;
  summary?: DiagnosisSummary | null;
  createdAt: string; updatedAt: string;
}

interface Enterprise { id: string; name: string; industry: Industry; scale?: string }

export default function MobileConversationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [ent, setEnt] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/conversations/${id}`);
      if (!r.ok) { setLoading(false); return; }
      const d = await r.json();
      setConv(d.conversation);
      const er = await fetch(`/api/enterprises/${d.conversation.enterpriseId}`);
      if (er.ok) setEnt((await er.json()).enterprise);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <MobileShell title="对话详情"><div className="py-10 text-center text-sm text-muted-foreground">加载中...</div></MobileShell>;
  if (!conv) return <MobileShell title="对话详情"><div className="py-10 text-center text-sm text-muted-foreground">找不到该会话</div></MobileShell>;

  const overall = Math.round(
    (Object.keys(conv.progress) as DimensionKey[]).reduce((sum, k) => sum + (conv.progress[k] || 0), 0) /
      Object.keys(conv.progress).length
  );

  return (
    <MobileShell title={ent?.name || "对话详情"}>
      <Link href="/m/conversations" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回列表
      </Link>

      <div className="space-y-3">
        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">
                {ent ? INDUSTRY_LABELS[ent.industry] : ""} {ent?.scale && `· ${ent.scale}`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                开始 {new Date(conv.createdAt).toLocaleString("zh-CN")}
              </div>
            </div>
            <Badge tone={conv.status === "completed" ? "success" : conv.status === "in_progress" ? "primary" : "muted"}>
              {conv.status === "completed" ? "已完成" : conv.status === "in_progress" ? "进行中" : "已放弃"}
            </Badge>
          </div>

          {/* Score / readiness */}
          {conv.summary ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[color:var(--primary)]/5 p-2">
                <div className="text-[10px] text-muted-foreground">就绪度</div>
                <div className="font-mono text-xl font-semibold text-[color:var(--primary)]">{conv.summary.score}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-[10px] text-muted-foreground">推荐档次</div>
                <div className="text-sm font-semibold">{conv.summary.level}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-[10px] text-muted-foreground">预计周期</div>
                <div className="text-xs font-medium">{conv.summary.cycle}</div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-muted p-2 text-center">
              <div className="text-[10px] text-muted-foreground">整体覆盖度</div>
              <div className="font-mono text-xl font-semibold text-[color:var(--primary)]">{overall}%</div>
            </div>
          )}
        </div>

        {/* Dimension scores */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 text-xs font-semibold">六维分项</div>
          <div className="space-y-2">
            {(Object.keys(DIMENSION_LABELS) as DimensionKey[]).map((k) => {
              const v = conv.summary?.dimension_scores?.[k] ?? conv.progress[k] ?? 0;
              return (
                <div key={k}>
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span>{DIMENSION_LABELS[k]}</span>
                    <span className="font-mono text-muted-foreground">{v}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[color:var(--primary)]" style={{ width: `${v}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary panels */}
        {conv.summary && (
          <>
            {conv.summary.advantages.length > 0 && (
              <Panel title="优势项" items={conv.summary.advantages} tone="success" />
            )}
            {conv.summary.risks.length > 0 && (
              <Panel title="风险项" items={conv.summary.risks} tone="danger" />
            )}
            {conv.summary.decisions.length > 0 && (
              <Panel title="关键决策点" items={conv.summary.decisions} tone="primary" />
            )}
          </>
        )}

        {/* Conversation transcript */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 text-xs font-semibold">对话原文</div>
          <div className="space-y-3">
            {conv.turns.map((t, i) => {
              if (t.role === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[color:var(--primary)] px-3 py-1.5 text-xs text-white">{t.text}</div>
                  </div>
                );
              }
              return (
                <div key={i} className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="space-y-1">
                    {t.text && (
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5 text-xs whitespace-pre-wrap">{t.text}</div>
                    )}
                    {t.card && (
                      <div className="rounded-md border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 px-3 py-1.5 text-[11px]">
                        ❓ {t.card.question}
                        {t.card.options && (
                          <div className="mt-1 text-[10px] text-muted-foreground">{t.card.options.join(" / ")}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <a
          href={`/api/conversations/${conv.id}/export`}
          target="_blank" rel="noopener"
          className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card py-2.5 text-xs text-foreground hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" />
          下载完整诊断报告（Markdown）
        </a>
      </div>
    </MobileShell>
  );
}

function Panel({ title, items, tone }: { title: string; items: string[]; tone: "success" | "danger" | "primary" }) {
  const bg = tone === "success" ? "bg-emerald-50 border-emerald-200" : tone === "danger" ? "bg-red-50 border-red-200" : "bg-[color:var(--primary)]/5 border-[color:var(--primary)]/30";
  const titleColor = tone === "success" ? "text-emerald-700" : tone === "danger" ? "text-red-700" : "text-[color:var(--primary)]";
  return (
    <div className={`rounded-xl border ${bg} p-3`}>
      <div className={`mb-1.5 text-xs font-semibold ${titleColor}`}>{title}</div>
      <ul className="space-y-1.5 text-xs text-foreground">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
