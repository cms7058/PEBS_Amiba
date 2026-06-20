import { listByEnterprise as listCosts } from "./node-cost";
import { listByEnterprise as listSubflows } from "./subflow";
import { listTemplates } from "./otd";
import { THREE_PROPS_LABELS } from "./otd-types";
import { costVariance, pendingQuestions, asItemized, type IOCost } from "./cost-types";

// 诊断引擎（设计方案 §14.3）：汇总规则引擎沉淀的数据 → 成本问题 + 改进方向。
// 数据源：节点成本（标准参考 vs 实际 + 工作方式 + 质量指标）、子流程、OTD 模板（三性）。

const FACTOR_LABEL = { labor: "人（人工）", equipment: "工作方式（设备/信息系统）", material: "料（材料）" } as const;

export interface CostFinding { nodeId: string; nodeName: string; factor: keyof typeof FACTOR_LABEL; factorLabel: string; std: number; act: number; diff: number }
export interface MethodFinding { nodeId: string; nodeName: string; recommended: string; actual: string }
export interface QualityFinding { nodeId: string; nodeName: string; metric: string; value: number }
export interface IncompleteFinding { nodeId: string; nodeName: string; items: string[] }
export interface RiskFinding { nodeId: string; nodeName: string; prop: string; note?: string }

export interface NodeDim { std: number; act: number; diff: number }
export interface PerNode {
  nodeId: string; nodeName: string; hasData: boolean;
  labor: NodeDim; equipment: NodeDim; material: NodeDim;
  inputAccuracy?: number; inputTimeliness?: number; outputAccuracy?: number; outputTimeliness?: number;
  infoLevel?: number; // 实际工作方式自动化等级均值(1手工…5系统模块)，供信息化桑基/评分
}
// 树节点：dims 为「本节点 + 整个子树」的汇总，children 为下一层子流程节点
export interface TreeNode extends PerNode { children: TreeNode[] }

// 成熟度评分（管理 + 信息化水平体检）
export interface DimScore { key: string; label: string; score: number; level: number; basis: string; advice: string }
export interface MaturityRec { title: string; detail: string; impact: string }
export interface Maturity {
  overall: number; level: number; levelLabel: string; summary: string;
  dims: DimScore[];
  modeDist: { label: string; count: number; level: number }[];
  recommendations: MaturityRec[];
}

export interface Diagnosis {
  summary: { overspend: number; methodGaps: number; qualityIssues: number; incompleteNodes: number; riskNodes: number; nodesWithData: number; totalNodes: number };
  maturity: Maturity;
  tree: TreeNode[];
  nodes: PerNode[];
  costFindings: CostFinding[];
  methodFindings: MethodFinding[];
  qualityFindings: QualityFinding[];
  incompleteFindings: IncompleteFinding[];
  riskFindings: RiskFinding[];
}

const QUALITY_THRESHOLD = 90; // 准确率/及时率低于此判为问题

export async function runDiagnosis(enterpriseId: string, opts: { ignoreRealized?: boolean } = {}): Promise<Diagnosis> {
  const [rawCosts, subflows, templates] = await Promise.all([
    listCosts(enterpriseId), listSubflows(enterpriseId), listTemplates(enterpriseId),
  ]);
  // baseline（改进前）：剥离 PDCA 回写，得到原始诊断，用于和当前对比"改进成果"
  const costs = opts.ignoreRealized ? rawCosts.map((c) => ({ ...c, realized: undefined })) : rawCosts;

  const nameById = new Map<string, string>();
  templates.forEach((t) => t.nodes.forEach((n) => nameById.set(n.id, n.name)));
  subflows.forEach((s) => s.activities.forEach((a) => nameById.set(a.id, a.name)));
  const nameOf = (id: string, fallback?: string) => nameById.get(id) || fallback || id;

  const subByOwner = new Map(subflows.map((s) => [s.ownerNodeId, s]));

  // 可达节点集合：从 OTD 模板节点出发，沿子流程(ownerNodeId)逐层下钻。
  // 覆盖/重建子流程后产生的孤儿旧成本（节点已不在任何当前流程中）将被排除。
  const reachable = new Set<string>();
  const visit = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    subByOwner.get(id)?.activities.forEach((a) => visit(a.id));
  };
  templates.forEach((t) => t.nodes.forEach((n) => visit(n.id)));

  const costFindings: CostFinding[] = [];
  const methodFindings: MethodFinding[] = [];
  const qualityFindings: QualityFinding[] = [];
  const incompleteFindings: IncompleteFinding[] = [];

  const reachableCosts = costs.filter((nc) => reachable.has(nc.nodeId));
  const costByNode = new Map(reachableCosts.map((nc) => [nc.nodeId, nc]));

  for (const nc of reachableCosts) {
    const name = nameOf(nc.nodeId, nc.label);
    const v = costVariance(nc);
    (["labor", "equipment", "material"] as const).forEach((f) => {
      if (v[f].diff > 0) costFindings.push({ nodeId: nc.nodeId, nodeName: name, factor: f, factorLabel: FACTOR_LABEL[f], std: v[f].std, act: v[f].act, diff: v[f].diff });
    });
    const wm = nc.workMethod;
    if (!nc.realized?.method && wm?.actual && wm?.recommended && wm.actual !== wm.recommended) {
      methodFindings.push({ nodeId: nc.nodeId, nodeName: name, recommended: wm.recommended, actual: wm.actual });
    }
    const mt = nc.metrics || {};
    if (!nc.realized?.quality) {
      ([["inputAccuracy", "输入准确率"], ["inputTimeliness", "输入及时率"], ["outputAccuracy", "输出准确率"], ["outputTimeliness", "输出及时率"]] as const)
        .forEach(([k, lab]) => { const val = mt[k]; if (typeof val === "number" && val < QUALITY_THRESHOLD) qualityFindings.push({ nodeId: nc.nodeId, nodeName: name, metric: lab, value: val }); });
    }
    const pend = pendingQuestions(nc);
    if (pend.length) incompleteFindings.push({ nodeId: nc.nodeId, nodeName: name, items: pend });
  }

  // OTD 节点三性高风险点
  const riskFindings: RiskFinding[] = [];
  templates.forEach((t) => t.nodes.forEach((n) => {
    if (n.riskProp) riskFindings.push({ nodeId: n.id, nodeName: n.name, prop: THREE_PROPS_LABELS[n.riskProp], note: n.riskNote });
  }));

  // 层级树：顶层 = OTD 模板节点；下一层 = 该节点子流程(ownerNodeId)的活动，递归。
  // 父节点 dims 为整个子树汇总；叶子数据节点收集到 nodes（供维度归集树）。
  const ZERO: NodeDim = { std: 0, act: 0, diff: 0 };
  const addDim = (a: NodeDim, b: NodeDim): NodeDim => ({ std: a.std + b.std, act: a.act + b.act, diff: a.diff + b.diff });
  const nodes: PerNode[] = []; // 叶子数据节点
  let total = 0;

  function build(id: string, name: string): TreeNode {
    total++;
    const nc = costByNode.get(id);
    const sf = subByOwner.get(id);
    const children = sf
      ? sf.activities.slice().sort((a, b) => a.seq - b.seq).map((a) => build(a.id, nameOf(a.id, a.name)))
      : [];

    let labor = ZERO, equipment = ZERO, material = ZERO, hasData = false;
    let metrics: Pick<PerNode, "inputAccuracy" | "inputTimeliness" | "outputAccuracy" | "outputTimeliness"> = {};

    let infoLevel: number | undefined;
    if (nc) {
      const v = costVariance(nc);
      const mt = nc.metrics || {};
      const ai = asItemized(nc.actual);
      const lvls = [...ai.inputs, ...ai.outputs].map((it) => modeLevel(it.method)).filter((l) => l > 0);
      if (lvls.length) infoLevel = Math.round((lvls.reduce((a, b) => a + b, 0) / lvls.length) * 10) / 10;
      if (nc.realized?.method) infoLevel = 5; // 回写：工作方式已升级到系统模块
      const lift = (x?: number) => (typeof x === "number" ? (nc.realized?.quality ? Math.max(x, 92) : x) : undefined);
      const selfData = [v.labor, v.equipment, v.material].some((x) => x.std > 0 || x.act > 0)
        || (["inputAccuracy", "inputTimeliness", "outputAccuracy", "outputTimeliness"] as const).some((k) => typeof mt[k] === "number");
      if (selfData) {
        labor = v.labor; equipment = v.equipment; material = v.material; hasData = true;
        metrics = { inputAccuracy: lift(mt.inputAccuracy), inputTimeliness: lift(mt.inputTimeliness), outputAccuracy: lift(mt.outputAccuracy), outputTimeliness: lift(mt.outputTimeliness) };
        nodes.push({ nodeId: id, nodeName: name, hasData: true, labor: v.labor, equipment: v.equipment, material: v.material, ...metrics, infoLevel });
      }
    }
    for (const c of children) {
      labor = addDim(labor, c.labor); equipment = addDim(equipment, c.equipment); material = addDim(material, c.material);
      if (c.hasData) hasData = true;
    }
    return { nodeId: id, nodeName: name, hasData, labor, equipment, material, ...metrics, infoLevel, children };
  }

  const tree: TreeNode[] = [];
  templates.forEach((t) => t.nodes.forEach((n) => tree.push(build(n.id, n.name))));
  const nodesWithData = nodes.length;

  costFindings.sort((a, b) => b.diff - a.diff);
  const overspend = Math.round(costFindings.reduce((s, f) => s + f.diff, 0) * 100) / 100;

  const maturity = computeMaturity({ reachableCosts, nodes, tree, nodesWithData, overspend, riskCount: riskFindings.length, incompleteCount: incompleteFindings.length, topOverspend: costFindings.slice(0, 3).map((f) => f.nodeName), qualityIssues: qualityFindings.length });

  return {
    summary: { overspend, methodGaps: methodFindings.length, qualityIssues: qualityFindings.length, incompleteNodes: incompleteFindings.length, riskNodes: riskFindings.length, nodesWithData, totalNodes: total },
    maturity,
    tree, nodes,
    costFindings, methodFindings, qualityFindings, incompleteFindings, riskFindings,
  };
}

// 工作方式 → 自动化等级（1 手工 … 5 系统模块）
const modeLevel = (s?: string): number => {
  if (!s) return 0;
  if (/系统|模块|ERP|MES|PLM|PDM|APS|WMS/i.test(s)) return 5;
  if (/OA|审批/.test(s)) return 4;
  if (/半自动/.test(s)) return 3;
  if (/Excel|电子/.test(s)) return 2;
  if (/手工/.test(s)) return 1;
  return 2;
};
const MODE_LABEL = ["—", "手工", "Excel/电子", "半自动", "OA/流程", "系统模块"];
const levelOf = (s: number) => (s >= 90 ? 5 : s >= 78 ? 4 : s >= 65 ? 3 : s >= 50 ? 2 : 1);
const OVERALL_LABEL = ["", "L1 萌芽", "L2 起步", "L3 规范", "L4 精益", "L5 卓越"];
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function computeMaturity(x: {
  reachableCosts: { standard?: unknown; actual?: unknown }[];
  nodes: PerNode[]; tree: TreeNode[]; nodesWithData: number;
  overspend: number; riskCount: number; incompleteCount: number; topOverspend: string[]; qualityIssues: number;
}): Maturity {
  // 信息化/自动化：实际工作方式模式的平均等级 + 与推荐的差距
  let modeLvSum = 0, modeCnt = 0, gapItems = 0;
  const bucket = new Map<number, number>();
  for (const nc of x.reachableCosts) {
    const si = asItemized(nc.standard as never), ai = asItemized(nc.actual as never);
    const pairs: [IOCost | undefined, IOCost | undefined][] = [
      ...si.inputs.map((s, i) => [s, ai.inputs[i]] as [IOCost | undefined, IOCost | undefined]),
      ...si.outputs.map((s, i) => [s, ai.outputs[i]] as [IOCost | undefined, IOCost | undefined]),
    ];
    for (const [s, a] of pairs) {
      if (!a?.method) continue;
      const lv = modeLevel(a.method);
      modeLvSum += lv; modeCnt++; bucket.set(lv, (bucket.get(lv) || 0) + 1);
      const rl = modeLevel(s?.method);
      if (rl && lv < rl) gapItems++;
    }
  }
  const infoScore = modeCnt ? clamp(modeLvSum / modeCnt / 5 * 100) : 0;

  // 成本可控：人+料要素未超支占比
  let good = 0, tot = 0;
  for (const n of x.nodes) for (const f of [n.labor, n.material]) {
    if (f.std === 0 && f.act === 0) continue;
    tot++; if (f.diff <= Math.max(1, f.std * 0.03)) good++;
  }
  const costScore = tot ? clamp(good / tot * 100) : 100;

  // 质量：各指标均值
  let qSum = 0, qCnt = 0;
  for (const n of x.nodes) (["inputAccuracy", "inputTimeliness", "outputAccuracy", "outputTimeliness"] as const).forEach((k) => { const v = n[k]; if (typeof v === "number") { qSum += v; qCnt++; } });
  const qualityScore = qCnt ? clamp(qSum / qCnt) : 0;

  // 流程规范度：末端活动建模/录入覆盖率
  let leafCount = 0; const walk = (t: TreeNode) => { if (!t.children.length) leafCount++; else t.children.forEach(walk); };
  x.tree.forEach(walk);
  const coverScore = leafCount ? clamp(x.nodesWithData / leafCount * 100) : 0;

  // 流程健全度：三性风险 + 待完善
  const denom = leafCount || 1;
  const soundScore = clamp(100 * (1 - (x.riskCount + x.incompleteCount) / denom));

  const dim = (key: string, label: string, score: number, basis: string, advice: string): DimScore => ({ key, label, score, level: levelOf(score), basis, advice });
  const dims: DimScore[] = [
    dim("process", "流程规范度", coverScore, `${x.nodesWithData}/${leafCount} 个末端活动已建模并录入`, "下钻补齐未建模/未录入的活动"),
    dim("info", "信息化 / 自动化成熟度", infoScore, `${modeCnt} 项工作方式，其中 ${gapItems} 项低于 AI 推荐`, "将手工/Excel 环节升级为系统模块"),
    dim("cost", "成本可控度", costScore, `人+料要素 ${good}/${tot} 项在标准内`, "压降超支节点的人工/材料投入"),
    dim("quality", "质量水平", qualityScore, qCnt ? `输入/输出 准确率·及时率均值 ${qualityScore}%` : "暂无质量指标", "提升准确率/及时率偏低的环节"),
    dim("sound", "流程健全度", soundScore, `三性风险 ${x.riskCount} · 待完善 ${x.incompleteCount}`, "消除三性风险、补齐缺失数据"),
  ];
  const W: Record<string, number> = { process: 0.2, info: 0.25, cost: 0.25, quality: 0.2, sound: 0.1 };
  const overall = clamp(dims.reduce((s, d) => s + d.score * (W[d.key] || 0), 0));
  const level = levelOf(overall);
  const sorted = [...dims].sort((a, b) => a.score - b.score);
  const summary = `综合成熟度 ${overall} 分（${OVERALL_LABEL[level]}）。最强：${sorted[sorted.length - 1].label}；最薄弱：${sorted[0].label}（${sorted[0].score} 分）。`;
  const modeDist = [5, 4, 3, 2, 1].map((lv) => ({ label: MODE_LABEL[lv], count: bucket.get(lv) || 0, level: lv })).filter((d) => d.count > 0);

  const recommendations: MaturityRec[] = [];
  if (infoScore < 78 && gapItems > 0) recommendations.push({ title: `推进 ${gapItems} 项工作方式信息化`, detail: `有 ${gapItems} 项输入/输出物的实际工作方式低于 AI 推荐（手工/Excel → 系统模块）。`, impact: `信息化成熟度有望升至 ${OVERALL_LABEL[levelOf(Math.min(100, infoScore + 18))]}` });
  if (x.topOverspend.length && x.overspend > 0) recommendations.push({ title: "压降重点超支环节", detail: `超支集中在：${x.topOverspend.join("、")} 等。核对实际人工/材料与标准差异。`, impact: `合计可回收约 ¥${Math.round(x.overspend)}` });
  if (qualityScore && qualityScore < 90 && x.qualityIssues > 0) recommendations.push({ title: "补强质量薄弱环节", detail: `${x.qualityIssues} 项准确率/及时率低于 90%，易致返工与交付延误。`, impact: "减少返工、提升交付及时率" });
  if (coverScore < 80) recommendations.push({ title: "提升流程建模覆盖率", detail: `仅 ${x.nodesWithData}/${leafCount} 个末端活动完成建模录入，继续下钻补齐。`, impact: "覆盖率达 80% 后诊断更可信" });
  if (x.riskCount > 0) recommendations.push({ title: "消除流程三性风险", detail: `${x.riskCount} 个节点存在合理性/完整性/正确性风险。`, impact: "降低流程合规与执行风险" });

  return { overall, level, levelLabel: OVERALL_LABEL[level], summary, dims, modeDist, recommendations: recommendations.slice(0, 5) };
}
