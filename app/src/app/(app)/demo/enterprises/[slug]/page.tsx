"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Building2, TrendingUp, TrendingDown, Sparkles, Award,
  AlertTriangle, CheckCircle2, Activity, Zap, Calendar, Users, Factory,
  ChevronDown, ChevronRight, Inbox,
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import { PageShell } from "../../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Badge } from "../../../../../components/ui/Badge";
import { CountUp } from "../../../../../components/demo/CountUp";
import { Sparkline } from "../../../../../components/demo/Sparkline";
import { DEMO_ENTERPRISES, DIM_LABELS, getAmibaDetail } from "../../../../../lib/demo-data";
import { AmibaDetailPanel } from "../../../../../components/demo/AmibaDetailPanel";
import type { DimensionKey } from "../../../../../lib/diagnosis-types";

export default function EnterpriseDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const ent = DEMO_ENTERPRISES[slug];

  if (!ent) {
    return (
      <PageShell title="未找到该企业">
        <Link href="/dashboard" className="text-sm text-[color:var(--primary)]">← 返回总览</Link>
      </PageShell>
    );
  }

  const isPending = ent.stage === "pending";
  const radarData = (Object.keys(DIM_LABELS) as DimensionKey[]).map((k) => ({
    dim: DIM_LABELS[k],
    本企业: ent.dimensions[k],
    行业均值: ent.industryAvg[k],
    fullMark: 100,
  }));

  return (
    <PageShell title={ent.name} subtitle={`${ent.industryLabel} · ${ent.scale} · ${ent.stageLabel}`}>
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> 返回总览
        </Link>

        <HeroBanner ent={ent} />

        {!isPending && (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile label="综合就绪度" value={ent.score} suffix=" / 100" delta="+5 vs 上次" tone="primary" icon={Award} />
              <KpiTile label="本月营收" value={ent.monthlyTrend.at(-1)?.revenue ?? 0} suffix=" 万元" delta="+8.4%" tone="success" icon={TrendingUp} />
              <KpiTile label="综合毛利率" value={ent.monthlyTrend.at(-1)?.grossMargin ?? 0} suffix="%" decimals={1} delta="+1.8pp" tone="success" icon={Activity} />
              <KpiTile label="平均 OEE" value={ent.monthlyTrend.at(-1)?.oee ?? 0} suffix="%" delta="+3pp" tone="primary" icon={Zap} />
            </div>

            {/* Radar + Trend */}
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-2 animate-fade-up">
                <CardHeader title="六维就绪度雷达" desc={`vs ${ent.industryLabel}行业均值`} />
                <CardBody>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius={95}>
                        <PolarGrid stroke="rgba(45,42,142,0.15)" />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: "#5e6586" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="行业均值" dataKey="行业均值" stroke="#9ed4f6" fill="#9ed4f6" fillOpacity={0.35} />
                        <Radar name="本企业" dataKey="本企业" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} animationBegin={200} animationDuration={1200} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>

              <Card className="lg:col-span-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
                <CardHeader
                  title="12 个月经营趋势"
                  desc="营收（柱）· 毛利率（线）· OEE（线）"
                  action={
                    <Badge tone="primary">
                      <TrendingUp className="h-3 w-3" /> 持续上行
                    </Badge>
                  }
                />
                <CardBody>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ent.monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5e6586" }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#5e6586" }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#5e6586" }} unit="%" />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="revenue" name="营收(万元)" fill="var(--primary)" radius={[4, 4, 0, 0]} animationDuration={1400} />
                        <Line yAxisId="right" type="monotone" dataKey="grossMargin" name="毛利率" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} animationDuration={1400} />
                        <Line yAxisId="right" type="monotone" dataKey="oee" name="OEE" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} animationDuration={1400} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Amibas + Events */}
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3 animate-fade-up" style={{ animationDelay: "150ms" }}>
                <CardHeader title="各阿米巴运行台账" desc="点击展开阿米巴明细 · 含员工 / 设备 / 能耗 / 辅料" />
                <CardBody className="px-0 py-0">
                  <AmibaTable slug={ent.slug} amibas={ent.amibas} />
                </CardBody>
              </Card>

              <Card className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "200ms" }}>
                <CardHeader title="实时活动" desc="智能体推送" action={<span className="flex items-center gap-1 text-xs text-emerald-600"><span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-emerald-500" /></span>LIVE</span>} />
                <CardBody className="space-y-3" data-stagger>
                  {ent.events.map((e, i) => (
                    <div key={i} className="flex gap-3 animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
                      <EventIcon kind={e.kind} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium">{e.title}</div>
                        {e.desc && <div className="mt-0.5 text-[11px] text-muted-foreground">{e.desc}</div>}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{e.at}</div>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>

            {/* Dimension bars + Industry rank */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="animate-fade-up" style={{ animationDelay: "250ms" }}>
                <CardHeader title="六维分项对比" desc="本企业（蓝） vs 行业均值（灰）" />
                <CardBody className="space-y-2.5">
                  {(Object.keys(DIM_LABELS) as DimensionKey[]).map((k, i) => {
                    const mine = ent.dimensions[k];
                    const avg = ent.industryAvg[k];
                    const diff = mine - avg;
                    return (
                      <div key={k} className="space-y-1">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-medium">{DIM_LABELS[k]}</span>
                          <span className={`font-mono ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {mine} {diff !== 0 && <span className="ml-1 text-[10px]">({diff > 0 ? "+" : ""}{diff})</span>}
                          </span>
                        </div>
                        <div className="relative h-3 rounded-full bg-muted">
                          <div className="absolute h-full rounded-full bg-muted-foreground/30" style={{ width: `${avg}%` }} />
                          <div
                            className="absolute h-full rounded-full bg-[color:var(--primary)] animate-bar-grow"
                            style={{ "--bar-target": `${mine}%`, animationDelay: `${i * 80}ms` } as React.CSSProperties}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>

              <Card className="animate-fade-up" style={{ animationDelay: "300ms" }}>
                <CardHeader title="行业排名分布" desc={`样本 ${ent.industryRank.sampleSize} 家 · ${ent.industryLabel}`} />
                <CardBody>
                  <div className="mb-4 text-center">
                    <div className="text-xs text-muted-foreground">综合就绪度排名</div>
                    <div className="my-1">
                      <span className="text-4xl font-semibold text-[color:var(--primary)]">
                        <CountUp value={ent.industryRank.percentile} />
                      </span>
                      <span className="text-base text-muted-foreground">%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">超过 {ent.industryRank.percentile}% 的同行</div>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[color:var(--primary)] animate-bar-grow"
                      style={{ "--bar-target": `${ent.industryRank.percentile}%` } as React.CSSProperties}
                    />
                    {[25, 50, 75].map((t) => (
                      <div key={t} className="absolute top-0 h-full" style={{ left: `${t}%` }}>
                        <div className="h-full w-px bg-foreground/30" />
                        <div className="absolute top-full mt-1 -translate-x-1/2 text-[9px] text-muted-foreground">P{t}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ent.monthlyTrend.slice(-6)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <Area type="monotone" dataKey="laborProductivity" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2} animationDuration={1400} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="mt-1 text-center text-[10px] text-muted-foreground">近 6 月单工时产值（千元）走势</div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Strengths / Risks / Decisions */}
            <div className="grid gap-4 lg:grid-cols-3">
              <PanelCard tone="success" icon={CheckCircle2} title="优势项" items={ent.advantages} />
              <PanelCard tone="danger" icon={AlertTriangle} title="风险项" items={ent.risks} />
              <PanelCard tone="primary" icon={Sparkles} title="关键决策点" items={ent.decisions} />
            </div>

            {/* Facts */}
            <Card className="animate-fade-up" style={{ animationDelay: "350ms" }}>
              <CardHeader title="基础档案" />
              <CardBody>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" data-stagger>
                  {ent.facts.map((f, i) => (
                    <div key={f.label} className="rounded-lg border border-border bg-muted/30 px-4 py-3 animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
                      <div className="text-[11px] text-muted-foreground">{f.label}</div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">{f.value}</div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {isPending && (
          <Card>
            <CardBody className="py-16 text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="mb-1 text-base font-semibold">尚未发起诊断</div>
              <div className="mb-4 text-xs text-muted-foreground">前往诊断引擎为该企业开启首次诊断对话</div>
              <Link href="/diagnosis" className="inline-flex items-center gap-1 rounded-md bg-[color:var(--primary)] px-4 py-2 text-xs text-white hover:brightness-110">
                <Sparkles className="h-3.5 w-3.5" /> 进入诊断引擎
              </Link>
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function AmibaTable({ slug, amibas }: { slug: string; amibas: typeof DEMO_ENTERPRISES[string]["amibas"] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
        <tr>
          <th className="w-8 px-2 py-2"></th>
          <th className="px-2 py-2 text-left font-medium">阿米巴</th>
          <th className="px-2 py-2 text-left font-medium">阿米巴长</th>
          <th className="px-2 py-2 text-right font-medium">营收</th>
          <th className="px-2 py-2 text-right font-medium">利润</th>
          <th className="px-2 py-2 text-right font-medium">利润率</th>
          <th className="px-2 py-2 text-center font-medium">趋势</th>
          <th className="px-4 py-2 text-right font-medium">状态</th>
        </tr>
      </thead>
      <tbody data-stagger>
        {amibas.map((a, i) => {
          const open = openIdx === i;
          const detail = getAmibaDetail(slug, a.name);
          return (
            <React.Fragment key={a.name}>
              <tr
                onClick={() => setOpenIdx(open ? null : i)}
                className={`group cursor-pointer border-b border-border animate-fade-up transition ${
                  open ? "bg-[color:var(--primary)]/5" : "hover:bg-muted/40"
                }`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <td className="w-8 px-2 py-2.5 text-muted-foreground">
                  {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />}
                </td>
                <td className="px-2 py-2.5 font-medium">{a.name}</td>
                <td className="px-2 py-2.5 text-xs text-muted-foreground">{a.leader}</td>
                <td className="px-2 py-2.5 text-right font-mono">{a.revenue}</td>
                <td className="px-2 py-2.5 text-right font-mono">{a.profit}</td>
                <td className={`px-2 py-2.5 text-right font-mono ${
                  a.profitMargin >= 20 ? "text-emerald-600" : a.profitMargin >= 10 ? "text-foreground" : "text-amber-600"
                }`}>
                  {a.profitMargin.toFixed(1)}%
                </td>
                <td className="px-2 py-2.5 text-center">
                  <div className="inline-block">
                    <Sparkline
                      data={a.sparkline}
                      color={a.status === "outperform" ? "#16a34a" : a.status === "warning" ? "#d97706" : "var(--primary)"}
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Badge tone={a.status === "outperform" ? "success" : a.status === "warning" ? "warning" : "primary"}>
                    {a.status === "outperform" ? "超预期" : a.status === "warning" ? "需关注" : "正常"}
                  </Badge>
                </td>
              </tr>
              {open && (
                <tr>
                  <td colSpan={8} className="bg-muted/20 px-3 py-3 lg:px-5 lg:py-4">
                    {detail ? (
                      <AmibaDetailPanel
                        detail={detail}
                        revenue={a.revenue}
                        profit={a.profit}
                        profitMargin={a.profitMargin}
                        enterpriseSlug={slug}
                      />
                    ) : (
                      <NoDetailHint name={a.name} />
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function NoDetailHint({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
      <Inbox className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div>
        <div className="font-medium text-foreground">{name} 的明细数据未录入</div>
        <div className="text-xs">运营人员可在管理后台补充员工、设备、能耗与辅料清单。</div>
      </div>
    </div>
  );
}

function HeroBanner({ ent }: { ent: typeof DEMO_ENTERPRISES[string] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm animate-fade-up">
      <div className="brand-gradient relative px-6 py-8 text-white">
        <div className="absolute inset-0 opacity-15 shimmer" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-xl font-semibold">{ent.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
                <Factory className="h-3 w-3" /> {ent.industryLabel}
                <span className="opacity-50">·</span>
                <Users className="h-3 w-3" /> {ent.scale}
                <span className="opacity-50">·</span>
                <Calendar className="h-3 w-3" /> 成立 {ent.founded}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/70">综合就绪度</div>
            <div className="mt-0.5 flex items-baseline justify-end gap-1">
              <span className="text-4xl font-semibold">
                <CountUp value={ent.score} />
              </span>
              <span className="text-sm text-white/70">/ 100</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 text-xs text-white/80">
              <Badge tone="default" className="bg-white/15 text-white border-white/20">推荐 {ent.level}</Badge>
              <span>{ent.cycle}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  label, value, suffix, decimals = 0, delta, tone, icon: Icon,
}: {
  label: string; value: number; suffix?: string; decimals?: number;
  delta?: string;
  tone: "primary" | "success";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const positive = delta?.startsWith("+");
  return (
    <Card className="animate-fade-up">
      <CardBody>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            tone === "primary" ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)]" : "bg-emerald-50 text-emerald-600"
          }`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-2xl font-semibold text-foreground">
          <CountUp value={value} decimals={decimals} suffix={suffix} />
        </div>
        {delta && (
          <div className={`mt-0.5 flex items-center gap-0.5 text-[11px] ${positive ? "text-emerald-600" : "text-red-600"}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function EventIcon({ kind }: { kind: "milestone" | "alert" | "achievement" | "metric" }) {
  const map = {
    milestone: { bg: "bg-[color:var(--primary)]/10", color: "text-[color:var(--primary)]", Icon: Calendar },
    alert: { bg: "bg-red-50", color: "text-red-600", Icon: AlertTriangle },
    achievement: { bg: "bg-emerald-50", color: "text-emerald-600", Icon: Award },
    metric: { bg: "bg-amber-50", color: "text-amber-600", Icon: TrendingUp },
  } as const;
  const c = map[kind];
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.color}`}>
      <c.Icon className="h-3.5 w-3.5" />
    </div>
  );
}

function PanelCard({
  tone, icon: Icon, title, items,
}: {
  tone: "success" | "danger" | "primary";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-[color:var(--primary)]";
  const dot = tone === "success" ? "bg-emerald-500" : tone === "danger" ? "bg-red-500" : "bg-[color:var(--primary)]";
  return (
    <Card className="animate-fade-up">
      <CardHeader title={<span className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /> {title}</span>} />
      <CardBody>
        <ul className="space-y-2" data-stagger>
          {items.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
