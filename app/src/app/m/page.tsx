"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, MessageSquare, Building2, Award } from "lucide-react";
import { MobileShell } from "../../components/mobile/MobileShell";
import { INDUSTRY_LABELS, type DiagnosisSummary, type Industry } from "../../lib/diagnosis-types";

interface Enterprise { id: string; name: string; industry: Industry; latestSummary?: DiagnosisSummary | null }
interface ConvSummary { id: string; enterpriseId: string; status: string; turnCount: number; updatedAt: string }

export default function MobileHome() {
  const [ents, setEnts] = useState<Enterprise[]>([]);
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/enterprises").then((r) => r.json()),
      fetch("/api/conversations").then((r) => r.json()),
    ]).then(([e, c]) => {
      setEnts(e.enterprises || []);
      setConvs(c.conversations || []);
      setLoading(false);
    });
  }, []);

  const completed = ents.filter((e) => e.latestSummary);
  const recent = convs.slice(0, 3);

  return (
    <MobileShell title="Amoeba Copilot">
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">加载中...</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl brand-gradient p-4 text-white shadow">
            <div className="text-xs opacity-80">已服务企业</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-3xl font-semibold">{ents.length}</div>
              <div className="text-xs opacity-80">家 · 已完成 {completed.length} 份诊断</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/m/conversations" className="rounded-xl border border-border bg-card p-3">
              <MessageSquare className="mb-1.5 h-5 w-5 text-[color:var(--primary)]" />
              <div className="text-sm font-medium">诊断对话</div>
              <div className="text-[11px] text-muted-foreground">查看历史会话</div>
            </Link>
            <Link href="/m/enterprises" className="rounded-xl border border-border bg-card p-3">
              <Building2 className="mb-1.5 h-5 w-5 text-[color:var(--primary)]" />
              <div className="text-sm font-medium">企业画像</div>
              <div className="text-[11px] text-muted-foreground">查看诊断得分</div>
            </Link>
          </div>

          {completed.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold">最近诊断得分</span>
              </div>
              <div className="space-y-2">
                {completed.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={`/m/enterprises/${e.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {INDUSTRY_LABELS[e.industry]} · {e.latestSummary?.level} · 周期 {e.latestSummary?.cycle}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">就绪度</div>
                        <div className="font-mono text-lg font-semibold text-[color:var(--primary)]">{e.latestSummary?.score}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <div className="mb-2 text-xs font-semibold">最近会话</div>
              <div className="space-y-2">
                {recent.map((c) => {
                  const ent = ents.find((e) => e.id === c.enterpriseId);
                  return (
                    <Link key={c.id} href={`/m/conversations/${c.id}`} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{ent?.name || c.enterpriseId}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.turnCount} 轮 · {new Date(c.updatedAt).toLocaleString("zh-CN")}
                        </div>
                      </div>
                      <div className={`rounded px-1.5 py-0.5 text-[10px] ${
                        c.status === "completed" ? "bg-emerald-100 text-emerald-700"
                          : c.status === "in_progress" ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {c.status === "completed" ? "已完成" : c.status === "in_progress" ? "进行中" : "已放弃"}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {ents.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              暂无企业档案 · 请使用 PC 端创建并发起诊断
            </div>
          )}
        </div>
      )}
    </MobileShell>
  );
}
