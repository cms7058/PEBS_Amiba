"use client";

import {
  Users, Wrench, Zap, Package, Sparkles, AlertTriangle, ArrowUpRight,
  TrendingUp, TrendingDown, Plane, Banknote, BoxesIcon, Hash,
  ShoppingBag, Trash2, Calculator, Shield, Network, ChevronDown, ChevronRight,
  AlertCircle, RotateCcw, FlaskConical, BatteryLow, Clock, Mail, Recycle,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList,
} from "recharts";
import { useState } from "react";
import type { AmibaDetail } from "../../lib/demo-data";
import { getAccountingRules, getGovernanceRules, getDataArchitecture } from "../../lib/demo-data";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

const BREAKDOWN_META: Array<{ key: keyof AmibaDetail["breakdown"]; label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "labor",      label: "人工",       color: "#2d2a8e", icon: Users },
  { key: "materials",  label: "直接物料",   color: "#4a90d9", icon: BoxesIcon },
  { key: "auxiliary",  label: "辅料 / 耗材", color: "#9ed4f6", icon: Package },
  { key: "energy",     label: "能耗",       color: "#d97706", icon: Zap },
  { key: "equipment",  label: "设备折旧",   color: "#16a34a", icon: Wrench },
  { key: "travel",     label: "差旅",       color: "#a855f7", icon: Plane },
  { key: "finance",    label: "财务费用",   color: "#0891b2", icon: Banknote },
  { key: "other",      label: "其他分摊",   color: "#94a3b8", icon: Hash },
];

export function AmibaDetailPanel({
  detail, revenue, profit, profitMargin, enterpriseSlug,
}: {
  detail: AmibaDetail;
  revenue: number;
  profit: number;
  profitMargin: number;
  enterpriseSlug: string;
}) {
  const totalCost = BREAKDOWN_META.reduce((s, m) => s + detail.breakdown[m.key], 0);
  const pieData = BREAKDOWN_META
    .map((m) => ({ name: m.label, value: detail.breakdown[m.key], color: m.color, key: m.key }))
    .filter((d) => d.value > 0);
  const totalHours = detail.employees.reduce((s, e) => s + e.hours, 0);
  const totalLaborCost = detail.employees.reduce((s, e) => s + e.cost, 0);

  return (
    <div className="space-y-4 rounded-lg border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/[0.03] p-4 animate-fade-up">
      {/* Top stat strip */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MiniStat label="总营收" value={revenue} suffix="万元" tone="primary" />
        <MiniStat label="总成本" value={totalCost} suffix="万元" tone="muted" />
        <MiniStat label="本月利润" value={profit} suffix="万元" tone={profit >= 0 ? "success" : "danger"} />
        <MiniStat label="利润率" value={profitMargin} decimals={1} suffix="%" tone={profitMargin >= 15 ? "success" : profitMargin >= 8 ? "primary" : "warning"} />
      </div>

      {/* Cost structure: donut + bar */}
      <div className="grid gap-4 lg:grid-cols-5">
        <DetailCard title="成本结构" icon={Hash} className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" innerRadius={52} outerRadius={82}
                    paddingAngle={1.5} stroke="#fff" strokeWidth={2}
                    animationDuration={1000}
                  >
                    {pieData.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(v) => [`${v} 万元`, "金额"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[10px] text-muted-foreground">总成本</div>
                <div className="font-mono text-lg font-semibold text-foreground">{totalCost}</div>
                <div className="text-[10px] text-muted-foreground">万元</div>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              {pieData.map((d) => (
                <div key={d.key} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="font-mono text-foreground">{((d.value / totalCost) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </DetailCard>

        <DetailCard title="成本拆解" icon={TrendingDown} className="lg:col-span-3">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={BREAKDOWN_META.map((m) => ({ name: m.label, value: detail.breakdown[m.key], color: m.color }))}
                layout="vertical"
                margin={{ top: 4, right: 32, left: 60, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#5e6586" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#0f1334" }} width={60} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  formatter={(v) => [`${v} 万元`, "金额"]} cursor={{ fill: "rgba(45,42,142,0.05)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={900}>
                  {BREAKDOWN_META.map((m, i) => (
                    <Cell key={i} fill={m.color} />
                  ))}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#0f1334" }} formatter={(v: unknown) => `${v}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DetailCard>
      </div>

      {/* Employees */}
      <DetailCard
        title="员工工时与人工成本"
        icon={Users}
        subtitle={`共 ${detail.employees.length} 人 · 累计 ${totalHours} 工时 · 人工总成本 ${totalLaborCost.toFixed(1)} 万元`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">姓名</th>
                <th className="px-3 py-1.5 text-left font-medium">角色</th>
                <th className="px-3 py-1.5 text-right font-medium">工时（h）</th>
                <th className="px-3 py-1.5 text-right font-medium">人工成本（万元）</th>
                <th className="px-3 py-1.5 text-right font-medium">折合时薪（元/h）</th>
              </tr>
            </thead>
            <tbody>
              {detail.employees.map((e, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-medium">{e.name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{e.role}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{e.hours}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{e.cost.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                    {Math.round((e.cost * 10000) / e.hours)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40 text-xs">
              <tr>
                <td colSpan={2} className="px-3 py-1.5 font-medium">合计</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold">{totalHours}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold">{totalLaborCost.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                  {totalHours > 0 ? Math.round((totalLaborCost * 10000) / totalHours) : 0}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DetailCard>

      {/* Equipment + Energy two-column */}
      <div className="grid gap-4 lg:grid-cols-2">
        {detail.equipment.length > 0 && (
          <DetailCard title="设备使用与折旧" icon={Wrench} subtitle={`${detail.equipment.length} 项 · 内部租赁制`}>
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">设备名称</th>
                  <th className="px-3 py-1.5 text-left font-medium">类型</th>
                  <th className="px-3 py-1.5 text-right font-medium">工时</th>
                  <th className="px-3 py-1.5 text-right font-medium">费用</th>
                  <th className="px-3 py-1.5 text-right font-medium">OEE</th>
                </tr>
              </thead>
              <tbody>
                {detail.equipment.map((eq, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-medium">{eq.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{eq.type}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{eq.usageHours}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{eq.cost}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${
                      eq.oee == null ? "text-muted-foreground" :
                      eq.oee >= 80 ? "text-emerald-600" :
                      eq.oee >= 65 ? "text-foreground" : "text-amber-600"
                    }`}>
                      {eq.oee != null ? `${eq.oee}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailCard>
        )}

        {detail.energy.length > 0 && (
          <DetailCard title="能耗明细" icon={Zap} subtitle="按能源类型分项">
            <ul className="space-y-2.5">
              {detail.energy.map((en, i) => (
                <li key={i} className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm" style={{ background: "#d97706" }} />
                      <span className="text-sm font-medium">{en.type}</span>
                    </div>
                    <span className="font-mono text-sm text-foreground">{en.cost} 万元</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between text-[11px] text-muted-foreground">
                    <span>{en.quantity}</span>
                    {en.note && <span className="italic">{en.note}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </DetailCard>
        )}
      </div>

      {/* Auxiliary materials */}
      {detail.auxiliary.length > 0 && (
        <DetailCard title="辅料与耗材" icon={Package} subtitle="对比定额消耗，绿色 = 节约，红色 = 超额">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">辅料名称</th>
                <th className="px-3 py-1.5 text-right font-medium">定额消耗</th>
                <th className="px-3 py-1.5 text-right font-medium">实际消耗</th>
                <th className="px-3 py-1.5 text-right font-medium">金额</th>
                <th className="px-3 py-1.5 text-right font-medium">差异</th>
              </tr>
            </thead>
            <tbody>
              {detail.auxiliary.map((a, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-medium">{a.name}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{a.plannedQty}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{a.actualQty}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{a.cost} 万元</td>
                  <td className="px-3 py-1.5 text-right">
                    <VarianceBadge v={a.variance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DetailCard>
      )}

      {/* Products & Output Value */}
      {detail.products && detail.products.length > 0 && (
        <ProductsSection products={detail.products} totalRevenue={revenue} />
      )}

      {/* Waste costs */}
      {detail.wasteCosts && detail.wasteCosts.length > 0 && (
        <WasteCostsSection items={detail.wasteCosts} totalCost={totalCost} profit={profit} />
      )}

      {/* Accounting rules (enterprise-level, collapsible) */}
      <Collapsible
        title="财务核算方法与计算规则"
        icon={Calculator}
        subtitle={`${getAccountingRules(enterpriseSlug).length} 条公式 · 含示例计算`}
      >
        <AccountingRulesSection rules={getAccountingRules(enterpriseSlug)} />
      </Collapsible>

      {/* Governance rules (enterprise-level, collapsible) */}
      <Collapsible
        title="治理规则与阈值策略"
        icon={Shield}
        subtitle={`${getGovernanceRules(enterpriseSlug).length} 条策略`}
      >
        <GovernanceRulesSection rules={getGovernanceRules(enterpriseSlug)} />
      </Collapsible>

      {/* Data architecture diagram (clickable nodes) */}
      <Collapsible
        title="数据 / 信息化系统架构"
        icon={Network}
        subtitle="点击节点查看字段与对接方式"
        defaultOpen
      >
        <ArchitectureDiagram data={getDataArchitecture(enterpriseSlug)} />
      </Collapsible>

      {/* Strengths / Weaknesses / Improvements */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SWICard tone="success" icon={Sparkles} title="优点" items={detail.strengths} />
        <SWICard tone="danger" icon={AlertTriangle} title="缺点" items={detail.weaknesses} />
        <ImprovementCard items={detail.improvements} />
      </div>
    </div>
  );
}

// ---------- sub components ----------

function DetailCard({
  title, icon: Icon, subtitle, className, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card p-3 ${className || ""}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[color:var(--primary)]" />
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  label, value, suffix, decimals = 0, tone,
}: {
  label: string; value: number; suffix?: string; decimals?: number;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const colors = {
    primary: { bg: "bg-[color:var(--primary)]/8", num: "text-[color:var(--primary)]" },
    success: { bg: "bg-emerald-50",                num: "text-emerald-700" },
    warning: { bg: "bg-amber-50",                  num: "text-amber-700" },
    danger:  { bg: "bg-red-50",                    num: "text-red-700" },
    muted:   { bg: "bg-muted",                     num: "text-foreground" },
  }[tone];
  return (
    <div className={`rounded-lg ${colors.bg} px-3 py-2`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-lg font-semibold ${colors.num}`}>
        {value.toFixed(decimals)}{suffix && <span className="ml-0.5 text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function VarianceBadge({ v }: { v: number }) {
  if (Math.abs(v) < 0.1) return <span className="text-[11px] text-muted-foreground">—</span>;
  const positive = v > 0;
  // positive = 超额（红） — 反向语义，因为消耗多是坏
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] ${
      positive ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
    }`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{v.toFixed(1)}%
    </span>
  );
}

function SWICard({ tone, icon: Icon, title, items }: {
  tone: "success" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  const c = tone === "success"
    ? { border: "border-emerald-200", bg: "bg-emerald-50/40", text: "text-emerald-700", dot: "bg-emerald-500" }
    : { border: "border-red-200",      bg: "bg-red-50/40",      text: "text-red-700",      dot: "bg-red-500" };
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
      <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${c.text}`}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">—</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2 text-xs text-foreground">
              <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${c.dot}`} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImprovementCard({ items }: { items: AmibaDetail["improvements"] }) {
  return (
    <div className="rounded-lg border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[color:var(--primary)]">
        <ArrowUpRight className="h-4 w-4" />
        改进方向
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">—</div>
      ) : (
        <ul className="space-y-2">
          {items.map((imp, i) => (
            <li key={i} className="rounded-md border border-border bg-card px-2.5 py-2">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{imp.title}</span>
                <ImpactBadge p={imp.impact} />
              </div>
              <div className="text-[11px] text-muted-foreground">{imp.desc}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImpactBadge({ p }: { p: "high" | "medium" | "low" }) {
  const c = p === "high"
    ? { bg: "bg-red-50", text: "text-red-700", label: "高优先级" }
    : p === "medium"
      ? { bg: "bg-amber-50", text: "text-amber-700", label: "中优先级" }
      : { bg: "bg-muted", text: "text-muted-foreground", label: "低优先级" };
  return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${c.bg} ${c.text}`}>{c.label}</span>;
}

// =====================================================================
// Products & Output Value
// =====================================================================

function ProductsSection({ products, totalRevenue }: { products: NonNullable<AmibaDetail["products"]>; totalRevenue: number }) {
  const totalQty = products.reduce((s, p) => s + p.qty, 0);
  const totalValueAdd = products.reduce((s, p) => s + (p.revenue * p.valueAdded) / 100, 0);
  return (
    <DetailCard
      title="产品产出与价值"
      icon={ShoppingBag}
      subtitle={`${products.length} 类产品 · 合计 ${totalQty.toLocaleString()} ${products[0]?.unit || "件"} · 附加值 ${totalValueAdd.toFixed(1)} 万元`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">产品 / 客户</th>
              <th className="px-3 py-1.5 text-right font-medium">数量</th>
              <th className="px-3 py-1.5 text-right font-medium">内部转让单价</th>
              <th className="px-3 py-1.5 text-right font-medium">营收（万元）</th>
              <th className="px-3 py-1.5 text-right font-medium">单位成本</th>
              <th className="px-3 py-1.5 text-right font-medium">附加值率</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">
                  <div className="font-medium">{p.name}</div>
                  {p.spec && <div className="text-[10px] text-muted-foreground">{p.spec}</div>}
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {p.qty.toLocaleString()}
                  <span className="ml-0.5 text-[10px] text-muted-foreground">{p.unit}</span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {p.transferPrice >= 10000
                    ? `¥${(p.transferPrice / 10000).toFixed(2)} 万`
                    : `¥${p.transferPrice.toFixed(p.transferPrice < 10 ? 2 : 1)}`}
                  <span className="ml-0.5 text-[10px] text-muted-foreground">/{p.unit}</span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold">{p.revenue}</td>
                <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                  {p.unitCost >= 10000
                    ? `¥${(p.unitCost / 10000).toFixed(2)} 万`
                    : `¥${p.unitCost.toFixed(p.unitCost < 10 ? 2 : 1)}`}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                    p.valueAdded >= 20 ? "bg-emerald-50 text-emerald-700" :
                    p.valueAdded >= 10 ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)]" :
                    "bg-amber-50 text-amber-700"
                  }`}>{p.valueAdded.toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/40 text-xs">
            <tr>
              <td className="px-3 py-1.5 font-medium" colSpan={3}>合计</td>
              <td className="px-3 py-1.5 text-right font-mono font-semibold">{totalRevenue} 万元</td>
              <td colSpan={2} className="px-3 py-1.5 text-right text-muted-foreground">
                附加值合计 {totalValueAdd.toFixed(1)} 万元
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </DetailCard>
  );
}

// =====================================================================
// Waste cost section
// =====================================================================

const WASTE_META: Record<NonNullable<AmibaDetail["wasteCosts"]>[number]["category"], { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  scrap:       { icon: Trash2,      color: "#dc2626" },
  rework:      { icon: RotateCcw,   color: "#d97706" },
  overconsume: { icon: BatteryLow,  color: "#a855f7" },
  idle:        { icon: Clock,       color: "#94a3b8" },
  overtime:    { icon: AlertCircle, color: "#0891b2" },
  claim:       { icon: Mail,        color: "#ec4899" },
  disposal:    { icon: Recycle,     color: "#16a34a" },
};

function WasteCostsSection({
  items, totalCost, profit,
}: {
  items: NonNullable<AmibaDetail["wasteCosts"]>;
  totalCost: number;
  profit: number;
}) {
  const total = items.reduce((s, w) => s + w.amount, 0);
  const ratio = totalCost > 0 ? (total / totalCost) * 100 : 0;
  const recoverable = total * 0.6; // illustrative
  return (
    <DetailCard
      title="浪费成本明细"
      icon={Trash2}
      subtitle={`合计 ${total.toFixed(1)} 万元 · 占成本 ${ratio.toFixed(1)}% · 可消除约 ${recoverable.toFixed(1)} 万`}
    >
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Bar chart of waste categories */}
        <div className="lg:col-span-3">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={items.map((w) => ({ name: w.label, value: w.amount, color: WASTE_META[w.category].color }))}
                layout="vertical"
                margin={{ top: 4, right: 32, left: 80, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#5e6586" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#0f1334" }} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  formatter={(v) => [`${v} 万元`, "浪费金额"]}
                  cursor={{ fill: "rgba(220,38,38,0.05)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
                  {items.map((w, i) => <Cell key={i} fill={WASTE_META[w.category].color} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#0f1334" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Impact strip */}
        <div className="lg:col-span-2 space-y-2">
          <div className="rounded-lg bg-red-50 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">浪费金额</div>
            <div className="mt-0.5 font-mono text-base font-semibold text-red-700">{total.toFixed(1)} 万元</div>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">如全部消除可提升月利润</div>
            <div className="mt-0.5 font-mono text-base font-semibold text-amber-700">+{total.toFixed(1)} 万元</div>
            <div className="text-[10px] text-muted-foreground">
              当前月利润 {profit} 万 → 潜在 {(profit + total).toFixed(1)} 万
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">智能体识别 · 可消除部分</div>
            <div className="mt-0.5 font-mono text-base font-semibold text-emerald-700">{recoverable.toFixed(1)} 万元</div>
            <div className="text-[10px] text-muted-foreground">约 60% 可在 90 天内消除</div>
          </div>
        </div>
      </div>

      {/* Detail list with root cause */}
      <ul className="mt-3 space-y-2">
        {items.map((w, i) => {
          const Icon = WASTE_META[w.category].icon;
          return (
            <li key={i} className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                style={{ background: WASTE_META[w.category].color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium">{w.label}</span>
                  <span className="font-mono text-xs text-foreground">{w.amount.toFixed(2)} 万元</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{w.rootCause}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </DetailCard>
  );
}

// =====================================================================
// Accounting rules section
// =====================================================================

function AccountingRulesSection({ rules }: { rules: ReturnType<typeof getAccountingRules> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rules.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-[color:var(--primary)]" />
              <span className="text-sm font-semibold">{r.name}</span>
            </div>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {r.reviewBy} · {r.reviewCadence}
            </span>
          </div>
          {/* Formula box */}
          <pre className="mb-2 overflow-x-auto rounded-md border border-border bg-[color:var(--primary)]/[0.04] px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
{r.formula}
          </pre>
          {/* Inputs */}
          <div className="mb-2 flex flex-wrap gap-1">
            {r.inputs.map((inp, i) => (
              <span key={i} className="rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {inp}
              </span>
            ))}
          </div>
          {/* Example */}
          <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">应用示例</div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">{r.example}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// Governance rules section
// =====================================================================

function GovernanceRulesSection({ rules }: { rules: ReturnType<typeof getGovernanceRules> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b border-border bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium">规则</th>
            <th className="px-3 py-1.5 text-left font-medium">适用范围</th>
            <th className="px-3 py-1.5 text-left font-medium">阈值 / 触发</th>
            <th className="px-3 py-1.5 text-left font-medium">动作</th>
            <th className="px-3 py-1.5 text-left font-medium">责任人</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-3 py-1.5 align-top font-medium">{r.title}</td>
              <td className="px-3 py-1.5 align-top text-muted-foreground">{r.scope}</td>
              <td className="px-3 py-1.5 align-top">
                <span className="inline-block rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-amber-700">
                  {r.threshold}
                </span>
              </td>
              <td className="px-3 py-1.5 align-top">{r.action}</td>
              <td className="px-3 py-1.5 align-top text-muted-foreground">{r.ownedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================================
// Collapsible wrapper (used for the 3 enterprise-level sections)
// =====================================================================

function Collapsible({
  title, icon: Icon, subtitle, defaultOpen = false, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition ${
          open ? "border-b border-border bg-muted/30" : "hover:bg-muted/30"
        }`}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-[color:var(--primary)]" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Icon className="h-3.5 w-3.5 text-[color:var(--primary)]" />
          <span className="text-sm font-semibold">{title}</span>
          {subtitle && <span className="text-[11px] text-muted-foreground">· {subtitle}</span>}
        </div>
      </button>
      {open && <div className="animate-fade-up px-3 py-3">{children}</div>}
    </div>
  );
}
