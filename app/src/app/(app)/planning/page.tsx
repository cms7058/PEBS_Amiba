"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2, Zap, Shield, Database, AlertTriangle,
  CalendarDays, Wallet, ListChecks, Activity, ArrowUpRight,
  Cpu, FileSpreadsheet, Workflow, Calculator, ShieldCheck, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis,
} from "recharts";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { EngineChat } from "../../../components/agent/EngineChat";
import {
  DEMO_ENTERPRISES, getEnterprisePlan,
  getAccountingRules, getGovernanceRules,
  getBusinessProcesses, getDataCollectionPlan,
  type EnterprisePlan, type PlanMilestone, type AccountingRule, type GovernanceRule,
  type BusinessProcess, type DataCollectionItem,
} from "../../../lib/demo-data";

const PATH_META: Record<"A" | "B" | "C", { name: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  A: { name: "快速见效型", icon: Zap,      desc: "6-9 个月初见成效，适合信息化基础薄弱、老板急于见效" },
  B: { name: "稳健推进型", icon: Shield,   desc: "12-18 个月系统落地，适合有一定信息化基础、追求体系化" },
  C: { name: "数字原生型", icon: Database, desc: "信息化先行，分阶段铺开；适合已有 IT 闭环或同步升级 IT" },
};

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { id: "data",     label: "数据采集计划",  icon: Cpu,             desc: "11 类数据源 · 颗粒度 / 责任人 / 状态" },
  { id: "policy",   label: "规章制度",      icon: FileSpreadsheet, desc: "阀值规则 + 任命与考核 + 利润分享" },
  { id: "process",  label: "业务流程",      icon: Workflow,        desc: "6 套核心 SOP · 月结 / 转让价 / 异常 / 变更" },
  { id: "rules",    label: "核算规则",      icon: Calculator,      desc: "6 条公式 + 示例 · 季度核定" },
  { id: "risk",     label: "防风险措施",    icon: ShieldCheck,     desc: "风险矩阵 + 缓解策略 + 监控指标" },
  { id: "tempo",    label: "实施节奏",      icon: CalendarDays,    desc: "路径 / 甘特图 / 预算（原规划内容）" },
];

type TabId = "data" | "policy" | "process" | "rules" | "risk" | "tempo";

export default function PlanningPage() {
  const slugs = Object.keys(DEMO_ENTERPRISES);
  const [selectedSlug, setSelectedSlug] = useState<string>(slugs[0]);
  const [tab, setTab] = useState<TabId>("data");
  const [chatSubject, setChatSubject] = useState<{ label: string; meta?: Record<string, unknown> } | null>(null);
  const ent = DEMO_ENTERPRISES[selectedSlug];
  const plan = getEnterprisePlan(selectedSlug);

  return (
    <PageShell title="规划引擎" subtitle="把企业画像中的差距，转化为 5 类可执行规章细节">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Enterprise selector */}
        <Card>
          <CardBody className="flex flex-wrap items-center gap-2">
            <Building2 className="h-4 w-4 text-[color:var(--primary)]" />
            <span className="text-xs text-muted-foreground">服务企业：</span>
            {slugs.map((slug) => {
              const e = DEMO_ENTERPRISES[slug];
              const active = selectedSlug === slug;
              return (
                <button
                  key={slug} onClick={() => setSelectedSlug(slug)}
                  className={`rounded-md border px-3 py-1.5 text-xs transition ${
                    active ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]" : "border-border hover:bg-muted"
                  }`}
                >
                  {e.name.length > 14 ? e.name.slice(0, 12) + "…" : e.name}
                </button>
              );
            })}
            <Link href="/profile" className="ml-auto inline-flex items-center gap-1 text-xs text-[color:var(--primary)] hover:underline">
              查看企业画像与全景图 <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardBody>
        </Card>

        {!plan || ent.stage === "pending" ? (
          <Card>
            <CardBody className="py-10 text-center">
              <div className="text-sm font-semibold">该企业尚未完成诊断 → 暂无规划数据</div>
              <div className="mt-1 text-xs text-muted-foreground">请先完成诊断引擎中的对话，画像生成后会自动驱动本页规划</div>
              <Link href="/diagnosis" className="mt-3 inline-flex rounded-md bg-[color:var(--primary)] px-4 py-2 text-xs text-white hover:brightness-110">
                进入诊断引擎
              </Link>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Tab bar */}
            <Card>
              <CardBody className="px-2 py-2">
                <div className="flex flex-wrap gap-1">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setChatSubject({ label: t.label }); }}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs transition ${
                          active
                            ? "bg-[color:var(--primary)] text-white"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 px-2 text-[11px] text-muted-foreground">
                  {TABS.find((x) => x.id === tab)?.desc}
                </div>
              </CardBody>
            </Card>

            {/* Tab content */}
            {tab === "data" && <DataCollectionPanel slug={selectedSlug} onPick={setChatSubject} />}
            {tab === "policy" && <PolicyPanel slug={selectedSlug} onPick={setChatSubject} />}
            {tab === "process" && <ProcessPanel slug={selectedSlug} onPick={setChatSubject} />}
            {tab === "rules" && <AccountingRulesPanel slug={selectedSlug} onPick={setChatSubject} />}
            {tab === "risk" && <RiskPanel plan={plan} onPick={setChatSubject} />}
            {tab === "tempo" && <TempoPanel plan={plan} />}
          </>
        )}
      </div>

      <EngineChat
        page="规划引擎"
        enterprise={ent?.name}
        subject={chatSubject?.label}
        facts={buildChatFacts(ent, plan, chatSubject)}
      />
    </PageShell>
  );
}

// =====================================================================
// 1. Data collection plan
// =====================================================================
function DataCollectionPanel({ slug, onPick }: { slug: string; onPick: (s: { label: string; meta?: Record<string, unknown> }) => void }) {
  const items = getDataCollectionPlan(slug);
  return (
    <Card>
      <CardHeader
        title="数据采集计划"
        desc="按数据源分类 · 颗粒度 / 落地系统 / 责任人 · 点击行让 AI 助手帮你出对接清单"
      />
      <CardBody className="px-0 py-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2 text-left font-medium">数据源</th>
              <th className="px-2 py-2 text-left font-medium">采集主题</th>
              <th className="px-2 py-2 text-left font-medium">颗粒度</th>
              <th className="px-2 py-2 text-left font-medium">流向</th>
              <th className="px-2 py-2 text-left font-medium">责任人</th>
              <th className="px-2 py-2 text-left font-medium">状态</th>
              <th className="px-5 py-2 text-left font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                onClick={() => onPick({ label: `数据采集：${it.topic}`, meta: it as unknown as Record<string, unknown> })}
              >
                <td className="px-5 py-2.5"><SourceBadge source={it.source} /></td>
                <td className="px-2 py-2.5 font-medium">{it.topic}</td>
                <td className="px-2 py-2.5 text-xs text-muted-foreground">{it.granularity}</td>
                <td className="px-2 py-2.5 text-xs text-muted-foreground">{it.destination}</td>
                <td className="px-2 py-2.5 text-xs text-muted-foreground">{it.owner}</td>
                <td className="px-2 py-2.5">
                  <Badge tone={it.status === "live" ? "success" : it.status === "partial" ? "warning" : "muted"}>
                    {it.status === "live" ? "已上线" : it.status === "partial" ? "部分" : "待建设"}
                  </Badge>
                </td>
                <td className="px-5 py-2.5 text-[11px] text-muted-foreground">{it.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function SourceBadge({ source }: { source: DataCollectionItem["source"] }) {
  const map: Record<string, { color: string }> = {
    IoT: { color: "#16a34a" },
    MES: { color: "#2d2a8e" },
    ERP: { color: "#a855f7" },
    "手工台账": { color: "#94a3b8" },
    "钉钉": { color: "#0891b2" },
    "新建": { color: "#d97706" },
  };
  const c = map[source]?.color || "#94a3b8";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
      <span className="font-medium">{source}</span>
    </span>
  );
}

// =====================================================================
// 2. Policy (governance rules + organizational policies)
// =====================================================================
function PolicyPanel({ slug, onPick }: { slug: string; onPick: (s: { label: string; meta?: Record<string, unknown> }) => void }) {
  const rules = getGovernanceRules(slug);
  const orgPolicies: Array<{ id: string; title: string; desc: string }> = [
    { id: "org.appoint",   title: "阿米巴长任命与考核",   desc: "任命标准：技术 + 财务双线；季度评分；任期 1 年，可连任 2 次" },
    { id: "org.authority", title: "决策权下放原则",       desc: "10 万元以内阿米巴长定夺；10-50 万由阿米巴长 + 总部联签；> 50 万必须董事会" },
    { id: "org.dispute",   title: "跨阿米巴争议处置",     desc: "见「业务流程」标签下的 SOP；总部裁决期限 1 周" },
    { id: "org.share",     title: "超利分享比例",         desc: "实际利润率 > 目标 110% 时，超出部分 30% 进阿米巴分红池、70% 留企业" },
    { id: "org.demote",    title: "退出 / 降级机制",      desc: "连续 2 季度利润率 < 50% 目标 → 阿米巴长降级；连续 3 季度 → 阿米巴重组" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="阀值规则（智能体自动监测）" desc={`${rules.length} 条 · 由 Copilot 在数据触达阈值时自动告警`} />
        <CardBody className="px-0 py-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left font-medium">规则</th>
                <th className="px-2 py-2 text-left font-medium">适用范围</th>
                <th className="px-2 py-2 text-left font-medium">阈值 / 触发</th>
                <th className="px-2 py-2 text-left font-medium">动作</th>
                <th className="px-5 py-2 text-left font-medium">责任人</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => <PolicyRow key={r.id} rule={r} onPick={onPick} />)}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="组织 / 治理制度" desc="管理类制度 — 任命 / 决策权 / 分享 / 争议 / 退出" />
        <CardBody className="space-y-2">
          {orgPolicies.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick({ label: `制度：${p.title}`, meta: p as unknown as Record<string, unknown> })}
              className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-[color:var(--primary)]/40 hover:bg-muted/40"
            >
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--primary)]" />
              <div className="flex-1">
                <div className="text-sm font-medium">{p.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.desc}</div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function PolicyRow({ rule, onPick }: { rule: GovernanceRule; onPick: (s: { label: string; meta?: Record<string, unknown> }) => void }) {
  return (
    <tr
      onClick={() => onPick({ label: `规则：${rule.title}`, meta: rule as unknown as Record<string, unknown> })}
      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
    >
      <td className="px-5 py-3 align-top font-medium">{rule.title}</td>
      <td className="px-2 py-3 align-top text-muted-foreground">{rule.scope}</td>
      <td className="px-2 py-3 align-top">
        <span className="inline-block rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-amber-700">{rule.threshold}</span>
      </td>
      <td className="px-2 py-3 align-top">{rule.action}</td>
      <td className="px-5 py-3 align-top text-muted-foreground">{rule.ownedBy}</td>
    </tr>
  );
}

// =====================================================================
// 3. Business processes
// =====================================================================
function ProcessPanel({ slug, onPick }: { slug: string; onPick: (s: { label: string; meta?: Record<string, unknown> }) => void }) {
  const processes = getBusinessProcesses(slug);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <Card>
      <CardHeader title="业务流程（SOP）" desc={`${processes.length} 套核心流程 · 月结 / 转让价 / 辅料 / 客户变更 / 异常 / 争议`} />
      <CardBody className="space-y-3">
        {processes.map((p, i) => {
          const open = openIdx === i;
          const tone = p.category === "accounting" ? "primary" : p.category === "governance" ? "warning" : p.category === "ops" ? "success" : "danger";
          return (
            <div key={p.id} className="rounded-lg border border-border bg-card">
              <button
                onClick={() => { setOpenIdx(open ? null : i); onPick({ label: `流程：${p.name}`, meta: p as unknown as Record<string, unknown> }); }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/40"
              >
                {open ? <ChevronDown className="h-4 w-4 text-[color:var(--primary)]" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <Workflow className="h-4 w-4 text-[color:var(--primary)]" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.steps.length} 步 · {p.frequency}</div>
                </div>
                <Badge tone={tone as "primary" | "warning" | "success" | "danger"}>{categoryLabel(p.category)}</Badge>
              </button>
              {open && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 animate-fade-up">
                  <ol className="space-y-2">
                    {p.steps.map((s, j) => (
                      <li key={j} className="flex gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[10px] font-bold text-[color:var(--primary)]">
                          {j + 1}
                        </div>
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="font-medium text-foreground">{s.step}</div>
                          <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                            <span>👤 {s.owner}</span>
                            <span>·</span>
                            <span>🛠 {s.system}</span>
                            {s.sla && <><span>·</span><span>⏱ {s.sla}</span></>}
                          </div>
                          {s.note && <div className="mt-0.5 text-[11px] text-amber-700">{s.note}</div>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function categoryLabel(c: BusinessProcess["category"]): string {
  return { accounting: "财务核算", ops: "运营", quality: "质量", governance: "治理" }[c];
}

// =====================================================================
// 4. Accounting rules
// =====================================================================
function AccountingRulesPanel({ slug, onPick }: { slug: string; onPick: (s: { label: string; meta?: Record<string, unknown> }) => void }) {
  const rules = getAccountingRules(slug);
  return (
    <Card>
      <CardHeader title="核算规则" desc={`${rules.length} 条公式 · 季度核定 · 期间冻结 · 点击查看应用示例`} />
      <CardBody>
        <div className="grid gap-3 lg:grid-cols-2">
          {rules.map((r) => <AccRuleCard key={r.id} rule={r} onPick={onPick} />)}
        </div>
      </CardBody>
    </Card>
  );
}

function AccRuleCard({ rule, onPick }: { rule: AccountingRule; onPick: (s: { label: string; meta?: Record<string, unknown> }) => void }) {
  return (
    <button
      onClick={() => onPick({ label: rule.name, meta: rule as unknown as Record<string, unknown> })}
      className="rounded-lg border border-border bg-card p-3 text-left transition hover:border-[color:var(--primary)]/40 hover:shadow-sm"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{rule.name}</span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{rule.reviewBy} · {rule.reviewCadence}</span>
      </div>
      <pre className="mb-2 overflow-x-auto rounded-md border border-border bg-[color:var(--primary)]/[0.04] px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
{rule.formula}
      </pre>
      <div className="mb-2 flex flex-wrap gap-1">
        {rule.inputs.map((inp, i) => (
          <span key={i} className="rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">{inp}</span>
        ))}
      </div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">应用示例</div>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">{rule.example}</pre>
      </div>
    </button>
  );
}

// =====================================================================
// 5. Risk panel — matrix + register + monitoring
// =====================================================================
function RiskPanel({ plan, onPick }: { plan: EnterprisePlan; onPick: (s: { label: string; meta?: Record<string, unknown> }) => void }) {
  return (
    <div className="space-y-4">
      <RiskMatrixCard plan={plan} />
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-[color:var(--primary)]" /> 风险登记 & 缓解措施</span>}
          desc={`${plan.risks.length} 条风险 · ${plan.risks.filter((r) => r.level === "high").length} 条高优先级 · 点击让 AI 助手细化措施`}
        />
        <CardBody className="px-0 py-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left font-medium">风险</th>
                <th className="px-2 py-2 text-center font-medium">等级</th>
                <th className="px-2 py-2 text-right font-medium">概率</th>
                <th className="px-2 py-2 text-right font-medium">影响</th>
                <th className="px-2 py-2 text-left font-medium">缓解措施</th>
                <th className="px-5 py-2 text-left font-medium">监控指标</th>
                <th className="px-5 py-2 text-left font-medium">责任人</th>
              </tr>
            </thead>
            <tbody>
              {plan.risks.slice().sort((a, b) => b.probability * b.impact - a.probability * a.impact).map((r, i) => (
                <tr key={i}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                  onClick={() => onPick({ label: `风险：${r.title}`, meta: { ...r } as Record<string, unknown> })}
                >
                  <td className="px-5 py-3 font-medium">
                    {r.level === "high" && <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-red-500" />}
                    {r.title}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Badge tone={r.level === "high" ? "danger" : r.level === "medium" ? "warning" : "muted"}>
                      {r.level === "high" ? "高" : r.level === "medium" ? "中" : "低"}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-right font-mono">{r.probability}%</td>
                  <td className="px-2 py-3 text-right font-mono">{r.impact}%</td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">{r.mitigation}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{deriveMonitor(r.title)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{r.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function deriveMonitor(title: string): string {
  if (title.includes("MES") || title.includes("PLM")) return "周报：开发完成度 / 关键模块联调";
  if (title.includes("延误"))   return "甘特图 / Copilot 自动告警";
  if (title.includes("抵触"))   return "月度阿米巴长访谈 + 改善建议数";
  if (title.includes("辅料"))   return "扫码出库定额对比报告";
  if (title.includes("数据"))   return "数据质量自动巡检 · 周报";
  if (title.includes("变更"))   return "电子签证回收率 · 月报";
  return "—";
}

function RiskMatrixCard({ plan }: { plan: EnterprisePlan }) {
  if (plan.risks.length === 0) return null;
  const data = plan.risks.map((r) => ({
    x: r.probability, y: r.impact,
    z: r.level === "high" ? 800 : r.level === "medium" ? 500 : 300,
    title: r.title, level: r.level,
  }));
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[color:var(--primary)]" /> 风险矩阵</span>}
        desc="X = 发生概率 · Y = 影响程度 · 点大小 = 等级"
      />
      <CardBody>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" dataKey="x" name="发生概率" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#5e6586" }} />
              <YAxis type="number" dataKey="y" name="影响程度" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#5e6586" }} />
              <ZAxis type="number" dataKey="z" range={[120, 800]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(_, p) => p?.[0]?.payload?.title || ""} />
              <Scatter name="风险" data={data} animationDuration={1000}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.level === "high" ? "#dc2626" : d.level === "medium" ? "#d97706" : "#94a3b8"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

// =====================================================================
// 6. Tempo panel (formerly main planning content)
// =====================================================================
function TempoPanel({ plan }: { plan: EnterprisePlan }) {
  return (
    <div className="space-y-4">
      <PathBanner plan={plan} />
      <ConstraintsCard plan={plan} />
      <div className="grid gap-4 lg:grid-cols-5">
        <BudgetCard plan={plan} className="lg:col-span-2" />
        <GanttCard plan={plan} className="lg:col-span-3" />
      </div>
    </div>
  );
}

function PathBanner({ plan }: { plan: EnterprisePlan }) {
  const Icon = PATH_META[plan.path].icon;
  return (
    <Card className="animate-fade-up">
      <CardBody className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground">已选实施路径</span>
              <Badge tone="primary">路径 {plan.path}</Badge>
            </div>
            <div className="mt-0.5 text-lg font-semibold">{plan.pathName}</div>
            <div className="mt-1 max-w-2xl text-xs text-muted-foreground">{plan.pathReason}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">开始</div>
            <div className="mt-0.5 font-mono text-sm">{plan.startedAt}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">预计完成</div>
            <div className="mt-0.5 font-mono text-sm">{plan.expectedEnd}</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ConstraintsCard({ plan }: { plan: EnterprisePlan }) {
  return (
    <Card>
      <CardHeader title="约束条件" desc="基于六维诊断画像自动填充，可手工调整后重新求解" />
      <CardBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {plan.constraints.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="text-[11px] text-muted-foreground">{c.label}</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">{c.value}</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function BudgetCard({ plan, className }: { plan: EnterprisePlan; className?: string }) {
  const remain = plan.budget.total - plan.budget.spent;
  const spentPct = plan.budget.total > 0 ? Math.round((plan.budget.spent / plan.budget.total) * 100) : 0;
  return (
    <Card className={className}>
      <CardHeader
        title={<span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-[color:var(--primary)]" /> 预算分配</span>}
        desc={`总预算 ${plan.budget.total} 万元 · 已花费 ${plan.budget.spent} 万元 (${spentPct}%)`}
      />
      <CardBody>
        {plan.budget.items.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">暂无预算明细</div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={plan.budget.items} dataKey="amount" innerRadius={52} outerRadius={82} paddingAngle={1.5} stroke="#fff" strokeWidth={2} animationDuration={1000}>
                    {plan.budget.items.map((it, i) => <Cell key={i} fill={it.color || "#2d2a8e"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v} 万元`, "预算"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[10px] text-muted-foreground">已花费</div>
                <div className="font-mono text-lg font-semibold text-[color:var(--primary)]">{plan.budget.spent}</div>
                <div className="text-[10px] text-muted-foreground">/ {plan.budget.total} 万</div>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {plan.budget.items.map((it) => {
                const pct = plan.budget.total > 0 ? ((it.amount / plan.budget.total) * 100).toFixed(0) : "0";
                return (
                  <div key={it.label} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: it.color || "#2d2a8e" }} />
                    <span className="flex-1 truncate text-foreground">{it.label}</span>
                    <span className="font-mono text-muted-foreground">{it.amount} 万</span>
                    <span className="w-9 text-right font-mono text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
              <div className="mt-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[11px]">
                <span className="text-muted-foreground">剩余可用：</span>
                <span className={`ml-1 font-mono ${remain < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {remain >= 0 ? "+" : ""}{remain} 万元
                </span>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ymToNum(ym: string): number {
  const [y, m] = ym.split("-").map((s) => parseInt(s, 10));
  return y * 12 + (m - 1);
}
function ymToText(n: number): string {
  const y = Math.floor(n / 12); const m = n % 12;
  return `${y}年${m + 1}月`;
}

function GanttCard({ plan, className }: { plan: EnterprisePlan; className?: string }) {
  if (plan.milestones.length === 0) {
    return (
      <Card className={className}>
        <CardHeader title="实施甘特图" desc="按里程碑展开" />
        <CardBody className="py-6 text-center text-xs text-muted-foreground">暂无里程碑</CardBody>
      </Card>
    );
  }
  let ymin = Infinity, ymax = -Infinity;
  plan.milestones.forEach((m) => {
    ymin = Math.min(ymin, ymToNum(m.start));
    ymax = Math.max(ymax, ymToNum(m.end));
  });
  const monthCount = ymax - ymin + 1;
  return (
    <Card className={className}>
      <CardHeader
        title={<span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[color:var(--primary)]" /> 实施甘特图</span>}
        desc={`${ymToText(ymin)} — ${ymToText(ymax)} · 共 ${monthCount} 个月`}
      />
      <CardBody>
        <GanttBody milestones={plan.milestones} ymin={ymin} monthCount={monthCount} />
      </CardBody>
    </Card>
  );
}

function GanttBody({ milestones, ymin, monthCount }: { milestones: PlanMilestone[]; ymin: number; monthCount: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid border-b border-border pb-1 text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `120px repeat(${monthCount}, minmax(28px, 1fr))` }}>
        <div></div>
        {Array.from({ length: monthCount }).map((_, i) => {
          const n = ymin + i;
          const m = (n % 12) + 1;
          const y = Math.floor(n / 12);
          return (
            <div key={i} className={`text-center font-mono ${i === 0 || m === 1 ? "text-foreground" : ""}`}>
              {i === 0 || m === 1 ? `${y}/${m}` : `${m}月`}
            </div>
          );
        })}
      </div>
      <div className="space-y-1.5 pt-2">
        {milestones.map((m, i) => {
          const s = ymToNum(m.start) - ymin;
          const e = ymToNum(m.end) - ymin;
          const span = e - s + 1;
          const bg = m.status === "done" ? "bg-emerald-500" : m.status === "in_progress" ? "bg-[color:var(--primary)]" : m.status === "delayed" ? "bg-red-500" : "bg-muted-foreground/40";
          return (
            <div key={i} className="grid items-center" style={{ gridTemplateColumns: `120px repeat(${monthCount}, minmax(28px, 1fr))` }}>
              <div className="flex items-center gap-2 truncate pr-2 text-xs">
                <span className="font-mono text-muted-foreground">{m.phase}</span>
                <span className="truncate font-medium">{m.name}</span>
              </div>
              {Array.from({ length: monthCount }).map((_, idx) => {
                if (idx !== s) return <div key={idx}></div>;
                return (
                  <div key={idx} style={{ gridColumn: `${idx + 2} / span ${span}` }} className={`relative h-5 overflow-hidden rounded-md ${bg}`}>
                    <div className="h-full bg-white/30" style={{ width: `${100 - m.progress}%`, marginLeft: `${m.progress}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">{m.progress}%</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
// Chat facts
// =====================================================================
function buildChatFacts(
  ent: typeof DEMO_ENTERPRISES[string] | undefined,
  plan: EnterprisePlan | null,
  subj: { label: string; meta?: Record<string, unknown> } | null
): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [];
  if (ent) {
    facts.push({ label: "行业", value: ent.industryLabel });
    facts.push({ label: "规模", value: ent.scale });
  }
  if (plan) {
    facts.push({ label: "已选路径", value: `${plan.path} · ${plan.pathName}` });
    facts.push({ label: "预算", value: `${plan.budget.total} 万元（已用 ${plan.budget.spent}）` });
  }
  if (subj?.meta) {
    const m = subj.meta as Record<string, unknown>;
    for (const [k, v] of Object.entries(m)) {
      if (v == null || k.startsWith("__")) continue;
      if (typeof v === "string" && v) facts.push({ label: k, value: v });
      if (typeof v === "number") facts.push({ label: k, value: String(v) });
    }
  }
  return facts;
}
