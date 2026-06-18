// 叶子节点成本要素（人/机/料）与纯计算。客户端/服务端共用，不依赖 fs。
// 为 P-c 费率表 + 成本归因 + rollup 打基础。

export interface LaborPerson { name: string; monthlyIncome: number }
export interface LaborInput {
  people: LaborPerson[];
  monthlyWorkHours: number;   // 月标准工时（默认 174 ≈ 21.75 天 × 8h）
  workHours: number;          // 本节点投入工时
}
export interface EquipmentItem {
  name: string;
  monthlyDepreciation: number;     // 月折旧额
  monthlyAvailableHours: number;   // 月可用工时
  usageHours: number;              // 本节点占用工时
}
export interface MaterialItem { name: string; qty: number; unit: string; unitPrice: number }

export interface PhaseFactors { labor?: number; equipment?: number; material?: number }
/** 成本按阶段拆分：输入物获取(acquire) + 输出物生成(generate)，各自含人/工作方式/料；叠加后为该要素总成本（旧聚合结构） */
export interface CostByPhase { acquire?: PhaseFactors; generate?: PhaseFactors }
/** 单个输入/输出物的成本（人/工作方式/料）+ 工作方式模式。standard 里 method=AI推荐模式，actual 里 method=用户选模式 */
export interface IOCost { name?: string; labor?: number; equipment?: number; material?: number; method?: string }
/** itemized 成本：每个输入物(inputs)/输出物(outputs)各自承载人/工作方式/料，累加为阶段与要素成本 */
export interface ItemizedCost { inputs?: IOCost[]; outputs?: IOCost[] }

export interface NodeCost {
  enterpriseId: string;
  nodeId: string;
  label?: string;
  labor?: LaborInput;
  equipment?: { items: EquipmentItem[] };   // 设备 / 信息系统（折旧/摊销）
  material?: { items: MaterialItem[] };
  /** 标准参考值（元/期）：itemized(每个输入/输出物含人/工作方式/料)；兼容旧两阶段聚合 / 扁平结构 */
  standard?: ItemizedCost | CostByPhase | PhaseFactors;
  /** 实际值（元/期）：itemized；兼容旧两阶段聚合 / 扁平结构 */
  actual?: ItemizedCost | CostByPhase | PhaseFactors;
  /** 设备/信息系统 = 完成输出物的「工作方式」：AI 推荐最优 + 候选；用户选实际。最优 vs 实际 = 信息化体检指标 */
  workMethod?: { recommended?: string; actual?: string; options?: string[] };
  /** 输入物/输出物的质量指标（%）：准确率、及时率。后期与实际成本做线性/非线性耦合，反推并修正标准参考值（越用越智能） */
  metrics?: { inputAccuracy?: number; inputTimeliness?: number; outputAccuracy?: number; outputTimeliness?: number };
  updatedAt?: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

// 人工 = Σ 月收入 × (本节点工时 / 月标准工时)
export function laborCost(l?: LaborInput): number {
  if (!l || !l.monthlyWorkHours) return 0;
  const rate = (l.workHours || 0) / l.monthlyWorkHours;
  return round(l.people.reduce((s, p) => s + (p.monthlyIncome || 0) * rate, 0));
}
// 设备 = Σ 月折旧 × (占用工时 / 月可用工时)
export function equipmentCost(e?: { items: EquipmentItem[] }): number {
  if (!e) return 0;
  return round(e.items.reduce((s, i) =>
    s + (i.monthlyAvailableHours ? (i.monthlyDepreciation || 0) * (i.usageHours || 0) / i.monthlyAvailableHours : 0), 0));
}
// 材料 = Σ 数量/重量 × 单价
export function materialCost(m?: { items: MaterialItem[] }): number {
  if (!m) return 0;
  return round(m.items.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0));
}
export function costBreakdown(nc: NodeCost) {
  const labor = laborCost(nc.labor);
  const equipment = equipmentCost(nc.equipment);
  const material = materialCost(nc.material);
  return { labor, equipment, material, total: round(labor + equipment + material) };
}

export interface Variance { std: number; act: number; diff: number }
/** 要素差值 = 两阶段(获取/生成)叠加；并保留分阶段明细供录入面板展示 */
export interface FactorVariance extends Variance { acquire: Variance; generate: Variance }

type AnyCost = ItemizedCost | CostByPhase | PhaseFactors;
const FK = ["labor", "equipment", "material"] as const;
const sumItems = (items?: IOCost[]): PhaseFactors => {
  const r: PhaseFactors = {};
  (items || []).forEach((it) => FK.forEach((k) => { if (typeof it[k] === "number") r[k] = round((r[k] || 0) + (it[k] || 0)); }));
  return r;
};

/** 取 itemized 成本明细（每个输入/输出物的人/工作方式/料）；非 itemized 结构返回空数组 */
export function asItemized(x?: AnyCost): { inputs: IOCost[]; outputs: IOCost[] } {
  if (x && ("inputs" in x || "outputs" in x)) {
    const it = x as ItemizedCost;
    return { inputs: it.inputs || [], outputs: it.outputs || [] };
  }
  return { inputs: [], outputs: [] };
}

// 归一为两阶段结构：itemized → 输入物累加=acquire、输出物累加=generate；旧聚合原样取；旧扁平视为 generate
export function asPhases(x?: AnyCost): { acquire: PhaseFactors; generate: PhaseFactors } {
  if (!x) return { acquire: {}, generate: {} };
  if ("inputs" in x || "outputs" in x) {
    const it = x as ItemizedCost;
    return { acquire: sumItems(it.inputs), generate: sumItems(it.outputs) };
  }
  if ("acquire" in x || "generate" in x) {
    const p = x as CostByPhase;
    return { acquire: p.acquire || {}, generate: p.generate || {} };
  }
  return { acquire: {}, generate: x as PhaseFactors };
}

/** 标准值 vs 实际值 差值分析（diff = 实际 - 标准；正=超支，负=结余）。两阶段叠加。供诊断引擎量化使用。 */
export function costVariance(nc: NodeCost): { labor: FactorVariance; equipment: FactorVariance; material: FactorVariance; total: Variance } {
  const b = costBreakdown(nc);
  const std = asPhases(nc.standard);
  const act = asPhases(nc.actual);
  const hasActOverride = nc.actual != null;
  const mk = (k: keyof PhaseFactors): FactorVariance => {
    const sAcq = std.acquire[k] || 0, sGen = std.generate[k] || 0;
    // 实际：有 override 用两阶段值；否则回退明细自动结算值（计入 generate 阶段）
    const aAcq = hasActOverride ? (act.acquire[k] || 0) : 0;
    const aGen = hasActOverride ? (act.generate[k] || 0) : b[k];
    const acquire: Variance = { std: round(sAcq), act: round(aAcq), diff: round(aAcq - sAcq) };
    const generate: Variance = { std: round(sGen), act: round(aGen), diff: round(aGen - sGen) };
    return { std: round(sAcq + sGen), act: round(aAcq + aGen), diff: round(aAcq + aGen - sAcq - sGen), acquire, generate };
  };
  const labor = mk("labor"), equipment = mk("equipment"), material = mk("material");
  return {
    labor, equipment, material,
    total: { std: round(labor.std + equipment.std + material.std), act: round(labor.act + equipment.act + material.act), diff: round(labor.diff + equipment.diff + material.diff) },
  };
}

// 待完成问题清单：客户无法完成录入时自动生成
export function pendingQuestions(nc: NodeCost): string[] {
  const q: string[] = [];
  const ap = asPhases(nc.actual);
  const actualAny = (["labor", "equipment", "material"] as const).some((k) => (ap.acquire[k] || 0) || (ap.generate[k] || 0));
  const hasAny = nc.labor || nc.equipment || nc.material || actualAny;
  if (!hasAny) return ["尚未录入任何成本要素（人 / 工作方式 / 料）"];

  if (nc.labor) {
    const l = nc.labor;
    if (!l.people.length) q.push("人工：请至少添加 1 名人员");
    if (!l.monthlyWorkHours) q.push("人工：请填写月标准工时（如 174）");
    if (!l.workHours) q.push("人工：请填写本节点投入工时");
    l.people.forEach((p) => { if (!p.monthlyIncome) q.push(`人工：人员「${p.name || "未命名"}」缺月收入`); });
  }
  if (nc.equipment) {
    nc.equipment.items.forEach((i) => {
      if (!i.monthlyDepreciation) q.push(`设备：「${i.name || "未命名"}」缺月折旧`);
      if (!i.monthlyAvailableHours) q.push(`设备：「${i.name || "未命名"}」缺月可用工时`);
      if (!i.usageHours) q.push(`设备：「${i.name || "未命名"}」缺本节点占用工时`);
    });
  }
  if (nc.material) {
    nc.material.items.forEach((i) => {
      if (!i.qty) q.push(`材料：「${i.name || "未命名"}」缺数量/重量`);
      if (!i.unitPrice) q.push(`材料：「${i.name || "未命名"}」缺单价`);
    });
  }
  // 标准参考值缺失（AI 可生成，用于差值分析/诊断）
  const sp = asPhases(nc.standard);
  const stdSum = (k: keyof PhaseFactors) => (sp.acquire[k] || 0) + (sp.generate[k] || 0);
  if (nc.labor && !stdSum("labor")) q.push("人：缺标准参考值（可点 AI 生成）");
  if (nc.equipment && !stdSum("equipment")) q.push("设备/信息系统：缺标准参考值（可点 AI 生成）");
  if (nc.material && !stdSum("material")) q.push("料：缺标准参考值（可点 AI 生成）");
  return q;
}

export const DEFAULT_MONTHLY_WORK_HOURS = 174;
