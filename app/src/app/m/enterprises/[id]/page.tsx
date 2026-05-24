"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { MobileShell } from "../../../../components/mobile/MobileShell";
import { IndustryComparison } from "../../../../components/diagnosis/IndustryComparison";
import {
  DIMENSION_LABELS, INDUSTRY_LABELS,
  type DimensionKey, type DiagnosisSummary, type Industry,
} from "../../../../lib/diagnosis-types";

interface Enterprise {
  id: string; name: string; industry: Industry; scale?: string;
  latestSummary?: DiagnosisSummary | null;
  memory?: string;
}

export default function MobileEnterpriseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [e, setE] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/enterprises/${id}`).then((r) => r.json()).then((d) => {
      setE(d.enterprise || null); setLoading(false);
    });
  }, [id]);

  if (loading) return <MobileShell title="企业画像"><div className="py-10 text-center text-sm text-muted-foreground">加载中...</div></MobileShell>;
  if (!e) return <MobileShell title="企业画像"><div className="py-10 text-center text-sm text-muted-foreground">未找到</div></MobileShell>;

  return (
    <MobileShell title={e.name}>
      <Link href="/m/enterprises" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3 w-3" /> 返回企业列表
      </Link>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{e.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {INDUSTRY_LABELS[e.industry]}{e.scale && ` · ${e.scale}`}
            </div>
          </div>
        </div>

        {!e.latestSummary ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            该企业尚无完成的诊断
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[color:var(--primary)]/5 p-2">
                <div className="text-[10px] text-muted-foreground">就绪度</div>
                <div className="font-mono text-xl font-semibold text-[color:var(--primary)]">{e.latestSummary.score}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-[10px] text-muted-foreground">推荐档次</div>
                <div className="text-base font-semibold">{e.latestSummary.level}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-[10px] text-muted-foreground">预计周期</div>
                <div className="text-xs font-medium">{e.latestSummary.cycle}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 text-xs font-semibold">六维分项</div>
              {(Object.keys(DIMENSION_LABELS) as DimensionKey[]).map((k) => {
                const v = e.latestSummary?.dimension_scores?.[k] ?? 0;
                return (
                  <div key={k} className="mb-2 last:mb-0">
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

            <IndustryComparison
              industry={e.industry}
              score={e.latestSummary.score}
              dimensionScores={e.latestSummary.dimension_scores}
            />

            {e.latestSummary.advantages.length > 0 && (
              <MiniPanel title="优势项" items={e.latestSummary.advantages} tone="success" />
            )}
            {e.latestSummary.risks.length > 0 && (
              <MiniPanel title="风险项" items={e.latestSummary.risks} tone="danger" />
            )}
            {e.latestSummary.decisions.length > 0 && (
              <MiniPanel title="关键决策点" items={e.latestSummary.decisions} tone="primary" />
            )}
          </>
        )}

        {e.memory && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-1 text-xs font-semibold">长期记忆</div>
            <div className="whitespace-pre-wrap text-[11px] text-foreground">{e.memory}</div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function MiniPanel({ title, items, tone }: { title: string; items: string[]; tone: "success" | "danger" | "primary" }) {
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
