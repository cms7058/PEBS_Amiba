"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CircleDot, AlertTriangle, CheckCircle2, TrendingUp, Clock,
  Building2, ChevronDown, ChevronRight, ArrowUpRight,
} from "lucide-react";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Sparkline } from "../../../components/demo/Sparkline";
import { AmibaDetailPanel } from "../../../components/demo/AmibaDetailPanel";
import { G6NeuralView as NeuralMap } from "../../../components/g6/G6NeuralView";
import type { NMNode, NMEdge, NMTone } from "../../../components/demo/NeuralMap";
import { EngineChat } from "../../../components/agent/EngineChat";
import { DEMO_ENTERPRISES, getAmibaDetail, type DemoEnterprise } from "../../../lib/demo-data";

type Stage = "diagnosis_done" | "designing" | "deploying" | "pending";

// Milestone templates by stage
function buildMilestones(stage: Stage) {
  // returns 4 phases with progress depending on current stage
  const ALL = [
    { phase: "阶段 1", name: "诊断 + 设计 + 系统改造并行" },
    { phase: "阶段 2", name: "信息化改造 + 数据自采" },
    { phase: "阶段 3", name: "阿米巴核算双轨并行" },
    { phase: "阶段 4", name: "正式运行 + 动态优化" },
  ];
  const progressMap: Record<Stage, number[]> = {
    pending:         [0, 0, 0, 0],
    diagnosis_done:  [100, 35, 0, 0],
    designing:       [100, 65, 20, 0],
    deploying:       [100, 100, 80, 35],
  };
  const p = progressMap[stage];
  return ALL.map((m, i) => ({
    ...m,
    progress: p[i],
    status: p[i] === 100 ? "完成" : p[i] > 0 ? "进行中" : "未开始",
    tone: (p[i] === 100 ? "success" : p[i] > 0 ? "primary" : "muted") as "success" | "primary" | "muted",
  }));
}

// Alerts derived per enterprise
function deriveAlerts(ent: DemoEnterprise) {
  return ent.events.slice(0, 4).map((e) => ({
    title: e.title, desc: e.desc || "",
    tone: (e.kind === "alert" ? "danger" : e.kind === "achievement" ? "success" : e.kind === "metric" ? "primary" : "muted") as "danger" | "success" | "primary" | "muted",
    icon: e.kind === "alert" ? AlertTriangle : e.kind === "achievement" ? CheckCircle2 : TrendingUp,
  }));
}

// Tasks per stage / status
function buildTasks(ent: DemoEnterprise) {
  // Generate a deterministic-looking task list per enterprise
  if (ent.stage === "pending") return [];
  const seed = ent.slug.length;
  return [
    { id: "T-128", title: "数据采集口建立（IoT 子表接入）", owner: "IT-王", due: "本周五", status: ent.stage === "deploying" ? "完成" : "进行中" },
    { id: "T-131", title: "辅料定额库录入（按 5 阿米巴）", owner: "工程-李", due: "下周三", status: ent.stage === "designing" ? "待开始" : "进行中" },
    { id: "T-119", title: "Q3 内部转让价格协商会", owner: "总部-赵", due: ent.stage === "deploying" ? "已完成" : "已逾期 3 天", status: ent.stage === "deploying" ? "完成" : "逾期" },
    { id: "T-125", title: ent.amibas[Math.min(2, ent.amibas.length - 1)]?.name + " 成本超标根因分析", owner: "财务-周", due: "下周一", status: "进行中" },
    { id: "T-140", title: "MES 与 ERP 接口联调", owner: "IT-王", due: "下下周", status: seed % 2 === 0 ? "进行中" : "待开始" },
    { id: "T-152", title: "员工工时台账上线", owner: "HR-钱", due: "月底", status: ent.stage === "deploying" ? "完成" : "进行中" },
  ];
}

// =====================================================================
// Page
// =====================================================================
export default function DeploymentPage() {
  const slugs = Object.keys(DEMO_ENTERPRISES);
  const [selectedSlug, setSelectedSlug] = useState<string>(slugs[0]);
  const ent = DEMO_ENTERPRISES[selectedSlug];

  if (!ent) {
    return <PageShell title="部署引擎"><div className="text-sm text-muted-foreground">未找到企业</div></PageShell>;
  }

  const milestones = buildMilestones(ent.stage);
  const alerts = deriveAlerts(ent);
  const tasks = buildTasks(ent);

  return (
    <PageShell title="部署引擎" subtitle="任务分解、动态预警、各阿米巴运行台账 · 每家企业独立">
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
                  <Badge tone={
                    e.stage === "deploying" ? "success" :
                    e.stage === "designing" ? "warning" :
                    e.stage === "diagnosis_done" ? "primary" : "muted"
                  } className="ml-1.5">{e.stageLabel}</Badge>
                </button>
              );
            })}
            <Link href={`/demo/enterprises/${selectedSlug}`}
              className="ml-auto inline-flex items-center gap-1 text-xs text-[color:var(--primary)] hover:underline">
              查看完整企业画像 <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardBody>
        </Card>

        {/* Pending stage banner */}
        {ent.stage === "pending" && (
          <Card>
            <CardBody className="py-10 text-center">
              <div className="text-sm font-semibold">该企业尚未发起诊断 → 暂无部署数据</div>
              <div className="mt-1 text-xs text-muted-foreground">
                请先前往「诊断引擎」完成首次诊断，画像生成后即进入实施阶段
              </div>
              <Link href="/diagnosis" className="mt-3 inline-flex rounded-md bg-[color:var(--primary)] px-4 py-2 text-xs text-white hover:brightness-110">
                进入诊断引擎
              </Link>
            </CardBody>
          </Card>
        )}

        {ent.stage !== "pending" && (
          <>
            {/* Milestones */}
            <Card>
              <CardHeader title="实施进度" desc={`${ent.name} · 当前 ${ent.stageLabel}`} />
              <CardBody className="space-y-4">
                {milestones.map((m, i) => (
                  <div key={m.phase} className="animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{m.phase}</span>
                        <span className="text-muted-foreground">{m.name}</span>
                      </div>
                      <Badge tone={m.tone}>{m.status}</Badge>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          m.progress === 100 ? "bg-emerald-500" : m.progress > 0 ? "bg-[color:var(--primary)]" : "bg-muted-foreground/30"
                        }`}
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Amiba dashboard + alerts */}
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <Card>
                <CardHeader
                  title="各阿米巴运行台账"
                  desc="本月数据 · T+1 同步 · 点击展开查看员工 / 设备 / 能耗 / 辅料 / 浪费 / 产品 等全量明细"
                />
                <CardBody className="px-0 py-0">
                  <AmibaTable slug={ent.slug} ent={ent} />
                </CardBody>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader title="智能体预警" desc="按重要性排序" />
                  <CardBody className="space-y-3">
                    {alerts.map((a, i) => {
                      const Icon = a.icon;
                      const color = {
                        danger: "text-red-600 bg-red-50",
                        success: "text-emerald-600 bg-emerald-50",
                        primary: "text-[color:var(--primary)] bg-[color:var(--primary)]/10",
                        muted: "text-muted-foreground bg-muted",
                      }[a.tone];
                      return (
                        <div key={i} className="flex gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 text-sm">
                            <div className="font-medium">{a.title}</div>
                            {a.desc && <div className="text-xs text-muted-foreground">{a.desc}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </CardBody>
                </Card>

                {/* Stage progress KPI */}
                <Card>
                  <CardHeader title="部署核心指标" />
                  <CardBody className="space-y-2.5">
                    <Kpi label="阿米巴数量"   value={`${ent.amibas.length}`}        sub="已落地" />
                    <Kpi label="本月总营收"   value={`¥${(ent.amibas.reduce((s, a) => s + a.revenue, 0)).toLocaleString()} 万`} />
                    <Kpi label="本月总利润"   value={`¥${(ent.amibas.reduce((s, a) => s + a.profit, 0)).toLocaleString()} 万`} />
                    <Kpi label="平均利润率"
                      value={`${(ent.amibas.reduce((s, a) => s + a.profitMargin, 0) / Math.max(1, ent.amibas.length)).toFixed(1)}%`} />
                  </CardBody>
                </Card>
              </div>
            </div>

            {/* Amiba network map (color-coded by status) */}
            <Card>
              <CardHeader
                title="阿米巴关系神经图"
                desc="总部 → 各阿米巴 → 客户/资源池。绿色超预期 / 蓝色正常 / 琥珀需关注。点击任意节点查看说明"
              />
              <CardBody>
                <NeuralMap
                  layerLabels={["战略总部", "运营阿米巴", "客户 / 资源"]}
                  nodes={buildAmibaNeuralNodes(ent)}
                  edges={buildAmibaNeuralEdges(ent)}
                />
              </CardBody>
            </Card>

            {/* Tasks */}
            <Card>
              <CardHeader title="实施任务清单" desc="智能体自动分解 · 可手工调整" />
              <CardBody className="px-0 py-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 text-left font-medium">编号</th>
                      <th className="px-5 py-2.5 text-left font-medium">任务</th>
                      <th className="px-5 py-2.5 text-left font-medium">负责人</th>
                      <th className="px-5 py-2.5 text-left font-medium">截止</th>
                      <th className="px-5 py-2.5 text-left font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                        <td className="px-5 py-3">{t.title}</td>
                        <td className="px-5 py-3 text-muted-foreground">{t.owner}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />{t.due}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={t.status === "逾期" ? "danger" : t.status === "完成" ? "success" : t.status === "进行中" ? "primary" : "muted"}>
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </>
        )}
      </div>

      <EngineChat
        page="部署引擎"
        enterprise={ent.name}
        facts={[
          { label: "当前阶段", value: ent.stageLabel },
          { label: "阿米巴数量", value: `${ent.amibas.length} 个` },
          { label: "本月营收合计", value: `${ent.amibas.reduce((s, a) => s + a.revenue, 0)} 万元` },
          { label: "本月利润合计", value: `${ent.amibas.reduce((s, a) => s + a.profit, 0)} 万元` },
          { label: "需关注阿米巴", value: ent.amibas.filter((a) => a.status === "warning").map((a) => a.name).join("、") || "无" },
        ]}
      />
    </PageShell>
  );
}

// =====================================================================
// AmibaTable: reuses AmibaDetailPanel for each amiba on click-to-expand
// =====================================================================
function AmibaTable({ slug, ent }: { slug: string; ent: DemoEnterprise }) {
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
      <tbody>
        {ent.amibas.map((a, i) => {
          const open = openIdx === i;
          const detail = getAmibaDetail(slug, a.name);
          return (
            <React.Fragment key={a.name}>
              <tr
                onClick={() => setOpenIdx(open ? null : i)}
                className={`group cursor-pointer border-b border-border transition ${
                  open ? "bg-[color:var(--primary)]/5" : "hover:bg-muted/40"
                }`}
              >
                <td className="w-8 px-2 py-2.5 text-muted-foreground">
                  {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />}
                </td>
                <td className="px-2 py-2.5 font-medium">
                  <CircleDot className="mr-1.5 inline h-3 w-3 text-[color:var(--primary)]" />{a.name}
                </td>
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
                      <NoDetailHint />
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

function NoDetailHint() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
      此阿米巴的财务明细尚未导入；可通过 ERP/MES 对接或上传月度台账完成数据补全。
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-base font-semibold text-foreground">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

// =====================================================================
// Amiba neural map (HQ → amibas → customers/resources)
// =====================================================================
function statusToTone(status: "outperform" | "normal" | "warning"): NMTone {
  return status === "outperform" ? "ok" : status === "warning" ? "warn" : "primary";
}

/** Stable id from a label, so nodes & edges agree across separate build passes. */
function labelToId(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return "tgt-" + h.toString(36);
}

function buildAmibaNeuralNodes(ent: DemoEnterprise): NMNode[] {
  const nodes: NMNode[] = [];
  // HQ center
  nodes.push({
    id: "hq",
    label: ent.name.length > 8 ? ent.name.slice(0, 6) + "…" : ent.name,
    sub: "战略阿米巴",
    layer: 0,
    y: 0.5,
    tone: "primary",
    r: 30,
    detail: {
      title: ent.name + " · 战略阿米巴",
      description: "向各运营阿米巴下达营收/利润目标，向品质/工程/支持类阿米巴收取服务费。",
      kv: [
        { k: "阿米巴数量", v: `${ent.amibas.length} 个` },
        { k: "本月营收合计", v: `¥${ent.amibas.reduce((s, a) => s + a.revenue, 0).toLocaleString()} 万元` },
        { k: "本月利润合计", v: `¥${ent.amibas.reduce((s, a) => s + a.profit, 0).toLocaleString()} 万元` },
        { k: "推荐档次", v: ent.level },
      ],
    },
  });
  // Amibas (middle column)
  ent.amibas.forEach((a, i) => {
    nodes.push({
      id: `am-${i}`,
      label: a.name.length > 6 ? a.name.slice(0, 5) + "…" : a.name,
      sub: a.leader,
      layer: 1,
      y: ent.amibas.length === 1 ? 0.5 : i / (ent.amibas.length - 1),
      tone: statusToTone(a.status),
      r: 24,
      detail: {
        title: a.name,
        badges: [{ label: a.status === "outperform" ? "超预期" : a.status === "warning" ? "需关注" : "正常运行", tone: statusToTone(a.status) }],
        description: `阿米巴长：${a.leader}`,
        kv: [
          { k: "本月营收", v: `¥${a.revenue} 万元` },
          { k: "本月成本", v: `¥${a.cost} 万元` },
          { k: "本月利润", v: `¥${a.profit} 万元` },
          { k: "利润率", v: `${a.profitMargin.toFixed(1)}%` },
        ],
      },
    });
  });
  // Customers / resources (right column) — dedup by label
  type TgtInfo = { id: string; label: string; sub?: string; sourceAmibas: string[] };
  const targetsByLabel: Map<string, TgtInfo> = new Map();
  ent.amibas.forEach((a, i) => {
    a.detail?.products?.slice(0, 2).forEach((p) => {
      const label = (p.spec || p.name);
      const key = label.trim();
      if (!targetsByLabel.has(key)) {
        targetsByLabel.set(key, {
          id: labelToId(key),
          label: key.length > 8 ? key.slice(0, 6) + "…" : key,
          sub: p.unit,
          sourceAmibas: [a.name],
        });
      } else {
        targetsByLabel.get(key)!.sourceAmibas.push(a.name);
      }
    });
  });
  if (targetsByLabel.size === 0) {
    targetsByLabel.set("客户/市场", { id: "tgt-market", label: "客户/市场", sourceAmibas: ent.amibas.map((x) => x.name) });
  }
  const arr = Array.from(targetsByLabel.values()).slice(0, 6);
  arr.forEach((t, i) => {
    nodes.push({
      id: t.id,
      label: t.label,
      sub: t.sub,
      layer: 2,
      y: arr.length === 1 ? 0.5 : i / (arr.length - 1),
      tone: "neutral",
      r: 18,
      detail: {
        title: t.label + (t.sub ? " (" + t.sub + ")" : ""),
        description: "下游客户 / 主机厂 / 资源池，与对应阿米巴构成内部市场关系。",
        bullets: t.sourceAmibas.map((n) => `← 由 ${n} 供货 / 服务`),
      },
    });
  });
  return nodes;
}

function buildAmibaNeuralEdges(ent: DemoEnterprise): NMEdge[] {
  const edges: NMEdge[] = [];
  // HQ → amibas
  ent.amibas.forEach((a, i) => {
    edges.push({ from: "hq", to: `am-${i}`, label: a.status === "outperform" ? "超预期" : "" });
  });
  // amibas → product targets
  let any = false;
  ent.amibas.forEach((a, i) => {
    a.detail?.products?.slice(0, 2).forEach((p) => {
      any = true;
      const label = (p.spec || p.name).trim();
      edges.push({ from: `am-${i}`, to: labelToId(label) });
    });
  });
  if (!any) {
    ent.amibas.forEach((_, i) => edges.push({ from: `am-${i}`, to: "tgt-market" }));
  }
  return edges;
}
