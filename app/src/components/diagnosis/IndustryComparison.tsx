"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Award } from "lucide-react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { DIMENSION_LABELS, INDUSTRY_LABELS, type DimensionKey, type Industry } from "../../lib/diagnosis-types";

interface Stats {
  industry: Industry;
  count: number;
  scoreAvg: number;
  scoreP25: number;
  scoreP50: number;
  scoreP75: number;
  dimensionAvg: Record<DimensionKey, number>;
  levelDist: Record<"L1" | "L2" | "L3", number>;
}

export function IndustryComparison({
  industry, score, dimensionScores,
}: {
  industry: Industry;
  score: number;
  dimensionScores?: Record<DimensionKey, number>;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/benchmark?industry=${industry}&score=${score}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setPercentile(d.percentile);
      })
      .finally(() => setLoading(false));
  }, [industry, score]);

  if (loading) {
    return (
      <Card><CardBody className="py-4 text-center text-xs text-muted-foreground">行业基准加载中...</CardBody></Card>
    );
  }
  if (!stats) return null;

  const lead = percentile !== null
    ? percentile >= 75 ? "领先" : percentile >= 50 ? "中上" : percentile >= 25 ? "中下" : "靠后"
    : "—";
  const leadTone = percentile === null ? "muted" : percentile >= 50 ? "success" : percentile >= 25 ? "warning" : "danger";

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[color:var(--primary)]" />
            同行业参考
          </span>
        }
        desc={`${INDUSTRY_LABELS[industry]} · 样本 ${stats.count} 家`}
        action={<Badge tone={leadTone as never}>{lead}</Badge>}
      />
      <CardBody className="space-y-4">
        {/* Score percentile bar */}
        {percentile !== null && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="font-medium">综合就绪度排名</span>
              <span>
                <span className="font-mono text-[color:var(--primary)]">超过 {percentile}%</span>
                <span className="ml-1 text-muted-foreground">的同行</span>
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              <div
                className="absolute h-full rounded-full bg-[color:var(--primary)]"
                style={{ width: `${percentile}%` }}
              />
              {/* P25 / P50 / P75 ticks */}
              <Tick at={25} label="P25" />
              <Tick at={50} label="P50" />
              <Tick at={75} label="P75" />
            </div>
          </div>
        )}

        {/* Distribution stats */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat icon={Users} label="样本数" value={stats.count} />
          <Stat icon={Award} label="行业均值" value={stats.scoreAvg} suffix="/100" />
          <Stat label="中位数" value={stats.scoreP50} suffix="/100" />
          <Stat label="你的得分" value={score} suffix="/100" highlight />
        </div>

        {/* Dimension comparison */}
        {dimensionScores && (
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">六维分项对比</div>
            <div className="space-y-2">
              {(Object.keys(DIMENSION_LABELS) as DimensionKey[]).map((k) => {
                const mine = dimensionScores[k] ?? 0;
                const avg = stats.dimensionAvg[k] ?? 0;
                const diff = mine - avg;
                return (
                  <div key={k} className="grid grid-cols-[80px_1fr_80px] items-center gap-2 text-xs">
                    <div className="text-foreground">{DIMENSION_LABELS[k]}</div>
                    <DualBar mine={mine} avg={avg} />
                    <div className={`text-right font-mono ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {diff > 0 ? "+" : ""}{diff}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[color:var(--primary)]" />本企业</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-muted-foreground/40" />行业均值</span>
            </div>
          </div>
        )}

        {/* Level distribution */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">同行业落地档次分布</div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {(["L1", "L2", "L3"] as const).map((lv) => {
              const pct = (stats.levelDist[lv] / stats.count) * 100;
              return (
                <div
                  key={lv}
                  style={{ width: `${pct}%` }}
                  className={lv === "L1" ? "bg-amber-400" : lv === "L2" ? "bg-[color:var(--primary)]" : "bg-emerald-500"}
                  title={`${lv} · ${stats.levelDist[lv]} 家 (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />L1 {stats.levelDist.L1}</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[color:var(--primary)]" />L2 {stats.levelDist.L2}</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />L3 {stats.levelDist.L3}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Tick({ at, label }: { at: number; label: string }) {
  return (
    <div className="absolute top-0 h-full" style={{ left: `${at}%` }}>
      <div className="h-full w-px bg-foreground/30" />
      <div className="absolute top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[9px] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, suffix, highlight,
}: { icon?: React.ComponentType<{ className?: string }>; label: string; value: number | string; suffix?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border ${highlight ? "bg-[color:var(--primary)]/5 border-[color:var(--primary)]/30" : "bg-card"} p-2`}>
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-base ${highlight ? "text-[color:var(--primary)] font-semibold" : "text-foreground"}`}>
        {value}{suffix && <span className="ml-0.5 text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function DualBar({ mine, avg }: { mine: number; avg: number }) {
  return (
    <div className="relative h-4">
      {/* Industry avg (background ghost bar) */}
      <div className="absolute inset-y-0 left-0 h-full rounded-sm bg-muted-foreground/25" style={{ width: `${avg}%` }} />
      {/* Mine (foreground primary) */}
      <div className="absolute inset-y-0 left-0 h-full rounded-sm bg-[color:var(--primary)]" style={{ width: `${mine}%`, opacity: 0.9 }} />
    </div>
  );
}
