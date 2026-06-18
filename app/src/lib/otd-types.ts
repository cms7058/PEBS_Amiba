import type { ConnectorSource, Factor, WasteItem } from "./factory-types";
import type { Industry } from "./diagnosis-types";

// OTD（订单→交付）价值流诊断的数据模型。详见《阿米巴5M1E扩展设计方案.md》§11。
// OTD 是横向价值流，阿米巴是纵向核算单元；节点上挂工具 + KPI（含前后对比三值）。

export type ThreeProps = "rationality" | "completeness" | "correctness";

export const THREE_PROPS_LABELS: Record<ThreeProps, string> = {
  rationality: "合理性",
  completeness: "完整性",
  correctness: "正确性",
};

/** 实施前后对比三值 */
export interface ThreeValue {
  baseline?: number;   // 实施前（基线冻结）
  current?: number;    // 当前
  target?: number;     // 目标
}

export interface NodeKPI {
  key: string;
  label: string;
  unit: string;
  betterWhen: "higher" | "lower";   // 指标向好方向（决定达成率算法）
  values: ThreeValue;
  // V2.2：5M1E 降为标签 + 采集来源（合并自原 FactorMetric）
  factor?: Factor;
  source?: ConnectorSource;         // 该指标 current 值的来源（worktime/aps/.../manual）
  capturedAt?: string;              // 最近一次回填时间
}

/** 工具标识（与 tools-registry 的 id 一致） */
export type ToolId = "worktime" | "aps" | "bom" | "lean" | "nesting";

export interface ToolBinding {
  tool: ToolId;
  enabled: boolean;    // 用户是否在该节点启用此工具
}

export interface OtdNode {
  id: string;
  key: string;             // 稳定标识（ingest 回填按 key 定位，不随重排变化）
  seq: number;
  name: string;
  action: string;          // 核心动作
  inputs: string[];        // 输入交付物
  outputs: string[];       // 输出交付物
  role: string;            // 责任岗位
  factor?: Factor;         // 主要 5M1E 要素
  riskProp?: ThreeProps;   // 三性高风险点
  riskNote?: string;       // 风险说明
  kpis: NodeKPI[];
  tools: ToolBinding[];    // 可植入工具
  // V2.2：跨引擎贯穿件字段
  dataLevel?: "L1" | "L2" | "L3";   // 规划引擎填：数据采集档次
  amibaId?: string;                 // 设计引擎填：节点归属阿米巴
  wasteItems?: WasteItem[];         // 挂在节点上的浪费项（合并自企业散点）
}

export interface OtdTemplate {
  id: string;
  name: string;
  industry: Industry;
  mode: "MTO" | "ETO";
  enterpriseId?: string;   // 绑定企业的实例；空 = 行业库模板
  nodes: OtdNode[];
  createdAt: string;
  updatedAt: string;
}

/** 达成率：current 相对 baseline→target 的进度（0-100；无目标时返回 null） */
export function kpiProgress(kpi: NodeKPI): number | null {
  const { baseline, current, target } = kpi.values;
  if (baseline == null || current == null || target == null) return null;
  if (target === baseline) return current === target ? 100 : 0;
  const p = ((current - baseline) / (target - baseline)) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}

/** current 相对 baseline 的改善幅度（带方向，正=向好） */
export function kpiImprovement(kpi: NodeKPI): number | null {
  const { baseline, current } = kpi.values;
  if (baseline == null || current == null) return null;
  const delta = current - baseline;
  return kpi.betterWhen === "higher" ? delta : -delta;
}
