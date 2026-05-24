"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Boxes, Calculator, Target, ArrowUpRight, ChevronRight,
} from "lucide-react";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { G6NeuralView as NeuralMap } from "../../../components/g6/G6NeuralView";
import type { NMNode, NMEdge, NMTone } from "../../../components/demo/NeuralMap";
import { EngineChat } from "../../../components/agent/EngineChat";
import {
  DEMO_ENTERPRISES, getEnterpriseDesign, CATEGORY_META,
  type EnterpriseDesign, type DesignAmibaUnit, type AmibaCategory,
} from "../../../lib/demo-data";

const CAT_ORDER: AmibaCategory[] = ["sales", "manufacturing", "support", "function"];

export default function DesignPage() {
  const slugs = Object.keys(DEMO_ENTERPRISES);
  const [selectedSlug, setSelectedSlug] = useState<string>(slugs[0]);
  const ent = DEMO_ENTERPRISES[selectedSlug];
  const design = getEnterpriseDesign(selectedSlug);

  return (
    <PageShell
      title="设计引擎"
      subtitle="按企业生成阿米巴切割（神经树）、核心 KPI、内部转让定价矩阵"
    >
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
                  <Badge tone={e.amibas.length > 0 ? "primary" : "muted"} className="ml-1.5">
                    {e.amibas.length > 0 ? `${e.amibas.length} 阿米巴` : "未切割"}
                  </Badge>
                </button>
              );
            })}
            <Link href={`/demo/enterprises/${selectedSlug}`} className="ml-auto inline-flex items-center gap-1 text-xs text-[color:var(--primary)] hover:underline">
              查看完整企业画像 <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardBody>
        </Card>

        {!design ? (
          <Card>
            <CardBody className="py-10 text-center">
              <div className="text-sm font-semibold">该企业尚未完成诊断 → 暂无切割设计</div>
              <div className="mt-1 text-xs text-muted-foreground">
                请先在「诊断引擎」对话生成画像，本页会基于行业 + 诊断结果自动生成切割方案
              </div>
              <Link href="/diagnosis" className="mt-3 inline-flex rounded-md bg-[color:var(--primary)] px-4 py-2 text-xs text-white hover:brightness-110">
                进入诊断引擎
              </Link>
            </CardBody>
          </Card>
        ) : (
          <>
            <SummaryCard ent={ent} design={design} />
            <CuttingTreeCard ent={ent} design={design} />
            <KPISection design={design} />
            <TransferPriceMatrixCard design={design} />
          </>
        )}
      </div>

      <EngineChat
        page="设计引擎"
        enterprise={ent?.name}
        facts={design ? [
          { label: "行业", value: ent?.industryLabel || "" },
          { label: "阿米巴单元数", value: `${design.amibas.length} 个` },
          { label: "营销类", value: `${design.amibas.filter((a) => a.category === "sales").length} 个` },
          { label: "制造类", value: `${design.amibas.filter((a) => a.category === "manufacturing").length} 个` },
          { label: "支持类", value: `${design.amibas.filter((a) => a.category === "support").length} 个` },
          { label: "转让定价行数", value: `${design.transferPrices.length}` },
        ] : undefined}
      />
    </PageShell>
  );
}

// =====================================================================
// Summary KPI strip
// =====================================================================
function SummaryCard({ ent, design }: { ent: typeof DEMO_ENTERPRISES[string]; design: EnterpriseDesign }) {
  const counts: Record<AmibaCategory, number> = { strategy: 1, sales: 0, manufacturing: 0, support: 0, function: 0 };
  design.amibas.forEach((a) => { counts[a.category] += 1; });
  return (
    <Card className="animate-fade-up">
      <CardBody className="grid gap-3 lg:grid-cols-5">
        <Stat label="阿米巴总数" value={`${design.amibas.length} + 1`} sub="含战略阿米巴" tone="primary" />
        <Stat label="营销 / 销售"  value={`${counts.sales}`}         tone="success" />
        <Stat label="制造 / 项目"  value={`${counts.manufacturing}`} tone="primary" />
        <Stat label="支持类"       value={`${counts.support}`}       tone="warning" />
        <Stat label="转让定价行"   value={`${design.transferPrices.length}`} sub={`${ent.industryLabel}`} tone="muted" />
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "primary" | "success" | "warning" | "muted" }) {
  const colors = {
    primary: "bg-[color:var(--primary)]/8 text-[color:var(--primary)]",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    muted:   "bg-muted text-foreground",
  }[tone];
  return (
    <div className={`rounded-lg px-4 py-3 ${colors}`}>
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold">{value}</span>
        {sub && <span className="text-[10px] opacity-60">{sub}</span>}
      </div>
    </div>
  );
}

// =====================================================================
// Amiba cutting neural tree
// =====================================================================
function CuttingTreeCard({ ent, design }: { ent: typeof DEMO_ENTERPRISES[string]; design: EnterpriseDesign }) {
  const { nodes, edges } = buildCuttingTree(ent, design);
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-[color:var(--primary)]" /> 阿米巴切割神经树</span>}
        desc="总部 → 分类节点 → 单个阿米巴。颜色按类型自动区分；点击任意节点查看责任、定价、KPI"
      />
      <CardBody>
        <NeuralMap
          nodes={nodes}
          edges={edges}
          layerLabels={["战略", "分类", "阿米巴单元"]}
          aspect={1.9}
        />
      </CardBody>
    </Card>
  );
}

function categoryTone(cat: AmibaCategory): NMTone {
  switch (cat) {
    case "strategy": return "primary";
    case "sales": return "ok";
    case "manufacturing": return "primary";
    case "support": return "warn";
    case "function": return "neutral";
  }
}

function buildCuttingTree(ent: typeof DEMO_ENTERPRISES[string], design: EnterpriseDesign): { nodes: NMNode[]; edges: NMEdge[] } {
  const nodes: NMNode[] = [];
  const edges: NMEdge[] = [];

  // HQ
  nodes.push({
    id: "hq",
    label: ent.name.length > 8 ? ent.name.slice(0, 6) + "…" : ent.name,
    sub: "战略阿米巴",
    layer: 0,
    y: 0.5,
    tone: "primary",
    r: 28,
    detail: {
      title: ent.name + " · 战略阿米巴",
      description: "向各运营阿米巴下达营收/利润目标，向支持/职能阿米巴付服务费。",
      kv: [
        { k: "下辖阿米巴", v: `${design.amibas.length} 个` },
        { k: "推荐档次", v: ent.level },
        { k: "预计周期", v: ent.cycle },
      ],
    },
  });

  // Category nodes (only those that have at least one amiba)
  const catsPresent: AmibaCategory[] = CAT_ORDER.filter((c) => design.amibas.some((a) => a.category === c));
  catsPresent.forEach((c, i) => {
    const meta = CATEGORY_META[c];
    nodes.push({
      id: `cat-${c}`,
      label: meta.label.length > 8 ? meta.label.slice(0, 6) + "…" : meta.label,
      sub: `${design.amibas.filter((a) => a.category === c).length} 个`,
      layer: 1,
      y: catsPresent.length === 1 ? 0.5 : i / (catsPresent.length - 1),
      tone: categoryTone(c),
      r: 22,
      detail: {
        title: meta.label,
        description: c === "sales"
          ? "面向外部市场获取订单，按内部转让价向制造/项目阿米巴采购。"
          : c === "manufacturing"
            ? "核心利润中心，以工时单价 × (1 + 内部利润率) 向销售阿米巴销售。"
            : c === "support"
              ? "向其他阿米巴提供专业服务（品质 / 模具 / 工程），按服务费收取收入。"
              : "横向服务支撑（财务 / HR / IT / 采购），由各阿米巴按使用量分摊。",
        badges: [{ label: meta.label, tone: categoryTone(c) }],
      },
    });
    edges.push({ from: "hq", to: `cat-${c}` });
  });

  // Amiba unit nodes
  const amibasByCat = new Map<AmibaCategory, DesignAmibaUnit[]>();
  CAT_ORDER.forEach((c) => amibasByCat.set(c, []));
  design.amibas.forEach((a) => amibasByCat.get(a.category)!.push(a));

  // Lay out amiba units in vertical column 2 grouped by category for visual flow
  const totalUnits = design.amibas.length;
  let idx = 0;
  CAT_ORDER.forEach((c) => {
    const arr = amibasByCat.get(c) || [];
    arr.forEach((u) => {
      const y = totalUnits === 1 ? 0.5 : idx / (totalUnits - 1);
      nodes.push({
        id: `am-${u.name}`,
        label: u.name.length > 7 ? u.name.slice(0, 5) + "…" : u.name,
        sub: u.leader,
        layer: 2,
        y,
        tone: categoryTone(u.category),
        r: 18,
        detail: {
          title: u.name,
          badges: [
            { label: CATEGORY_META[u.category].label, tone: categoryTone(u.category) },
            { label: `阿米巴长：${u.leader}`, tone: "neutral" },
          ],
          description: `定价模型：${u.pricingModel}\n收入类型：${u.incomeType}`,
          bullets: [
            "成本构成：" + u.costComposition.join("、"),
            ...u.kpis.map((k) => `${k.label}：目标 ${k.target}${k.actual ? `，当前 ${k.actual}` : ""}`),
          ],
        },
      });
      edges.push({ from: `cat-${c}`, to: `am-${u.name}` });
      idx += 1;
    });
  });

  return { nodes, edges };
}

// =====================================================================
// KPI table per category
// =====================================================================
function KPISection({ design }: { design: EnterpriseDesign }) {
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Target className="h-4 w-4 text-[color:var(--primary)]" /> 阿米巴核心 KPI</span>}
        desc="每个阿米巴的目标值与当前实际值。绿色 = 达成 / 琥珀 = 接近 / 红色 = 偏离"
      />
      <CardBody className="px-0 py-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2 text-left font-medium">阿米巴</th>
              <th className="px-2 py-2 text-left font-medium">类别</th>
              <th className="px-2 py-2 text-left font-medium">收入类型</th>
              <th className="px-2 py-2 text-left font-medium">核心 KPI（目标 → 实际）</th>
            </tr>
          </thead>
          <tbody>
            {design.amibas.map((u) => (
              <tr key={u.name} className="border-b border-border last:border-0 align-top">
                <td className="px-5 py-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground">{u.leader}</div>
                </td>
                <td className="px-2 py-3">
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px]"
                    style={{ background: CATEGORY_META[u.category].color + "22", color: CATEGORY_META[u.category].color }}
                  >
                    {CATEGORY_META[u.category].label}
                  </span>
                </td>
                <td className="px-2 py-3 text-xs text-muted-foreground">{u.incomeType}</td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.kpis.map((k, i) => {
                      const tone = k.tone || "neutral";
                      const color =
                        tone === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        tone === "warn" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        tone === "bad" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-muted/40 text-foreground border-border";
                      return (
                        <span key={i} className={`rounded-md border px-1.5 py-0.5 text-[10px] ${color}`}>
                          <span className="opacity-70">{k.label}</span>
                          <span className="mx-1">·</span>
                          <span>{k.target}</span>
                          {k.actual && (
                            <>
                              <ChevronRight className="mx-0.5 inline h-3 w-3 opacity-60" />
                              <span className="font-mono font-semibold">{k.actual}</span>
                            </>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// =====================================================================
// Transfer pricing matrix
// =====================================================================
function TransferPriceMatrixCard({ design }: { design: EnterpriseDesign }) {
  // Build matrix grid
  const allFroms = Array.from(new Set(design.transferPrices.map((tp) => tp.from)));
  const allTos = Array.from(new Set(design.transferPrices.map((tp) => tp.to)));
  if (allFroms.length === 0) return null;

  const lookup = new Map<string, typeof design.transferPrices[number]>();
  design.transferPrices.forEach((tp) => lookup.set(`${tp.from}::${tp.to}`, tp));

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Calculator className="h-4 w-4 text-[color:var(--primary)]" /> 内部转让定价矩阵</span>}
        desc={`${design.transferPrices.length} 条定价关系 · 行 = 卖方，列 = 买方`}
      />
      <CardBody className="px-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">卖方 ↓ &nbsp;/ &nbsp;买方 →</th>
                {allTos.map((to) => (
                  <th key={to} className="px-2 py-2 text-left font-medium">{to}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFroms.map((from) => (
                <tr key={from} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{from}</td>
                  {allTos.map((to) => {
                    const tp = lookup.get(`${from}::${to}`);
                    return (
                      <td key={to} className="px-2 py-2 align-top">
                        {tp ? (
                          <div className="rounded-md border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/[0.04] px-2 py-1.5">
                            <div className="font-mono text-[11px] font-semibold text-[color:var(--primary)]">{tp.price}</div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">{tp.formula}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-muted/20 px-5 py-2 text-[10px] text-muted-foreground">
          规则：季度初核定，期间冻结；如需调整需总部与阿米巴长协商。完整规则见「企业画像」→「财务核算方法」
        </div>
      </CardBody>
    </Card>
  );
}
