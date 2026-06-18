"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, TrendingUp, Info,
  Calendar, Activity, Bell, ExternalLink, Clock, Target,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, LabelList, Cell,
} from "recharts";
import { PageShell } from "../../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Badge } from "../../../../../components/ui/Badge";
import { DEMO_ALERTS, type Severity } from "../../../../../lib/demo-data";

const SEV_META: Record<Severity, { label: string; color: string; bg: string; ring: string; icon: React.ComponentType<{ className?: string }> }> = {
  danger:  { label: "P0 红色 · 紧急", color: "text-red-600",      bg: "bg-red-50",      ring: "animate-pulse-ring",         icon: AlertTriangle },
  warning: { label: "P1 黄色 · 关注", color: "text-amber-600",    bg: "bg-amber-50",    ring: "animate-pulse-ring-warn",    icon: AlertTriangle },
  success: { label: "绿色 · 亮点",    color: "text-emerald-600",  bg: "bg-emerald-50",  ring: "animate-pulse-ring-success", icon: CheckCircle2 },
  info:    { label: "信息",          color: "text-[color:var(--primary)]", bg: "bg-[color:var(--primary)]/8", ring: "", icon: Info },
};

export default function AlertDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const alert = DEMO_ALERTS[slug];

  if (!alert) {
    return (
      <PageShell title="未找到该预警">
        <Link href="/dashboard" className="text-sm text-[color:var(--primary)]">← 返回总览</Link>
      </PageShell>
    );
  }

  const meta = SEV_META[alert.severity];
  const SevIcon = meta.icon;
  const trendStroke =
    alert.severity === "danger" ? "#dc2626" :
    alert.severity === "warning" ? "#d97706" :
    alert.severity === "success" ? "#16a34a" : "var(--primary)";

  return (
    <PageShell title={alert.title} subtitle={alert.oneLine}>
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> 返回总览
        </Link>

        {/* Hero */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm animate-fade-up">
          <div className={`relative ${meta.bg} px-6 py-6`}>
            <div className="flex items-center gap-4">
              <div className={`relative flex h-14 w-14 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>
                <span className={`absolute inset-0 rounded-full ${meta.ring}`} aria-hidden />
                <SevIcon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={alert.severity === "danger" ? "danger" : alert.severity === "warning" ? "warning" : alert.severity === "success" ? "success" : "primary"}>
                    {meta.label}
                  </Badge>
                  {alert.enterpriseName && (
                    <Link href={`/demo/enterprises/${alert.enterpriseSlug}`}
                      className="inline-flex items-center gap-1 text-xs text-[color:var(--primary)] hover:underline">
                      {alert.enterpriseName} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <div className="mt-1 text-lg font-semibold">{alert.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{alert.oneLine}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">触发时间</div>
                <div className="mt-0.5 text-sm font-medium">{alert.raisedAt}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> 已持续 {alert.ageHours} 小时
                </div>
              </div>
            </div>

            {/* Quick stats strip */}
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
              {alert.facts.map((f) => (
                <div key={f.label} className="rounded-lg bg-card/80 px-3 py-2 backdrop-blur">
                  <div className="text-[10px] text-muted-foreground">{f.label}</div>
                  <div className="mt-0.5 text-sm font-medium">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          {/* Trigger trend chart */}
          <Card className="lg:col-span-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[color:var(--primary)]" />
                  触发趋势 · {alert.trendLabel}
                </span>
              }
              desc={alert.trend.some((p) => p.threshold !== undefined) ? "虚线为预警阈值" : ""}
            />
            <CardBody>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={alert.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="alertTrend" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={trendStroke} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={trendStroke} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#5e6586" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#5e6586" }} unit={alert.trendUnit} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v) => [`${v} ${alert.trendUnit}`, alert.trendLabel]} />
                    {alert.trend.find((p) => p.threshold !== undefined)?.threshold !== undefined && (
                      <ReferenceLine
                        y={alert.trend.find((p) => p.threshold !== undefined)!.threshold}
                        stroke="#dc2626" strokeDasharray="4 4" label={{ value: "阈值", fontSize: 10, fill: "#dc2626", position: "right" }}
                      />
                    )}
                    <Area
                      type="monotone" dataKey="value" stroke={trendStroke} strokeWidth={2}
                      fill="url(#alertTrend)" animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Impact analysis */}
          <Card className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <CardHeader title="影响范围分析" desc="按受影响程度排序" />
            <CardBody>
              <div className="space-y-3" data-stagger>
                {alert.impact
                  .sort((a, b) => b.severity - a.severity)
                  .map((imp, i) => (
                    <div key={imp.area} className="animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
                      <div className="mb-0.5 flex items-baseline justify-between text-xs">
                        <span className="font-medium">{imp.area}</span>
                        <span className={`font-mono ${
                          imp.severity >= 70 ? "text-red-600" :
                          imp.severity >= 40 ? "text-amber-600" : "text-muted-foreground"
                        }`}>{imp.severity}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full animate-bar-grow ${
                            imp.severity >= 70 ? "bg-red-500" :
                            imp.severity >= 40 ? "bg-amber-500" : "bg-muted-foreground/50"
                          }`}
                          style={{ "--bar-target": `${imp.severity}%`, animationDelay: `${i * 80}ms` } as React.CSSProperties}
                        />
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{imp.note}</div>
                    </div>
                  ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Timeline + Actions */}
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <CardHeader title="事件时间线" desc="导致预警触发的关键节点" />
            <CardBody>
              <ol className="relative space-y-4 border-l-2 border-border pl-6" data-stagger>
                {alert.timeline.map((t, i) => (
                  <TimelineItem key={i} item={t} i={i} />
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "250ms" }}>
            <CardHeader
              title={<span className="flex items-center gap-2"><Target className="h-4 w-4 text-[color:var(--primary)]" /> 推荐行动</span>}
              desc={`${alert.actions.filter((a) => a.priority === "high").length} 项高优先级`}
            />
            <CardBody className="space-y-2.5" data-stagger>
              {alert.actions.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-3 py-2.5 animate-fade-up ${
                    a.priority === "high" ? "border-red-200 bg-red-50/50" :
                    a.priority === "medium" ? "border-amber-200 bg-amber-50/50" :
                    "border-border bg-muted/30"
                  }`}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <div className="flex items-start gap-2">
                    <PriorityDot p={a.priority} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {a.owner && <span>👤 {a.owner}</span>}
                        {a.due && <span><Calendar className="mr-0.5 inline h-3 w-3" />{a.due}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Impact bar chart bottom (visual emphasis) */}
        <Card className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <CardHeader title="影响范围 · 横向对比" />
          <CardBody>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...alert.impact].sort((a, b) => b.severity - a.severity)}
                  layout="vertical"
                  margin={{ top: 4, right: 32, left: 100, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#5e6586" }} />
                  <YAxis type="category" dataKey="area" tick={{ fontSize: 11, fill: "#0f1334" }} width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => [`${v}`, "影响度"]} />
                  <Bar dataKey="severity" animationDuration={1200} radius={[0, 4, 4, 0]}>
                    {alert.impact.map((imp, i) => (
                      <Cell key={i} fill={
                        imp.severity >= 70 ? "#dc2626" :
                        imp.severity >= 40 ? "#d97706" : "#5e6586"
                      } />
                    ))}
                    <LabelList dataKey="severity" position="right" style={{ fontSize: 11, fill: "#0f1334" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Footer actions */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bell className="h-3.5 w-3.5" />
            点击行动条目可分配责任人 · 这是演示数据，未连接生产工单系统
          </div>
          {alert.enterpriseSlug && (
            <Link
              href={`/demo/enterprises/${alert.enterpriseSlug}`}
              className="inline-flex items-center gap-1 text-xs text-[color:var(--primary)] hover:underline"
            >
              查看该企业完整画像 <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function TimelineItem({ item, i }: { item: { at: string; kind: "info" | "warn" | "trigger" | "action"; title: string; desc?: string }; i: number }) {
  const dotMap = {
    info:    { bg: "bg-muted-foreground/40",  ring: "" },
    warn:    { bg: "bg-amber-500",            ring: "" },
    trigger: { bg: "bg-red-500",              ring: "animate-pulse-ring" },
    action:  { bg: "bg-[color:var(--primary)]", ring: "" },
  } as const;
  const c = dotMap[item.kind];
  return (
    <li className="relative animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
      <span className={`absolute -left-[31px] top-1.5 flex h-3 w-3 items-center justify-center`}>
        <span className={`relative h-3 w-3 rounded-full ${c.bg} ${c.ring}`} />
      </span>
      <div className="text-[11px] text-muted-foreground">{item.at}</div>
      <div className="mt-0.5 text-sm font-medium">{item.title}</div>
      {item.desc && <div className="mt-0.5 text-xs text-muted-foreground">{item.desc}</div>}
    </li>
  );
}

function PriorityDot({ p }: { p: "high" | "medium" | "low" }) {
  const c = p === "high" ? "bg-red-500" : p === "medium" ? "bg-amber-500" : "bg-muted-foreground";
  return <span className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full ${c}`} />;
}
