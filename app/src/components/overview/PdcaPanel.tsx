"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, CheckCircle2, Target, ChevronRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import type { Diagnosis } from "../../lib/diagnosis";
import type { DeployTask } from "../../lib/deploy-types";

const yuan = (n: number) => "¥" + Math.round(n).toLocaleString("zh-CN");
const LV_COLOR = ["#94a3b8", "#dc2626", "#d97706", "#4a90d9", "#2d2a8e", "#16a34a"];

// 总览·PDCA 改进成果：部署任务实时统计 ↔ 诊断/就绪度的"改进前(baseline) → 当前"对比
export function PdcaPanel({ enterpriseId }: { enterpriseId: string }) {
  const [now, setNow] = useState<Diagnosis | null>(null);
  const [base, setBase] = useState<Diagnosis | null>(null);
  const [tasks, setTasks] = useState<DeployTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/diagnosis?enterpriseId=${enterpriseId}`).then((r) => r.json()),
      fetch(`/api/diagnosis?enterpriseId=${enterpriseId}&baseline=1`).then((r) => r.json()),
      fetch(`/api/deploy?enterpriseId=${enterpriseId}`).then((r) => r.json()),
    ]).then(([n, b, d]) => { setNow(n?.summary ? n : null); setBase(b?.summary ? b : null); setTasks(d.tasks || []); setLoading(false); });
  }, [enterpriseId]);

  if (loading) return <Card><CardBody className="py-8 text-center text-xs text-muted-foreground"><Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin" />加载改进成果…</CardBody></Card>;
  if (!now || !base) return null;

  const total = tasks.length, done = tasks.filter((t) => t.status === "done").length, doing = tasks.filter((t) => t.status === "doing").length;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const savedRealized = Math.max(0, base.summary.overspend - now.summary.overspend);
  const savedPlanned = tasks.reduce((s, t) => s + (t.saving || 0), 0);
  const rNow = now.maturity.overall, rBase = base.maturity.overall, rDelta = rNow - rBase;

  const Pair = ({ label, from, to, suffix = "", better = "down" }: { label: string; from: number; to: number; suffix?: string; better?: "down" | "up" }) => {
    const improved = better === "down" ? to < from : to > from;
    return (
      <div className="rounded-lg border border-border p-2.5">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5 text-sm">
          <span className="text-muted-foreground line-through decoration-1">{from}{suffix}</span>
          <span className="text-muted-foreground">→</span>
          <span className={`font-mono text-base font-semibold ${improved ? "text-emerald-600" : ""}`}>{to}{suffix}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader title="PDCA 改进成果（部署落地 → 实时回写）" desc="部署引擎里任务标记「已完成」即回写实际、重算差值，下面是改进前→当前的实时对比"
        action={<TrendingUp className="h-4 w-4 text-[color:var(--primary)]" />} />
      <CardBody className="space-y-3">
        {/* 诊断问题数 + 部署任务数 */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
          <span>诊断问题 <b className="text-red-600">{now.costFindings.length + now.summary.methodGaps + now.summary.qualityIssues + now.summary.riskNodes + now.summary.incompleteNodes}</b>
            <span className="ml-1 text-[10px] text-muted-foreground">超支 {now.costFindings.length} · 信息化 {now.summary.methodGaps} · 质量 {now.summary.qualityIssues} · 三性 {now.summary.riskNodes} · 待补 {now.summary.incompleteNodes}</span>
          </span>
          <span className="text-border">|</span>
          <span>部署任务 <b className="text-[color:var(--primary)]">{total}</b>
            <span className="ml-1 text-[10px] text-muted-foreground">完成 {done} · 进行中 {doing} · 待开始 {total - done - doing}</span>
          </span>
        </div>
        {/* 任务进度 + 节省 + 就绪度 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href={`/e/${enterpriseId}/deployment`} className="group rounded-lg border border-border p-3 transition-colors hover:border-[color:var(--primary)]/50 hover:bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />改进任务进度<ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>
            <div className="mt-1 text-2xl font-bold">{done}<span className="text-sm font-normal text-muted-foreground"> / {total}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} /></div>
            <div className="mt-1 text-[10px] text-muted-foreground">完成率 {rate}% · 进行中 {doing} · 点击看甘特图</div>
          </Link>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium"><Target className="h-3.5 w-3.5 text-[color:var(--primary)]" />已实现降本</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">{yuan(savedRealized)}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">计划目标 {yuan(savedPlanned)} · 已实现 {savedPlanned ? Math.round((savedRealized / savedPlanned) * 100) : 0}%</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs font-medium">综合就绪度</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground line-through">{rBase}</span>
              <span className="text-2xl font-bold" style={{ color: LV_COLOR[now.maturity.level] }}>{rNow}</span>
              {rDelta > 0 && <span className="text-xs font-medium text-emerald-600">▲ {rDelta}</span>}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">{now.maturity.levelLabel}</div>
          </div>
        </div>

        {/* 关键指标改进前→当前 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Pair label="总超支" from={Math.round(base.summary.overspend)} to={Math.round(now.summary.overspend)} suffix=" 元" />
          <Pair label="信息化差距" from={base.summary.methodGaps} to={now.summary.methodGaps} />
          <Pair label="质量问题" from={base.summary.qualityIssues} to={now.summary.qualityIssues} />
          <Pair label="成本可控度" from={base.maturity.dims.find((d) => d.key === "cost")?.score ?? 0} to={now.maturity.dims.find((d) => d.key === "cost")?.score ?? 0} suffix=" 分" better="up" />
        </div>
        {done === 0 && <div className="text-[11px] text-muted-foreground">提示：到「部署引擎」把改进任务状态点成"已完成"，这里会实时显示降本与就绪度提升。</div>}
      </CardBody>
    </Card>
  );
}
