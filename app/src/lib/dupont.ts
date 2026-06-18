import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import type { ThreeValue } from "./otd-types";

// 杜邦归集树（设计方案 §10）。分层：公司顶层巴用完整 ROE 树。
// 树叶 = 成本科目，挂前后对比三值（baseline/current/target）。

export type DupontTier = "company" | "profit" | "cost";

export interface DupontNode {
  id: string;
  label: string;
  formula?: string;        // 计算口径说明
  unit?: string;
  values: ThreeValue;      // 三值（万元 / % / 次）
  costAccount?: string;    // 叶子关联的成本科目
  actual?: boolean;        // 当前值是否来自现场 rollup 实测（P5 现场→财务闭环）
  children?: DupontNode[];
}

/** 现场 rollup 实际成本（万元），用于覆盖杜邦叶子的「当前」值 */
export interface Actuals { labor?: number; equipment?: number; material?: number }

/** 财务输入（单位：万元），每项带三值 */
export interface FinancialInput {
  enterpriseId: string;
  tier: DupontTier;
  revenue: ThreeValue;
  laborCost: ThreeValue;
  materialCost: ThreeValue;
  overheadCost: ThreeValue;
  otherCost: ThreeValue;
  totalAssets: ThreeValue;
  equity: ThreeValue;
  updatedAt: string;
}

const FILE = path.join(DATA_DIR, "dupont-financials.json");

function demoFinancials(enterpriseId: string): FinancialInput {
  return {
    enterpriseId,
    tier: "company",
    revenue: { baseline: 28000, current: 28000, target: 30000 },
    laborCost: { baseline: 5200, current: 4900, target: 4400 },
    materialCost: { baseline: 14500, current: 14000, target: 13200 },
    overheadCost: { baseline: 4200, current: 3950, target: 3500 },
    otherCost: { baseline: 1800, current: 1750, target: 1600 },
    totalAssets: { baseline: 21000, current: 20500, target: 19500 },
    equity: { baseline: 12000, current: 12000, target: 12000 },
    updatedAt: new Date().toISOString(),
  };
}

export async function getFinancials(enterpriseId: string): Promise<FinancialInput> {
  const all = await readJSON<FinancialInput[]>(FILE, []);
  return all.find((f) => f.enterpriseId === enterpriseId) || demoFinancials(enterpriseId);
}

export async function saveFinancials(input: FinancialInput): Promise<FinancialInput> {
  const all = await readJSON<FinancialInput[]>(FILE, []);
  const i = all.findIndex((f) => f.enterpriseId === input.enterpriseId);
  const next = { ...input, updatedAt: new Date().toISOString() };
  if (i < 0) all.push(next);
  else all[i] = next;
  await atomicWriteJSON(FILE, all);
  return next;
}

// 三值上的逐项运算助手
type V = ThreeValue;
const keys: (keyof V)[] = ["baseline", "current", "target"];
function op(a: V, b: V, f: (x: number, y: number) => number): V {
  const r: V = {};
  for (const k of keys) {
    const x = a[k], y = b[k];
    if (x != null && y != null) r[k] = f(x, y);
  }
  return r;
}
function mapV(a: V, f: (x: number) => number): V {
  const r: V = {};
  for (const k of keys) { const x = a[k]; if (x != null) r[k] = f(x); }
  return r;
}
const sum = (...vs: V[]) => vs.reduce((acc, v) => op(acc, v, (x, y) => x + y));
const sub = (a: V, b: V) => op(a, b, (x, y) => x - y);
const div = (a: V, b: V) => op(a, b, (x, y) => (y === 0 ? 0 : x / y));
const pct = (a: V, b: V) => op(a, b, (x, y) => (y === 0 ? 0 : Math.round((x / y) * 1000) / 10));

/** 由财务输入构建公司层 ROE 杜邦树（含三值） */
export function buildCompanyTree(fin: FinancialInput, actuals?: Actuals): DupontNode {
  // 现场→财务闭环：rollup 实际成本(>0)覆盖人工/材料/制造费用叶子的「当前」值
  const laborC = actuals?.labor ? { ...fin.laborCost, current: actuals.labor } : fin.laborCost;
  const materialC = actuals?.material ? { ...fin.materialCost, current: actuals.material } : fin.materialCost;
  const overheadC = actuals?.equipment ? { ...fin.overheadCost, current: actuals.equipment } : fin.overheadCost;

  const totalCost = sum(laborC, materialC, overheadC, fin.otherCost);
  const netProfit = sub(fin.revenue, totalCost);
  const netMargin = pct(netProfit, fin.revenue);                 // %
  const assetTurn = mapV(div(fin.revenue, fin.totalAssets), (x) => Math.round(x * 100) / 100); // 次
  const equityMult = mapV(div(fin.totalAssets, fin.equity), (x) => Math.round(x * 100) / 100); // 倍
  // ROE = 净利率% × 周转 × 杠杆
  const roe: V = {};
  for (const k of keys) {
    const m = netMargin[k], t = assetTurn[k], e = equityMult[k];
    if (m != null && t != null && e != null) roe[k] = Math.round((m / 100) * t * e * 1000) / 10;
  }

  return {
    id: "roe", label: "ROE 净资产收益率", unit: "%", formula: "净利率 × 总资产周转率 × 权益乘数",
    values: roe,
    children: [
      {
        id: "margin", label: "净利率", unit: "%", formula: "净利润 ÷ 营业收入", values: netMargin,
        children: [
          { id: "netprofit", label: "净利润", unit: "万元", values: netProfit, children: [
            { id: "revenue", label: "营业收入", unit: "万元", values: fin.revenue },
            { id: "totalcost", label: "总成本", unit: "万元", values: totalCost, children: [
              { id: "labor", label: "人工成本", unit: "万元", costAccount: "直接人工", values: laborC, actual: !!actuals?.labor },
              { id: "material", label: "材料成本", unit: "万元", costAccount: "直接材料", values: materialC, actual: !!actuals?.material },
              { id: "overhead", label: "制造费用", unit: "万元", costAccount: "制造费用", values: overheadC, actual: !!actuals?.equipment },
              { id: "other", label: "其他成本", unit: "万元", costAccount: "其他", values: fin.otherCost },
            ] },
          ] },
        ],
      },
      {
        id: "turn", label: "总资产周转率", unit: "次", formula: "营业收入 ÷ 总资产", values: assetTurn,
        children: [
          { id: "rev2", label: "营业收入", unit: "万元", values: fin.revenue },
          { id: "assets", label: "总资产", unit: "万元", values: fin.totalAssets },
        ],
      },
      {
        id: "mult", label: "权益乘数", unit: "倍", formula: "总资产 ÷ 所有者权益（仅公司层有意义）", values: equityMult,
        children: [
          { id: "assets2", label: "总资产", unit: "万元", values: fin.totalAssets },
          { id: "equity", label: "所有者权益", unit: "万元", values: fin.equity },
        ],
      },
    ],
  };
}
