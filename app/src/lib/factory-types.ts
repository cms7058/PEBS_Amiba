// 现场要素（5M1E）统一中间数据模型。
// 四个子工具（Worktime / APS / BOM / Lean）把各自的原生输出适配成这套模型后
// 上传到阿米巴，阿米巴只依赖本契约，不关心各工具内部结构。
// 详见《阿米巴5M1E扩展设计方案.md》§3.3 / §9。

export type Factor =
  | "man" | "machine" | "material" | "method" | "environment" | "measurement";

export const FACTOR_KEYS: Factor[] = [
  "man", "machine", "material", "method", "environment", "measurement",
];

export const FACTOR_LABELS: Record<Factor, string> = {
  man: "人",
  machine: "机",
  material: "料",
  method: "法",
  environment: "环",
  measurement: "测",
};

/** 数据来源工具标识 */
export type ConnectorSource = "worktime" | "aps" | "bom" | "lean" | "nesting" | "manual";

/** 三性判断 */
export type ThreeProps = "rationality" | "completeness" | "correctness";

export const THREE_PROPS_LABELS: Record<ThreeProps, string> = {
  rationality: "合理性",
  completeness: "完整性",
  correctness: "正确性",
};

/** 现场实测指标 */
export interface FactorMetric {
  factor: Factor;
  key: string;              // 如 "labor_load_rate" / "oee" / "nesting_yield"
  label: string;
  value: number;
  unit: string;
  benchmark?: number;       // 行业基准
  source: ConnectorSource;
  amibaId?: string;         // 归属阿米巴
  capturedAt: string;       // ISO
}

/** 浪费项（成本归因主线的载体） */
export interface WasteItem {
  factor: Factor;
  threeProps?: ThreeProps;
  description: string;
  annualCost: number;          // 年化成本（元）
  costAccount: string;         // 成本科目
  attributionRule?: string;    // 归因规则
  responsibleAmibaId?: string;
  improvementRef?: string;     // 关联 Lean 改善方案 / 8D 报告
  source: ConnectorSource;
}

/** ingest 信封：一批上报数据 */
export interface IngestEnvelope {
  source: ConnectorSource;
  enterpriseId: string;
  batchId: string;             // 幂等键：同 batchId 重复上传只更新不重复
  schemaVersion?: string;      // 默认 "v2"
  metrics?: FactorMetric[];
  wasteItems?: WasteItem[];
}
