// 快速诊断：一段文字/文档 → AI 抽取结构化 → 内置标准规则引擎出诊断结论。
// 不落库、不生成画像/部署。复用诊断引擎的数据形状(CostFinding/PerNode/MethodFinding)以便复用现有图表。
import type { CostFinding, MethodFinding, PerNode, NodeDim } from "./diagnosis";

export interface QuickNode {
  name: string;
  labor?: { std?: number; act?: number };
  material?: { std?: number; act?: number };
  methodRecommended?: string;
  methodActual?: string;
  metrics?: { inputAccuracy?: number; inputTimeliness?: number; outputAccuracy?: number; outputTimeliness?: number };
}

export interface QuickResult {
  nodeCount: number;
  summary: { overspend: number; methodGaps: number; qualityIssues: number };
  maturity: { overall: number; level: number; levelLabel: string; dims: { label: string; score: number }[] };
  costFindings: CostFinding[];
  methodFindings: MethodFinding[];
  qualityNodes: PerNode[];
}

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const modeLevel = (s?: string): number => {
  if (!s) return 0;
  if (/系统|模块|ERP|MES|PLM|PDM|APS|WMS/i.test(s)) return 5;
  if (/OA|审批/.test(s)) return 4;
  if (/半自动/.test(s)) return 3;
  if (/Excel|电子/.test(s)) return 2;
  if (/手工/.test(s)) return 1;
  return 2;
};
const levelOf = (s: number) => (s >= 90 ? 5 : s >= 78 ? 4 : s >= 65 ? 3 : s >= 50 ? 2 : 1);
const OVERALL_LABEL = ["", "L1 萌芽", "L2 起步", "L3 规范", "L4 精益", "L5 卓越"];
const dim = (std: number, act: number): NodeDim => ({ std: round(std), act: round(act), diff: round(act - std) });

export const QUICK_SYS = `你是制造业精益诊断顾问。从用户给的企业流程/成本/信息化描述中，抽取结构化诊断数据。
识别其中的业务环节，对每个环节给出：name(环节名)、laborStd/laborAct(该环节人工成本 标准参考/实际，元/期；描述没写则按行业通用水平合理推断标准、实际按描述)、materialStd/materialAct(材料成本同理)、methodRecommended(完成该环节最优工作方式，如"ERP核算模块"/"MES系统")、methodActual(描述中的实际方式，如"手工统计"/"Excel传递"，没写按描述语气推断)、inputAccuracy/inputTimeliness/outputAccuracy/outputTimeliness(输入/输出 准确率·及时率%，0-100，没提及给行业常见值)。
输出严格 JSON：{"nodes":[{"name":"","laborStd":0,"laborAct":0,"materialStd":0,"materialAct":0,"methodRecommended":"","methodActual":"","inputAccuracy":0,"inputTimeliness":0,"outputAccuracy":0,"outputTimeliness":0}]}。只输出 JSON，不要解释。`;

export function stripJson(s: string): string {
  const m = s.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/);
  return m ? m[0] : s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseRawToNodes(raw: any): QuickNode[] {
  const arr = Array.isArray(raw?.nodes) ? raw.nodes : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((n: any) => ({
    name: String(n.name || "未命名环节"),
    labor: { std: +n.laborStd || 0, act: +n.laborAct || 0 },
    material: { std: +n.materialStd || 0, act: +n.materialAct || 0 },
    methodRecommended: n.methodRecommended || "",
    methodActual: n.methodActual || "",
    metrics: {
      inputAccuracy: n.inputAccuracy != null ? +n.inputAccuracy : undefined,
      inputTimeliness: n.inputTimeliness != null ? +n.inputTimeliness : undefined,
      outputAccuracy: n.outputAccuracy != null ? +n.outputAccuracy : undefined,
      outputTimeliness: n.outputTimeliness != null ? +n.outputTimeliness : undefined,
    },
  }));
}

export function quickDiagnose(nodes: QuickNode[]): QuickResult {
  const costFindings: CostFinding[] = [];
  const methodFindings: MethodFinding[] = [];
  const qualityNodes: PerNode[] = [];
  let ctrlGood = 0, ctrlTot = 0, modeSum = 0, modeCnt = 0, qSum = 0, qCnt = 0;

  nodes.forEach((n, i) => {
    const id = "q" + i;
    const labor = dim(n.labor?.std || 0, n.labor?.act || 0);
    const material = dim(n.material?.std || 0, n.material?.act || 0);
    const equipment = dim(0, 0);
    ([["labor", labor, "人（人工）"], ["material", material, "料（材料）"]] as const).forEach(([f, v, lab]) => {
      if (v.std > 0 || v.act > 0) { ctrlTot++; if (v.diff <= Math.max(1, v.std * 0.03)) ctrlGood++; }
      if (v.diff > 0) costFindings.push({ nodeId: id, nodeName: n.name, factor: f, factorLabel: lab, std: v.std, act: v.act, diff: v.diff });
    });
    const rl = modeLevel(n.methodRecommended), al = modeLevel(n.methodActual);
    if (al > 0) { modeSum += al; modeCnt++; }
    if (n.methodActual && n.methodRecommended && al < rl) methodFindings.push({ nodeId: id, nodeName: n.name, recommended: n.methodRecommended, actual: n.methodActual });
    const mt = n.metrics || {};
    (["inputAccuracy", "inputTimeliness", "outputAccuracy", "outputTimeliness"] as const).forEach((k) => { const v = mt[k]; if (typeof v === "number") { qSum += v; qCnt++; } });
    qualityNodes.push({ nodeId: id, nodeName: n.name, hasData: true, labor, equipment, material, ...mt, infoLevel: al || undefined });
  });

  const costScore = ctrlTot ? clamp((ctrlGood / ctrlTot) * 100) : 100;
  const infoScore = modeCnt ? clamp((modeSum / modeCnt / 5) * 100) : 0;
  const qualityScore = qCnt ? clamp(qSum / qCnt) : 0;
  const dims = [
    { label: "成本可控度", score: costScore },
    { label: "信息化成熟度", score: infoScore },
    { label: "质量水平", score: qualityScore },
  ];
  const overall = clamp(costScore * 0.4 + infoScore * 0.3 + qualityScore * 0.3);
  const level = levelOf(overall);
  const overspend = round(costFindings.reduce((s, f) => s + f.diff, 0));

  costFindings.sort((a, b) => b.diff - a.diff);
  return {
    nodeCount: nodes.length,
    summary: { overspend, methodGaps: methodFindings.length, qualityIssues: qualityNodes.reduce((s, n) => s + (["inputAccuracy", "inputTimeliness", "outputAccuracy", "outputTimeliness"] as const).filter((k) => typeof n[k] === "number" && (n[k] as number) < 90).length, 0) },
    maturity: { overall, level, levelLabel: OVERALL_LABEL[level], dims },
    costFindings, methodFindings, qualityNodes,
  };
}

// 演示样例（无需 AI，验证渲染链路）
export const QUICK_SAMPLE: QuickNode[] = [
  { name: "商机报价", labor: { std: 1200, act: 1800 }, material: { std: 0, act: 0 }, methodRecommended: "ERP核算模块", methodActual: "手工统计", metrics: { inputAccuracy: 82, inputTimeliness: 90, outputAccuracy: 85, outputTimeliness: 88 } },
  { name: "工艺与BOM", labor: { std: 1500, act: 1500 }, material: { std: 200, act: 260 }, methodRecommended: "PLM/PDM系统", methodActual: "Excel传递", metrics: { inputAccuracy: 95, inputTimeliness: 92, outputAccuracy: 90, outputTimeliness: 91 } },
  { name: "生产制造", labor: { std: 3000, act: 3600 }, material: { std: 5000, act: 5400 }, methodRecommended: "MES系统", methodActual: "MES系统", metrics: { inputAccuracy: 96, inputTimeliness: 88, outputAccuracy: 93, outputTimeliness: 80 } },
  { name: "质量检验", labor: { std: 800, act: 900 }, material: { std: 0, act: 0 }, methodRecommended: "质量系统模块", methodActual: "手工统计", metrics: { inputAccuracy: 78, inputTimeliness: 85, outputAccuracy: 82, outputTimeliness: 86 } },
  { name: "入库发运", labor: { std: 600, act: 600 }, material: { std: 100, act: 90 }, methodRecommended: "WMS系统模块", methodActual: "半自动化采集统计", metrics: { inputAccuracy: 92, inputTimeliness: 95, outputAccuracy: 94, outputTimeliness: 96 } },
];
