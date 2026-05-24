"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, HelpCircle, Building2, Loader2 } from "lucide-react";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { IndustryComparison } from "../../../components/diagnosis/IndustryComparison";
import { G6NeuralView as NeuralMap } from "../../../components/g6/G6NeuralView";
import type { NMEdge, NMNode, NMTone } from "../../../components/demo/NeuralMap";
import { EngineChat } from "../../../components/agent/EngineChat";
import { RoadmapMindmapCard } from "../../../components/demo/RoadmapMindmap";
import { DIMENSION_LABELS, INDUSTRY_LABELS, type DimensionKey, type DiagnosisSummary, type Industry } from "../../../lib/diagnosis-types";

interface Enterprise {
  id: string; name: string; industry: Industry; scale?: string; contact?: string;
  latestSummary?: DiagnosisSummary | null;
  memory?: string;
  createdAt: string; updatedAt: string;
}

export default function ProfilePage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selected, setSelected] = useState<Enterprise | null>(null);
  const [chatSubject, setChatSubject] = useState<{ label: string; meta?: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetch("/api/enterprises").then((r) => r.json());
        const list: Enterprise[] = d.enterprises || [];

        // For enterprises lacking a baked-in latestSummary, try to find the
        // most recent completed conversation and back-fill the summary so the
        // profile page renders correctly even if finalize never ran.
        await Promise.all(list.map(async (e) => {
          if (e.latestSummary) return;
          try {
            const cr = await fetch(`/api/conversations?enterpriseId=${e.id}`);
            if (!cr.ok) return;
            const cd = await cr.json();
            const conversations: Array<{ id: string; status: string; summary?: unknown; updatedAt: string }> = cd.conversations || [];
            // Prefer a completed one; otherwise fall back to ANY conv with a summary
            // (covers historical data where the status field was never persisted)
            const withSummary = conversations.find((c) => c.status === "completed" && c.summary)
                              || conversations.find((c) => c.summary);
            if (!withSummary) return;
            const full = await fetch(`/api/conversations/${withSummary.id}`).then((r) => r.json());
            if (full.conversation?.summary) {
              e.latestSummary = full.conversation.summary;
            }
          } catch { /* ignore per-enterprise errors */ }
        }));

        setEnterprises(list);
        const withSummary = list.find((e) => e.latestSummary);
        setSelected(withSummary || list[0] || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <PageShell title="企业画像">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中
        </div>
      </PageShell>
    );
  }

  if (enterprises.length === 0) {
    return (
      <PageShell title="企业画像" subtitle="基于六维诊断生成的阿米巴落地就绪度画像">
        <Card><CardBody className="py-12 text-center text-sm text-muted-foreground">
          还没有企业档案 — 前往「诊断引擎」新建企业并开始诊断
        </CardBody></Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="企业画像" subtitle="基于六维诊断生成的阿米巴落地就绪度画像 · 含同行业对比">
      <div className="mx-auto max-w-6xl space-y-6">
        {enterprises.length > 1 && (
          <Card>
            <CardBody className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-muted-foreground">选择企业：</span>
              {enterprises.map((e) => {
                const active = selected?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={`rounded-md border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {e.name}
                    {e.latestSummary && <span className="ml-1.5 font-mono text-[10px]">{e.latestSummary.score}</span>}
                  </button>
                );
              })}
            </CardBody>
          </Card>
        )}

        {selected && <EnterpriseProfile enterprise={selected} onRoadmapNodeSelected={setChatSubject} />}
      </div>

      <EngineChat
        page="企业画像"
        enterprise={selected?.name}
        subject={chatSubject?.label}
        facts={buildProfileFacts(selected, chatSubject)}
      />
    </PageShell>
  );
}

function EnterpriseProfile({
  enterprise, onRoadmapNodeSelected,
}: {
  enterprise: Enterprise;
  onRoadmapNodeSelected?: (s: { label: string; meta?: Record<string, unknown> } | null) => void;
}) {
  const summary = enterprise.latestSummary;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold">{enterprise.name}</div>
              <div className="text-xs text-muted-foreground">
                {INDUSTRY_LABELS[enterprise.industry]}
                {enterprise.scale && ` · ${enterprise.scale}`}
                {enterprise.contact && ` · ${enterprise.contact}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Stat label="综合就绪度" value={summary ? `${summary.score}` : "—"} suffix={summary ? "/ 100" : ""} tone="primary" />
            <Stat label="推荐档次" value={summary?.level || "—"} />
            <Stat label="预计周期" value={summary?.cycle || "—"} />
          </div>
        </CardBody>
      </Card>

      {/* Master roadmap mindmap — moved here from planning. Only shown when
          the enterprise has a corresponding demo roadmap (mvp dataset). */}
      {demoSlugForEnterprise(enterprise) && (
        <RoadmapMindmapCard
          slug={demoSlugForEnterprise(enterprise)!}
          onNodeSelected={onRoadmapNodeSelected}
        />
      )}

      {!summary ? (
        <Card><CardBody className="py-10 text-center text-sm text-muted-foreground">
          该企业还没有完成的诊断 — 前往「诊断引擎」开始或完成诊断
        </CardBody></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader title="六维评分" />
              <CardBody className="space-y-3">
                {(Object.keys(DIMENSION_LABELS) as DimensionKey[]).map((k) => {
                  const v = summary.dimension_scores?.[k] ?? 0;
                  return (
                    <div key={k}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium">{DIMENSION_LABELS[k]}</span>
                        <span className="text-muted-foreground">{v}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[color:var(--primary)]" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <PanelCard className="lg:col-span-1" title="优势项" desc="可快速启动" tone="success" icon={CheckCircle2} items={summary.advantages} />
            <PanelCard className="lg:col-span-1" title="风险项" desc="需重点关注" tone="danger" icon={AlertTriangle} items={summary.risks} />
          </div>

          {/* Neural diagnostic map: six dimensions with their L1/L2/L3 sub-issues */}
          <Card>
            <CardHeader
              title="诊断维度神经图"
              desc="中心节点 = 6 个维度，向外辐射 = 该维度下的 L1/L2/L3 关键问题。颜色按得分自动分级"
            />
            <CardBody>
              <NeuralMap
                title="点击中心节点查看该维度评估，点击外圈查看关键问题"
                layerLabels={["维度（中心）", "关键问题（外圈）"]}
                nodes={buildDimensionNeuralNodes(summary, enterprise.industry)}
                edges={buildDimensionNeuralEdges(summary)}
                onNodeSelected={onRoadmapNodeSelected}
              />
            </CardBody>
          </Card>

          {/* Issue ↔ Risk ↔ Decision graph */}
          {(summary.risks.length > 0 || summary.decisions.length > 0) && (
            <Card>
              <CardHeader
                title="问题关联图"
                desc="风险根因 → 影响维度 → 待决策点 的关联关系。红色=高影响 / 琥珀=中 / 蓝色=待决策"
              />
              <CardBody>
                <NeuralMap
                  layerLabels={["优势（绿）", "风险（红/橙）", "影响维度", "决策点（蓝）"]}
                  nodes={buildIssuesNeuralNodes(summary)}
                  edges={buildIssuesNeuralEdges(summary)}
                  aspect={1.8}
                  onNodeSelected={onRoadmapNodeSelected}
                />
              </CardBody>
            </Card>
          )}

          <IndustryComparison
            industry={enterprise.industry}
            score={summary.score}
            dimensionScores={summary.dimension_scores}
          />

          <Card>
            <CardHeader title="关键决策点" desc="进入规划引擎前需对齐的判断" />
            <CardBody className="space-y-3">
              {summary.decisions.map((d, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--primary)]" />
                  <div className="text-sm">{d}</div>
                </div>
              ))}
              <div className="pt-2">
                <Badge tone="primary">下一步</Badge>
                <span className="ml-2 text-sm text-muted-foreground">前往「规划引擎」基于约束条件求解最优路径 →</span>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {enterprise.memory && (
        <Card>
          <CardHeader title="长期记忆" desc="历次诊断沉淀，作为下次对话的上下文" />
          <CardBody>
            <div className="whitespace-pre-wrap text-sm text-foreground">{enterprise.memory}</div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone?: "primary" }) {
  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline justify-end gap-1">
        <span className={`text-2xl font-semibold ${tone === "primary" ? "text-[color:var(--primary)]" : "text-foreground"}`}>{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function PanelCard({
  title, desc, tone, icon: Icon, items, className,
}: {
  title: string; desc?: string; tone: "success" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  items: string[]; className?: string;
}) {
  const color = tone === "success" ? "text-emerald-600" : "text-red-600";
  return (
    <Card className={className}>
      <CardHeader title={<span className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /> {title}</span>} desc={desc} />
      <CardBody>
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground">—</div>
        ) : (
          <ul className="space-y-2">
            {items.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

// =====================================================================
// Neural map builders
// =====================================================================

function scoreToTone(score: number): NMTone {
  if (score >= 75) return "ok";
  if (score >= 60) return "primary";
  if (score >= 45) return "warn";
  return "bad";
}

const DIM_SUB_ISSUES: Record<DimensionKey, Array<{ label: string; tone: NMTone; desc: string }>> = {
  organization: [
    { label: "L1 结构",     tone: "primary", desc: "部门数量 / 人员规模 / 汇报层级是否清晰" },
    { label: "L2 决策权",   tone: "warn",    desc: "决策权是否过度集中于老板一人" },
    { label: "L3 变革史",   tone: "primary", desc: "历史变革阻力与处置经验" },
  ],
  finance: [
    { label: "L1 营收成本", tone: "ok",      desc: "营收 / 毛利 / 主要成本结构基线" },
    { label: "L2 核算粒度", tone: "primary", desc: "目前核算精细到哪一级" },
    { label: "L3 数据质量", tone: "warn",    desc: "财务数据可靠度与历史失控领域" },
  ],
  it: [
    { label: "L1 系统清单", tone: "primary", desc: "ERP / MES / WMS / CRM 覆盖情况" },
    { label: "L2 集成程度", tone: "bad",     desc: "系统间数据是否打通 · 当前关键缺口" },
    { label: "L3 团队配置", tone: "warn",    desc: "IT 自有 / 外包 / 兼职" },
  ],
  equipment: [
    { label: "L1 设备资产", tone: "primary", desc: "主要设备清单与折旧状态" },
    { label: "L2 能耗计量", tone: "warn",    desc: "总表 / 分表 / 子表三级覆盖度" },
    { label: "L3 设备共用", tone: "primary", desc: "多阿米巴共用设备的归属规则" },
  ],
  process: [
    { label: "L1 订单 L/T",  tone: "primary", desc: "下单到交付的总周期" },
    { label: "L2 内部定价",  tone: "warn",    desc: "是否存在内部转移定价机制" },
    { label: "L3 质量体系",  tone: "ok",      desc: "IATF16949 / ISO 体系成熟度" },
  ],
  culture: [
    { label: "L1 改善意识", tone: "warn",    desc: "员工是否主动提改善建议" },
    { label: "L2 经营意识", tone: "warn",    desc: "中层是否主动关注盈亏" },
    { label: "L3 变革阻力", tone: "primary", desc: "推进变革时的关键阻力" },
  ],
};

function buildDimensionNeuralNodes(summary: DiagnosisSummary, industry: Industry): NMNode[] {
  const nodes: NMNode[] = [];
  (Object.keys(DIMENSION_LABELS) as DimensionKey[]).forEach((k, i) => {
    const score = summary.dimension_scores?.[k] ?? 0;
    nodes.push({
      id: `dim-${k}`,
      label: DIMENSION_LABELS[k],
      sub: `${score} / 100`,
      layer: 0,
      y: i / 6,
      tone: scoreToTone(score),
      r: 26,
      detail: {
        title: `${DIMENSION_LABELS[k]} · 得分 ${score}`,
        badges: [
          { label: `就绪度 ${score}`, tone: scoreToTone(score) },
          { label: industry === "auto_parts" ? "汽车零部件" : industry === "project_equipment" ? "项目制非标" : "其他", tone: "primary" },
        ],
        description: `该维度从 L1 表层 → L2 中层 → L3 深层共 3 个层次。点击右侧子节点查看每一层的关键问题与企业当前状况。`,
        bullets: DIM_SUB_ISSUES[k].map((s) => `${s.label}：${s.desc}`),
      },
    });
    // 3 sub-issue nodes for this dimension
    DIM_SUB_ISSUES[k].forEach((iss, j) => {
      nodes.push({
        id: `iss-${k}-${j}`,
        label: iss.label,
        sub: DIMENSION_LABELS[k],
        layer: 1,
        // distribute 18 sub-issues across the right column
        y: (i * 3 + j) / 18,
        tone: iss.tone,
        r: 18,
        detail: {
          title: iss.label + " · " + DIMENSION_LABELS[k],
          description: iss.desc,
          badges: [{ label: DIMENSION_LABELS[k], tone: scoreToTone(summary.dimension_scores?.[k] ?? 0) }],
        },
      });
    });
  });
  return nodes;
}

function buildDimensionNeuralEdges(_summary: DiagnosisSummary): NMEdge[] {
  const edges: NMEdge[] = [];
  (Object.keys(DIMENSION_LABELS) as DimensionKey[]).forEach((k) => {
    [0, 1, 2].forEach((j) => {
      edges.push({ from: `dim-${k}`, to: `iss-${k}-${j}` });
    });
  });
  return edges;
}

// ------ Issues graph ------

function pickKeyword(text: string): DimensionKey[] {
  const map: Record<string, DimensionKey[]> = {
    "MES": ["it", "equipment"],
    "ERP": ["it", "finance"],
    "财务": ["finance"],
    "核算": ["finance"],
    "管理者": ["organization", "culture"],
    "变革": ["organization", "culture"],
    "辅料": ["process", "finance"],
    "能耗": ["equipment", "process"],
    "工时": ["it", "equipment"],
    "工艺": ["process", "equipment"],
    "信息化": ["it"],
    "信息化系统": ["it"],
    "质量": ["process"],
    "客诉": ["process", "culture"],
    "组织": ["organization"],
    "试点": ["organization", "process"],
    "顾问": ["organization"],
    "决策": ["organization"],
  };
  const hit = new Set<DimensionKey>();
  Object.keys(map).forEach((kw) => { if (text.includes(kw)) map[kw].forEach((d) => hit.add(d)); });
  if (hit.size === 0) hit.add("organization");
  return Array.from(hit);
}

function buildIssuesNeuralNodes(summary: DiagnosisSummary): NMNode[] {
  const nodes: NMNode[] = [];

  // Layer 0: advantages (green)
  summary.advantages.slice(0, 4).forEach((a, i) => {
    nodes.push({
      id: `adv-${i}`,
      label: a.length > 12 ? a.slice(0, 11) + "…" : a,
      sub: "优势",
      layer: 0,
      y: i / 4,
      tone: "ok",
      r: 18,
      detail: { title: "优势项", description: a, badges: [{ label: "优势", tone: "ok" }] },
    });
  });

  // Layer 1: risks (red/amber)
  summary.risks.slice(0, 5).forEach((r, i) => {
    const tone: NMTone = i < 2 ? "bad" : "warn";
    nodes.push({
      id: `risk-${i}`,
      label: r.length > 12 ? r.slice(0, 11) + "…" : r,
      sub: tone === "bad" ? "高风险" : "中风险",
      layer: 1,
      y: i / 5,
      tone,
      r: 20,
      detail: { title: "风险项", description: r, badges: [{ label: tone === "bad" ? "高风险" : "中风险", tone }] },
    });
  });

  // Layer 2: 6 dimensions
  (Object.keys(DIMENSION_LABELS) as DimensionKey[]).forEach((k, i) => {
    const score = summary.dimension_scores?.[k] ?? 0;
    nodes.push({
      id: `dim2-${k}`,
      label: DIMENSION_LABELS[k],
      sub: `${score}`,
      layer: 2,
      y: i / 6,
      tone: scoreToTone(score),
      r: 20,
      detail: {
        title: `${DIMENSION_LABELS[k]} · 得分 ${score}`,
        description: `该维度受到与之相连的风险影响。`,
        badges: [{ label: `就绪度 ${score}`, tone: scoreToTone(score) }],
      },
    });
  });

  // Layer 3: decisions
  summary.decisions.slice(0, 4).forEach((d, i) => {
    nodes.push({
      id: `dec-${i}`,
      label: d.length > 12 ? d.slice(0, 11) + "…" : d,
      sub: "决策点",
      layer: 3,
      y: i / 4,
      tone: "primary",
      r: 20,
      detail: { title: "决策点", description: d, badges: [{ label: "待决策", tone: "primary" }] },
    });
  });

  return nodes;
}

function buildIssuesNeuralEdges(summary: DiagnosisSummary): NMEdge[] {
  const edges: NMEdge[] = [];
  // advantage → dimension（支持的维度）
  summary.advantages.slice(0, 4).forEach((a, i) => {
    pickKeyword(a).forEach((d) => edges.push({ from: `adv-${i}`, to: `dim2-${d}` }));
  });
  // risk → dimension（影响的维度）
  summary.risks.slice(0, 5).forEach((r, i) => {
    pickKeyword(r).forEach((d) => edges.push({ from: `risk-${i}`, to: `dim2-${d}` }));
  });
  // dimension → decision（哪些决策由哪些维度驱动）
  summary.decisions.slice(0, 4).forEach((d, i) => {
    pickKeyword(d).forEach((dim) => edges.push({ from: `dim2-${dim}`, to: `dec-${i}` }));
  });
  return edges;
}

/**
 * Resolve a real Enterprise (from API) to a demo dataset slug so that the
 * roadmap mindmap can find pre-authored data. Matches by exact / fuzzy name.
 */
const DEMO_NAME_TO_SLUG: Array<{ keyword: string; slug: string }> = [
  { keyword: "宁波恒展",   slug: "ningbo-hengzhan" },
  { keyword: "苏州智微",   slug: "suzhou-zhiwei" },
  { keyword: "杭州金鼎",   slug: "hangzhou-jinding" },
  { keyword: "上海昌远",   slug: "shanghai-changyuan" },
];

function demoSlugForEnterprise(e: Enterprise): string | null {
  const hit = DEMO_NAME_TO_SLUG.find((m) => e.name.includes(m.keyword));
  return hit ? hit.slug : null;
}

function buildProfileFacts(
  e: Enterprise | null,
  subj: { label: string; meta?: Record<string, unknown> } | null
): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [];
  if (e?.latestSummary) {
    facts.push({ label: "综合就绪度", value: `${e.latestSummary.score}/100` });
    facts.push({ label: "推荐档次", value: e.latestSummary.level });
    facts.push({ label: "预计周期", value: e.latestSummary.cycle });
    facts.push({
      label: "六维评分",
      value: Object.entries(e.latestSummary.dimension_scores || {}).map(([k, v]) => `${k}:${v}`).join("、"),
    });
  }
  if (subj?.meta) {
    const m = subj.meta as Record<string, string | undefined>;
    if (m.description) facts.push({ label: "节点说明", value: String(m.description) });
    if (m.dataSource)  facts.push({ label: "数据源", value: String(m.dataSource) });
    if (m.method)      facts.push({ label: "采集 / 实施方式", value: String(m.method) });
    if (m.owner)       facts.push({ label: "责任人", value: String(m.owner) });
    if (m.eta)         facts.push({ label: "时间窗口", value: String(m.eta) });
    if (m.cost)        facts.push({ label: "预算 / 投入", value: String(m.cost) });
    if (m.risk)        facts.push({ label: "风险", value: String(m.risk) });
    if (m.mitigation)  facts.push({ label: "缓解措施", value: String(m.mitigation) });
  }
  return facts;
}
