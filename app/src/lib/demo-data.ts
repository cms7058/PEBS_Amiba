import type { DimensionKey, Industry } from "./diagnosis-types";

export interface DemoEnterprise {
  slug: string;
  name: string;
  industry: Industry;
  industryLabel: string;
  scale: string;
  founded: string;
  stage: "diagnosis_done" | "designing" | "deploying" | "pending";
  stageLabel: string;
  score: number;
  level: "L1" | "L2" | "L3";
  cycle: string;
  // Six dimensions vs industry average
  dimensions: Record<DimensionKey, number>;
  industryAvg: Record<DimensionKey, number>;
  // 12-month trend
  monthlyTrend: Array<{
    month: string;
    revenue: number;       // 万元
    grossMargin: number;   // %
    oee: number;           // %
    laborProductivity: number; // 千元/工时
  }>;
  // Amiba units performance
  amibas: Array<{
    name: string;
    leader: string;
    revenue: number;     // 万元
    cost: number;
    profit: number;
    profitMargin: number;
    sparkline: number[]; // last 8 months
    status: "outperform" | "normal" | "warning";
    detail?: AmibaDetail;
  }>;
  // Events feed
  events: Array<{
    at: string;
    kind: "milestone" | "alert" | "achievement" | "metric";
    title: string;
    desc?: string;
  }>;
  // Key facts
  facts: { label: string; value: string }[];
  // Strengths / risks / decisions (echo of summary)
  advantages: string[];
  risks: string[];
  decisions: string[];
  // Industry rank
  industryRank: { percentile: number; sampleSize: number };
}

const DIM_LABELS: Record<DimensionKey, string> = {
  organization: "组织",
  finance: "财务",
  it: "信息化",
  equipment: "设备",
  process: "流程",
  culture: "文化",
};

export { DIM_LABELS };

// =====================================================================
// Amiba detail (used when clicking an amiba row on the enterprise page)
// =====================================================================

export interface AmibaDetail {
  /** Cost structure in 万元, sums to total cost */
  breakdown: {
    labor: number;       // 人工工资
    materials: number;   // 直接物料
    auxiliary: number;   // 辅料 / 耗材
    energy: number;      // 能耗
    equipment: number;   // 设备折旧 / 内部租赁
    travel: number;      // 差旅费
    finance: number;     // 财务费用 / 内部资金占用
    other: number;       // 其他（管理分摊等）
  };
  employees: Array<{
    name: string;
    role: string;
    hours: number;       // 当月工时
    cost: number;        // 当月人工成本（万元）
  }>;
  equipment: Array<{
    name: string;
    type: string;
    usageHours: number;  // 当月使用工时
    cost: number;        // 当月折旧/租金（万元）
    oee?: number;        // 0-100
  }>;
  energy: Array<{
    type: string;        // 电力 / 天然气 / 蒸汽 / 压缩空气
    quantity: string;    // "12.4 万度"
    cost: number;        // 万元
    note?: string;       // 计量方式
  }>;
  auxiliary: Array<{
    name: string;
    plannedQty: string;  // 定额消耗
    actualQty: string;
    cost: number;        // 万元
    variance: number;    // % 超额 (+) 或节约 (-)
  }>;
  /** Products / outputs produced by this amiba this month */
  products?: Array<{
    name: string;
    spec?: string;              // 规格 / 客户
    qty: number;
    unit: string;               // 件 / 套 / 工时
    transferPrice: number;      // 内部转让单价（元/单位）
    revenue: number;            // 万元
    unitCost: number;           // 万元 / 单位
    valueAdded: number;         // % 附加值率
  }>;
  /** Waste cost categories (万元) — sums into part of cost */
  wasteCosts?: Array<{
    category: "scrap" | "rework" | "overconsume" | "idle" | "overtime" | "claim" | "disposal";
    label: string;
    amount: number;
    rootCause: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  improvements: Array<{
    title: string;
    impact: "high" | "medium" | "low";
    desc: string;
  }>;
}

// =====================================================================
// Enterprise-level governance: accounting rules, policy rules, IT arch
// (one template applied across amibas; per-amiba data feeds through)
// =====================================================================

export interface AccountingRule {
  id: string;
  name: string;
  category: "transfer_price" | "cost_alloc" | "depreciation" | "energy" | "auxiliary" | "labor" | "quality" | "waste";
  formula: string;            // shown as monospace
  inputs: string[];           // data sources required
  example: string;            // worked example for this enterprise
  reviewBy: string;           // who decides
  reviewCadence: string;      // 季度 / 月度 / 年度
}

export interface GovernanceRule {
  id: string;
  title: string;
  scope: string;
  threshold: string;
  action: string;
  ownedBy: string;
}

export type ArchLayer = "source" | "hub" | "output";

export type ArchChartKind = "line" | "bar" | "pie" | "donut" | "stat" | "kv";

export interface ArchNode {
  id: string;
  label: string;
  shortLabel?: string;       // for tight diagram cells
  layer: ArchLayer;
  description: string;
  dataFields: string[];      // key data items this node holds
  integration: string;       // how integrated (e.g. "REST API / 实时")
  status: "live" | "partial" | "planned";
  vendor?: string;           // 金蝶云星空 / 钉钉 / 自研 ...
  /** Embedded mini-chart shown only when this node is selected */
  chart?: {
    kind: ArchChartKind;
    title: string;
    subtitle?: string;
    unit?: string;
    series?: Array<{ x: string; y: number }>;       // for line / bar
    slices?: Array<{ name: string; value: number; color?: string }>;   // for pie / donut
    stats?: Array<{ label: string; value: string; tone?: "primary" | "success" | "warning" | "danger" | "muted" }>;
    kv?: Array<{ k: string; v: string }>;
  };
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;            // e.g. "工时" / "能耗" / "归集"
}

export interface DataArchitecture {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export const DEMO_ENTERPRISES: Record<string, DemoEnterprise> = {
  "ningbo-hengzhan": {
    slug: "ningbo-hengzhan",
    name: "宁波恒展精密冲压有限公司",
    industry: "auto_parts",
    industryLabel: "汽车零部件制造业",
    scale: "320 人 / 年营收 2.8 亿",
    founded: "2009 年",
    stage: "diagnosis_done",
    stageLabel: "诊断完成",
    score: 67,
    level: "L2",
    cycle: "12-15 个月",
    dimensions: { organization: 72, finance: 78, it: 55, equipment: 60, process: 65, culture: 58 },
    industryAvg: { organization: 69, finance: 73, it: 56, equipment: 64, process: 68, culture: 58 },
    monthlyTrend: [
      { month: "6月", revenue: 2180, grossMargin: 21.5, oee: 72, laborProductivity: 1.32 },
      { month: "7月", revenue: 2240, grossMargin: 22.1, oee: 74, laborProductivity: 1.36 },
      { month: "8月", revenue: 2090, grossMargin: 20.8, oee: 71, laborProductivity: 1.28 },
      { month: "9月", revenue: 2350, grossMargin: 23.2, oee: 76, laborProductivity: 1.41 },
      { month: "10月", revenue: 2420, grossMargin: 23.8, oee: 78, laborProductivity: 1.45 },
      { month: "11月", revenue: 2580, grossMargin: 24.4, oee: 80, laborProductivity: 1.48 },
      { month: "12月", revenue: 2730, grossMargin: 24.9, oee: 81, laborProductivity: 1.52 },
      { month: "1月", revenue: 2150, grossMargin: 22.3, oee: 73, laborProductivity: 1.35 },
      { month: "2月", revenue: 1980, grossMargin: 21.6, oee: 70, laborProductivity: 1.29 },
      { month: "3月", revenue: 2410, grossMargin: 23.7, oee: 77, laborProductivity: 1.43 },
      { month: "4月", revenue: 2620, grossMargin: 24.5, oee: 79, laborProductivity: 1.49 },
      { month: "5月", revenue: 2810, grossMargin: 25.3, oee: 82, laborProductivity: 1.56 },
    ],
    amibas: [
      { name: "冲压阿米巴", leader: "张师傅", revenue: 1240, cost: 950, profit: 290, profitMargin: 23.4,
        sparkline: [180, 195, 210, 225, 240, 255, 270, 290], status: "outperform" },
      { name: "焊接阿米巴", leader: "李工", revenue: 970, cost: 825, profit: 145, profitMargin: 14.9,
        sparkline: [130, 125, 135, 140, 138, 142, 145, 145], status: "normal" },
      { name: "涂装阿米巴", leader: "王主管", revenue: 580, cost: 545, profit: 35, profitMargin: 6.0,
        sparkline: [55, 48, 42, 38, 36, 34, 36, 35], status: "warning" },
      { name: "总装阿米巴", leader: "赵班长", revenue: 1530, cost: 1290, profit: 240, profitMargin: 15.7,
        sparkline: [210, 215, 220, 225, 230, 235, 238, 240], status: "normal" },
      { name: "品质阿米巴", leader: "孙经理", revenue: 220, cost: 195, profit: 25, profitMargin: 11.4,
        sparkline: [22, 24, 23, 25, 24, 25, 25, 25], status: "normal" },
    ],
    events: [
      { at: "刚刚", kind: "achievement", title: "冲压阿米巴单工时产值再创新高",
        desc: "1.56 千元/工时，环比 +4.7%" },
      { at: "12 分钟前", kind: "alert", title: "涂装阿米巴溶剂消耗超定额 14%",
        desc: "建议触发异常分析流程" },
      { at: "1 小时前", kind: "metric", title: "5 月综合毛利率 25.3%",
        desc: "同比 +1.8pp，达年度目标 92%" },
      { at: "今早 9:12", kind: "milestone", title: "Q2 内部转让定价谈判完成",
        desc: "下季度协商价较上季度上调 1.2%" },
      { at: "昨天", kind: "achievement", title: "品质阿米巴客诉赔偿降至零",
        desc: "连续 28 天无客诉" },
      { at: "2 天前", kind: "metric", title: "焊接阿米巴 OEE 提升 3 个百分点",
        desc: "73% → 76%，主要来自换线优化" },
    ],
    facts: [
      { label: "成立时间", value: "2009 年" },
      { label: "主营客户", value: "比亚迪 / 吉利 / 长城" },
      { label: "ERP 系统", value: "金蝶云星空 K/3" },
      { label: "已部署阿米巴", value: "5 个" },
      { label: "顾问介入深度", value: "诊断 + 设计深度参与" },
      { label: "下一里程碑", value: "MES 系统选型（7 月）" },
    ],
    advantages: [
      "财务核算基础较好，已有产品级成本归集",
      "老板变革意愿强，主动学习阿米巴方法论",
      "已有金蝶 ERP 并稳定使用 5 年",
      "组织扁平，决策链路清晰",
    ],
    risks: [
      "无 MES，工时数据采集是最大缺口",
      "中层管理者变革意愿不明确",
      "辅料管理混乱，账物不符严重",
      "设备能耗仅总表，无车间/产线计量",
    ],
    decisions: [
      "是否先上 MES 再推阿米巴？（建议：分阶段，先手工台账 + MES 并行）",
      "是否从 1-2 个试点阿米巴开始？（建议：冲压阿米巴为首发）",
      "外部顾问介入深度？（建议：诊断+设计阶段重投入）",
    ],
    industryRank: { percentile: 67, sampleSize: 12 },
  },

  "suzhou-zhiwei": {
    slug: "suzhou-zhiwei",
    name: "苏州智微非标设备有限公司",
    industry: "project_equipment",
    industryLabel: "项目制非标设备制造业",
    scale: "180 人 / 年营收 1.4 亿",
    founded: "2014 年",
    stage: "designing",
    stageLabel: "设计中",
    score: 58,
    level: "L2",
    cycle: "13-16 个月",
    dimensions: { organization: 60, finance: 65, it: 48, equipment: 55, process: 62, culture: 55 },
    industryAvg: { organization: 67, finance: 69, it: 57, equipment: 60, process: 66, culture: 61 },
    monthlyTrend: [
      { month: "6月", revenue: 980, grossMargin: 18.5, oee: 0, laborProductivity: 1.85 },
      { month: "7月", revenue: 1120, grossMargin: 19.8, oee: 0, laborProductivity: 1.92 },
      { month: "8月", revenue: 1340, grossMargin: 21.2, oee: 0, laborProductivity: 2.05 },
      { month: "9月", revenue: 890, grossMargin: 16.4, oee: 0, laborProductivity: 1.68 },
      { month: "10月", revenue: 1450, grossMargin: 22.1, oee: 0, laborProductivity: 2.15 },
      { month: "11月", revenue: 1680, grossMargin: 23.5, oee: 0, laborProductivity: 2.28 },
      { month: "12月", revenue: 1820, grossMargin: 24.2, oee: 0, laborProductivity: 2.35 },
      { month: "1月", revenue: 760, grossMargin: 14.5, oee: 0, laborProductivity: 1.42 },
      { month: "2月", revenue: 880, grossMargin: 16.0, oee: 0, laborProductivity: 1.55 },
      { month: "3月", revenue: 1280, grossMargin: 20.8, oee: 0, laborProductivity: 1.98 },
      { month: "4月", revenue: 1390, grossMargin: 21.5, oee: 0, laborProductivity: 2.08 },
      { month: "5月", revenue: 1110, grossMargin: 18.2, oee: 0, laborProductivity: 1.78 },
    ],
    amibas: [
      { name: "销售-新能源组", leader: "陈总监", revenue: 4200, cost: 350, profit: 3850, profitMargin: 91.7,
        sparkline: [3200, 3450, 3680, 3720, 3850, 3920, 3880, 3850], status: "outperform" },
      { name: "项目阿米巴-A", leader: "项目王", revenue: 2800, cost: 2480, profit: 320, profitMargin: 11.4,
        sparkline: [350, 380, 340, 320, 310, 300, 315, 320], status: "warning" },
      { name: "项目阿米巴-B", leader: "项目李", revenue: 1900, cost: 1620, profit: 280, profitMargin: 14.7,
        sparkline: [250, 260, 265, 270, 275, 278, 280, 280], status: "normal" },
      { name: "机械设计组", leader: "刘工", revenue: 880, cost: 720, profit: 160, profitMargin: 18.2,
        sparkline: [140, 145, 150, 155, 158, 160, 160, 160], status: "normal" },
      { name: "电气设计组", leader: "周工", revenue: 620, cost: 540, profit: 80, profitMargin: 12.9,
        sparkline: [70, 72, 75, 78, 80, 80, 80, 80], status: "normal" },
    ],
    events: [
      { at: "刚刚", kind: "alert", title: "项目阿米巴-A 工时超预算 18%",
        desc: "客户变更频繁，建议触发变更管理流程" },
      { at: "30 分钟前", kind: "milestone", title: "信息化改造进入设计评审阶段",
        desc: "MES + PLM 集成方案已完成 75%" },
      { at: "2 小时前", kind: "metric", title: "本月在签项目 11 个",
        desc: "新能源行业占比 73%，半导体 18%" },
      { at: "昨天 16:30", kind: "alert", title: "里程碑延误：信息化改造延期 5 周",
        desc: "已超红色预警阈值（4 周）" },
      { at: "2 天前", kind: "achievement", title: "销售-新能源组中标 ¥4200 万订单",
        desc: "宁德时代某基地自动化产线" },
    ],
    facts: [
      { label: "成立时间", value: "2014 年" },
      { label: "主营行业", value: "新能源 73% / 半导体 18% / 其他 9%" },
      { label: "ERP 系统", value: "用友 U8" },
      { label: "已部署阿米巴", value: "7 个" },
      { label: "顾问介入深度", value: "深度参与" },
      { label: "下一里程碑", value: "MES 上线（9 月）" },
    ],
    advantages: [
      "销售对行业理解深，新能源订单占比稳定上升",
      "设计团队稳定，核心骨干工龄均 5+ 年",
      "项目利润核算粒度已经到工时级",
    ],
    risks: [
      "信息化改造延误已达 5 周，触发红色预警",
      "项目阿米巴-A 工时超预算 18%，客户变更管理薄弱",
      "知识沉淀困难，经验存在人脑而非系统",
      "中层管理者对阿米巴核算理解参差不齐",
    ],
    decisions: [
      "信息化改造方案是否分阶段降级？（建议：MES 优先于 PLM）",
      "客户变更签证流程是否要硬性卡口？",
      "项目阿米巴-A 是否需要更换项目经理？",
    ],
    industryRank: { percentile: 41, sampleSize: 8 },
  },

  "hangzhou-jinding": {
    slug: "hangzhou-jinding",
    name: "杭州金鼎模具制造有限公司",
    industry: "auto_parts",
    industryLabel: "汽车零部件制造业",
    scale: "450 人 / 年营收 3.6 亿",
    founded: "2003 年",
    stage: "deploying",
    stageLabel: "部署中",
    score: 73,
    level: "L2",
    cycle: "10-12 个月",
    dimensions: { organization: 76, finance: 80, it: 70, equipment: 72, process: 75, culture: 65 },
    industryAvg: { organization: 69, finance: 73, it: 56, equipment: 64, process: 68, culture: 58 },
    monthlyTrend: [
      { month: "6月", revenue: 2950, grossMargin: 26.5, oee: 78, laborProductivity: 1.65 },
      { month: "7月", revenue: 3080, grossMargin: 27.2, oee: 80, laborProductivity: 1.71 },
      { month: "8月", revenue: 2880, grossMargin: 25.8, oee: 77, laborProductivity: 1.62 },
      { month: "9月", revenue: 3120, grossMargin: 27.6, oee: 81, laborProductivity: 1.74 },
      { month: "10月", revenue: 3250, grossMargin: 28.1, oee: 82, laborProductivity: 1.78 },
      { month: "11月", revenue: 3380, grossMargin: 28.5, oee: 83, laborProductivity: 1.81 },
      { month: "12月", revenue: 3520, grossMargin: 29.1, oee: 84, laborProductivity: 1.86 },
      { month: "1月", revenue: 2820, grossMargin: 26.2, oee: 78, laborProductivity: 1.66 },
      { month: "2月", revenue: 2680, grossMargin: 25.4, oee: 76, laborProductivity: 1.59 },
      { month: "3月", revenue: 3180, grossMargin: 27.8, oee: 81, laborProductivity: 1.75 },
      { month: "4月", revenue: 3360, grossMargin: 28.4, oee: 82, laborProductivity: 1.80 },
      { month: "5月", revenue: 3450, grossMargin: 28.8, oee: 83, laborProductivity: 1.83 },
    ],
    amibas: [
      { name: "模具设计阿米巴", leader: "高工", revenue: 1850, cost: 1420, profit: 430, profitMargin: 23.2,
        sparkline: [380, 390, 400, 410, 420, 425, 430, 430], status: "outperform" },
      { name: "精加工阿米巴", leader: "孙师傅", revenue: 1620, cost: 1280, profit: 340, profitMargin: 21.0,
        sparkline: [310, 315, 320, 325, 330, 335, 340, 340], status: "normal" },
      { name: "热处理阿米巴", leader: "吴主任", revenue: 680, cost: 590, profit: 90, profitMargin: 13.2,
        sparkline: [85, 88, 90, 92, 88, 85, 88, 90], status: "warning" },
      { name: "装配调试阿米巴", leader: "钱班长", revenue: 1230, cost: 1020, profit: 210, profitMargin: 17.1,
        sparkline: [180, 185, 190, 195, 200, 205, 208, 210], status: "normal" },
    ],
    events: [
      { at: "刚刚", kind: "alert", title: "数据质量预警：辅料消耗台账上月缺录 12%",
        desc: "影响成本归集精度，需技改" },
      { at: "1 小时前", kind: "achievement", title: "模具设计阿米巴单项目准时率 96%",
        desc: "行业 Top 10%" },
      { at: "今早", kind: "metric", title: "整体毛利率连续 6 月超 28%",
        desc: "高于行业均值 4.2pp" },
      { at: "昨天", kind: "milestone", title: "热处理阿米巴改善小组成立",
        desc: "由顾问 + 内部骨干联合驱动" },
    ],
    facts: [
      { label: "成立时间", value: "2003 年" },
      { label: "主营产品", value: "汽车冲压模具" },
      { label: "ERP / MES", value: "SAP CO + 自研 MES" },
      { label: "已部署阿米巴", value: "4 个（全量上线）" },
      { label: "顾问介入深度", value: "已转纯陪跑" },
      { label: "下一里程碑", value: "Q3 全公司利润分享试运行" },
    ],
    advantages: [
      "信息化基础最强，SAP + 自研 MES 完整闭环",
      "管理团队整体稳定，骨干工龄长",
      "毛利率持续高于行业均值",
    ],
    risks: [
      "热处理阿米巴利润率持续低于内部基准",
      "辅料台账缺录率上升趋势",
      "文化变革整体推进偏慢",
    ],
    decisions: [
      "是否给热处理阿米巴更换技术负责人？",
      "辅料管理是否改为扫码出库强制约束？",
      "Q3 利润分享方案是否在全员推开？",
    ],
    industryRank: { percentile: 87, sampleSize: 12 },
  },

  "shanghai-changyuan": {
    slug: "shanghai-changyuan",
    name: "上海昌远自动化技术有限公司",
    industry: "project_equipment",
    industryLabel: "项目制非标设备制造业",
    scale: "95 人 / 年营收 8200 万",
    founded: "2017 年",
    stage: "pending",
    stageLabel: "待诊断",
    score: 0,
    level: "L1",
    cycle: "待评估",
    dimensions: { organization: 0, finance: 0, it: 0, equipment: 0, process: 0, culture: 0 },
    industryAvg: { organization: 67, finance: 69, it: 57, equipment: 60, process: 66, culture: 61 },
    monthlyTrend: [],
    amibas: [],
    events: [
      { at: "刚刚", kind: "milestone", title: "等待发起首次诊断对话",
        desc: "前往诊断引擎选择该企业并开始" },
    ],
    facts: [
      { label: "成立时间", value: "2017 年" },
      { label: "主营行业", value: "半导体 / 电子" },
      { label: "ERP 系统", value: "用友 U8（基础模块）" },
      { label: "诊断状态", value: "未开始" },
    ],
    advantages: [],
    risks: [],
    decisions: [],
    industryRank: { percentile: 0, sampleSize: 8 },
  },
};

// =====================================================================
// Amiba details — keyed by `${enterpriseSlug}::${amibaName}`
// =====================================================================

export const AMIBA_DETAILS: Record<string, AmibaDetail> = {
  // ============ 宁波恒展 — full showcase data ============
  "ningbo-hengzhan::冲压阿米巴": {
    breakdown: { labor: 235, materials: 410, auxiliary: 58, energy: 92, equipment: 88, travel: 12, finance: 18, other: 37 },
    employees: [
      { name: "张师傅",  role: "阿米巴长 / 班长",  hours: 192, cost: 2.8 },
      { name: "周明远",  role: "调机师傅",        hours: 184, cost: 2.1 },
      { name: "刘建国",  role: "调机师傅",        hours: 180, cost: 2.0 },
      { name: "陈大伟",  role: "冲压操作",        hours: 198, cost: 1.4 },
      { name: "孙小峰",  role: "冲压操作",        hours: 192, cost: 1.4 },
      { name: "李广志",  role: "冲压操作",        hours: 186, cost: 1.3 },
      { name: "王志强",  role: "下料工",          hours: 178, cost: 1.1 },
      { name: "赵海军",  role: "下料工",          hours: 176, cost: 1.1 },
      { name: "黄文斌",  role: "质检员",          hours: 168, cost: 1.2 },
      { name: "马天宇",  role: "学徒",            hours: 156, cost: 0.7 },
    ],
    equipment: [
      { name: "200T 闭式高速冲床 #1", type: "冲床",   usageHours: 612, cost: 18.5, oee: 86 },
      { name: "315T 闭式高速冲床 #2", type: "冲床",   usageHours: 588, cost: 22.0, oee: 84 },
      { name: "63T 普通冲床",         type: "冲床",   usageHours: 480, cost: 8.2,  oee: 73 },
      { name: "数控剪板机",           type: "剪切",   usageHours: 320, cost: 5.6,  oee: 65 },
      { name: "智能立体料库",         type: "仓储",   usageHours: 720, cost: 12.4, oee: 92 },
      { name: "AGV 物流车（2 台）",   type: "物流",   usageHours: 580, cost: 6.8,  oee: 78 },
    ],
    energy: [
      { type: "电力",           quantity: "14.6 万度", cost: 11.8, note: "智能电表 · 子表精确计量" },
      { type: "压缩空气",       quantity: "82,000 m³", cost: 4.2,  note: "按工时分摊" },
      { type: "液压油消耗",     quantity: "320 升",    cost: 1.8,  note: "实物领用" },
    ],
    auxiliary: [
      { name: "冲压油",       plannedQty: "180 kg", actualQty: "176 kg", cost: 0.9, variance: -2.2 },
      { name: "防锈油",       plannedQty: "240 kg", actualQty: "258 kg", cost: 1.2, variance: 7.5 },
      { name: "毛刺刷头",     plannedQty: "60 套",  actualQty: "54 套",  cost: 0.4, variance: -10.0 },
      { name: "包装泡棉",     plannedQty: "12 件",  actualQty: "12 件",  cost: 0.2, variance: 0 },
      { name: "周转箱清洁剂", plannedQty: "30 桶",  actualQty: "34 桶",  cost: 0.3, variance: 13.3 },
    ],
    products: [
      { name: "A 客户后桥支架",   spec: "比亚迪海豚",   qty: 18600, unit: "件", transferPrice: 38.5, revenue: 716, unitCost: 28.4, valueAdded: 26.2 },
      { name: "A 客户加强板",     spec: "比亚迪海豚",   qty: 22400, unit: "件", transferPrice: 12.8, revenue: 287, unitCost: 9.6,  valueAdded: 25.0 },
      { name: "B 客户安装支架",   spec: "吉利星越",     qty: 9800,  unit: "件", transferPrice: 18.6, revenue: 182, unitCost: 14.8, valueAdded: 20.4 },
      { name: "C 客户冲压件",     spec: "长城炮 系列",  qty: 6200,  unit: "件", transferPrice: 24.0, revenue: 149, unitCost: 19.2, valueAdded: 20.0 },
      { name: "通用小冲件",       spec: "多客户",       qty: 38000, unit: "件", transferPrice: 2.8,  revenue: 106, unitCost: 2.3,  valueAdded: 17.9 },
    ],
    wasteCosts: [
      { category: "scrap",       label: "废品成本",          amount: 3.2, rootCause: "下料尺寸偏差导致首件报废，预计 SPC 上线可降 60%" },
      { category: "rework",      label: "返工工时成本",      amount: 4.8, rootCause: "冲压件毛刺超标返工，主要集中在 63T 冲床" },
      { category: "overconsume", label: "辅料超耗（防锈油）", amount: 0.85, rootCause: "喷涂枪压力偏高，超耗 7.5%" },
      { category: "idle",        label: "设备空转电耗",       amount: 0.6, rootCause: "换模等待时设备未停机，待 OPL 培训" },
      { category: "claim",       label: "客诉赔偿分摊",       amount: 0.0, rootCause: "本月无客诉，承担为 0" },
    ],
    strengths: [
      "换线时间从 28 分钟压缩到 14 分钟，OEE 提升至 86%",
      "调机师傅梯队稳定，3 名骨干工龄均 8 年以上",
      "辅料定额管理初见成效，本月超耗整体可控（< 5%）",
      "AGV 上线后物流环节人员减半，产出反而提升 12%",
    ],
    weaknesses: [
      "防锈油超耗 7.5%，疑似喷涂枪压力设置偏高",
      "63T 普通冲床 OEE 仅 73%，是产线短板",
      "学徒占比 10%，培训成本未单独核算到本阿米巴",
    ],
    improvements: [
      { title: "推进 63T 冲床改造或淘汰决策", impact: "high",   desc: "评估翻新或换购 100T 高速冲床，预计 OEE 可达 85%+" },
      { title: "防锈油喷涂参数标准化",        impact: "medium", desc: "由工程组联合班组完成参数 SOP，目标 6 月底实施" },
      { title: "学徒培养成本独立核算",        impact: "low",    desc: "增设培训阿米巴或将培训成本计入支持阿米巴" },
    ],
  },

  "ningbo-hengzhan::焊接阿米巴": {
    breakdown: { labor: 285, materials: 290, auxiliary: 45, energy: 105, equipment: 56, travel: 8, finance: 14, other: 22 },
    employees: [
      { name: "李工",   role: "阿米巴长 / 焊接技师", hours: 192, cost: 3.2 },
      { name: "钱明海", role: "焊接技师",            hours: 186, cost: 2.6 },
      { name: "孙立群", role: "焊接技师",            hours: 188, cost: 2.5 },
      { name: "胡建文", role: "焊接工",              hours: 192, cost: 1.5 },
      { name: "陈海涛", role: "焊接工",              hours: 184, cost: 1.4 },
      { name: "杨志强", role: "焊接工",              hours: 178, cost: 1.4 },
      { name: "周小军", role: "组对工",              hours: 180, cost: 1.2 },
      { name: "吴大鹏", role: "质检员",              hours: 168, cost: 1.3 },
    ],
    equipment: [
      { name: "六轴焊接机器人 #1", type: "机器人",   usageHours: 480, cost: 16.5, oee: 72 },
      { name: "六轴焊接机器人 #2", type: "机器人",   usageHours: 432, cost: 16.5, oee: 68 },
      { name: "手工焊接工位（6）",   type: "工位",     usageHours: 1080, cost: 8.4, oee: 75 },
      { name: "工装夹具组",         type: "工装",     usageHours: 1280, cost: 6.8, oee: 80 },
    ],
    energy: [
      { type: "电力（焊机）",     quantity: "18.2 万度", cost: 14.6, note: "焊机工位分表" },
      { type: "二氧化碳保护气",   quantity: "1,820 m³",  cost: 3.6 },
      { type: "氩气保护气",       quantity: "640 m³",    cost: 2.8 },
    ],
    auxiliary: [
      { name: "焊丝（实芯 1.2mm）", plannedQty: "320 kg", actualQty: "356 kg", cost: 3.6, variance: 11.3 },
      { name: "焊丝（药芯）",       plannedQty: "180 kg", actualQty: "184 kg", cost: 2.4, variance: 2.2 },
      { name: "焊接喷嘴",           plannedQty: "60 个",  actualQty: "72 个",  cost: 0.8, variance: 20.0 },
      { name: "防溅剂",             plannedQty: "80 罐",  actualQty: "78 罐",  cost: 0.6, variance: -2.5 },
    ],
    products: [
      { name: "副车架焊接总成",   spec: "比亚迪海豚",   qty: 4200,  unit: "件", transferPrice: 105.0, revenue: 441, unitCost: 88.6, valueAdded: 15.6 },
      { name: "支撑梁焊接件",     spec: "比亚迪海豚",   qty: 6800,  unit: "件", transferPrice: 42.0,  revenue: 286, unitCost: 36.4, valueAdded: 13.3 },
      { name: "B 客户焊接组件",   spec: "吉利星越",     qty: 3600,  unit: "件", transferPrice: 58.5,  revenue: 211, unitCost: 49.0, valueAdded: 16.2 },
      { name: "通用焊接件",       spec: "多客户",       qty: 12000, unit: "件", transferPrice: 2.6,   revenue: 31,  unitCost: 2.2,  valueAdded: 15.4 },
    ],
    wasteCosts: [
      { category: "scrap",       label: "废品成本",       amount: 5.6, rootCause: "焊穿 / 烧穿，集中在机器人 #2" },
      { category: "rework",      label: "返工工时",       amount: 8.2, rootCause: "焊缝外观不合格，焊丝喷嘴问题导致" },
      { category: "overconsume", label: "焊丝超耗",       amount: 4.4, rootCause: "机器人 #2 送丝速度偏快 11.3%" },
      { category: "overconsume", label: "保护气浪费",     amount: 1.2, rootCause: "未做工位级计量，关枪不及时" },
      { category: "claim",       label: "客诉赔偿分摊",   amount: 1.8, rootCause: "上月一起焊缝开裂客诉，承担 70%" },
    ],
    strengths: [
      "机器人编程能力强，新产品上线周期 < 5 天",
      "焊接技师梯队稳定，焊缝合格率 99.4%",
    ],
    weaknesses: [
      "焊丝超耗 11.3%，焊接喷嘴超耗 20%，可能与机器人 #2 参数有关",
      "机器人 #2 OEE 68%，明显低于 #1",
      "保护气消耗未做工位级计量，无法精准追溯",
    ],
    improvements: [
      { title: "排查机器人 #2 偏差",   impact: "high",   desc: "建议厂家工程师 1 周内到场，复核焊接参数与喷嘴更换周期" },
      { title: "保护气接入流量计",     impact: "medium", desc: "每个机器人单独装流量计，预计投资 3.8 万元" },
      { title: "焊接耗材月度盘点",     impact: "low",    desc: "改为月初盘存 + 出库扫码，减少账物不符" },
    ],
  },

  "ningbo-hengzhan::涂装阿米巴": {
    breakdown: { labor: 145, materials: 215, auxiliary: 92, energy: 68, equipment: 45, travel: 4, finance: 9, other: 22 },
    employees: [
      { name: "王主管",  role: "阿米巴长",   hours: 192, cost: 2.6 },
      { name: "马明",    role: "调漆师",     hours: 188, cost: 1.8 },
      { name: "李志强",  role: "喷涂工",     hours: 184, cost: 1.4 },
      { name: "张涛",    role: "喷涂工",     hours: 180, cost: 1.4 },
      { name: "陈伟",    role: "前处理",     hours: 176, cost: 1.2 },
      { name: "孙小军",  role: "包装",       hours: 172, cost: 1.0 },
    ],
    equipment: [
      { name: "前处理线",      type: "处理",     usageHours: 420, cost: 8.2, oee: 62 },
      { name: "底漆喷涂房",    type: "涂装",     usageHours: 380, cost: 9.6, oee: 58 },
      { name: "面漆喷涂房",    type: "涂装",     usageHours: 360, cost: 9.6, oee: 55 },
      { name: "烘干隧道炉",    type: "热处理",   usageHours: 480, cost: 12.4, oee: 64 },
    ],
    energy: [
      { type: "电力",     quantity: "8.4 万度",  cost: 6.8, note: "总表估算" },
      { type: "天然气",   quantity: "12,800 m³", cost: 9.6, note: "烘干炉专用表" },
      { type: "蒸汽",     quantity: "82 吨",     cost: 4.8 },
    ],
    auxiliary: [
      { name: "底漆",       plannedQty: "820 kg", actualQty: "936 kg",  cost: 28.1, variance: 14.1 },
      { name: "面漆",       plannedQty: "640 kg", actualQty: "728 kg",  cost: 36.4, variance: 13.8 },
      { name: "溶剂",       plannedQty: "1200 L", actualQty: "1368 L",  cost: 13.7, variance: 14.0 },
      { name: "清洗剂",     plannedQty: "240 L",  actualQty: "276 L",   cost: 2.8,  variance: 15.0 },
      { name: "过滤棉",     plannedQty: "60 张",  actualQty: "82 张",   cost: 4.1,  variance: 36.7 },
      { name: "遮蔽胶带",   plannedQty: "120 卷", actualQty: "138 卷",  cost: 2.4,  variance: 15.0 },
    ],
    products: [
      { name: "黑色面漆件",     spec: "多产品 / 含底漆", qty: 14800, unit: "件", transferPrice: 22.0, revenue: 326, unitCost: 18.5, valueAdded: 15.9 },
      { name: "银色面漆件",     spec: "多产品 / 含底漆", qty: 6200,  unit: "件", transferPrice: 24.5, revenue: 152, unitCost: 21.4, valueAdded: 12.7 },
      { name: "客户指定特殊色",  spec: "比亚迪汉",        qty: 1800,  unit: "件", transferPrice: 58.0, revenue: 104, unitCost: 52.8, valueAdded: 9.0 },
    ],
    wasteCosts: [
      { category: "scrap",       label: "废品成本",       amount: 6.8, rootCause: "色差 / 流挂返工无果直接报废" },
      { category: "rework",      label: "返工工时成本",   amount: 9.2, rootCause: "外观一次合格率 92%，剩余 8% 需返修" },
      { category: "overconsume", label: "底漆超耗",       amount: 3.8, rootCause: "喷涂参数标准化不足，超耗 14.1%" },
      { category: "overconsume", label: "面漆超耗",       amount: 5.2, rootCause: "超耗 13.8%，与材料黏度温度波动有关" },
      { category: "overconsume", label: "溶剂 / 清洗剂超耗", amount: 2.1, rootCause: "频繁颜色切换，未做合批" },
      { category: "idle",        label: "烘干隧道空载",   amount: 1.8, rootCause: "OEE 64%，空炉等料导致天然气浪费" },
      { category: "claim",       label: "客诉赔偿分摊",   amount: 0.6, rootCause: "1 起色差客诉，承担 50%" },
    ],
    strengths: [
      "调漆师经验丰富，多色切换效率较高",
      "面漆外观一次合格率达 92%",
    ],
    weaknesses: [
      "辅料整体超耗 14% 以上（红色预警阈值 10%）",
      "OEE 仅 55-64%，三个核心设备均偏低",
      "电力仅总表估算，无法精准成本归集",
      "过滤棉超耗 36.7%，与喷涂连续时长偏短有关",
    ],
    improvements: [
      { title: "辅料消耗根因专项分析",     impact: "high",   desc: "本周组建跨部门小组：工程 + 财务 + 班组，目标 2 周给出可执行清单" },
      { title: "电力计量改造（车间分表）", impact: "high",   desc: "预算 2.8 万元，2 个月内落地" },
      { title: "喷涂排产合批策略",         impact: "medium", desc: "尽量合并同色批次，减少清洗与过滤棉更换" },
      { title: "考虑更换面漆供应商",       impact: "low",    desc: "评估等效国产替代，预计材料成本可降 8%" },
    ],
  },

  "ningbo-hengzhan::总装阿米巴": {
    breakdown: { labor: 318, materials: 685, auxiliary: 48, energy: 62, equipment: 92, travel: 14, finance: 22, other: 49 },
    employees: [
      { name: "赵班长",  role: "阿米巴长",     hours: 192, cost: 2.9 },
      { name: "刘建华",  role: "工艺员",       hours: 188, cost: 2.2 },
      { name: "陈晓东",  role: "装配技师",     hours: 186, cost: 1.9 },
      { name: "孙建军",  role: "装配技师",     hours: 188, cost: 1.9 },
      { name: "李海涛",  role: "装配工",       hours: 192, cost: 1.4 },
      { name: "王志远",  role: "装配工",       hours: 188, cost: 1.4 },
      { name: "周飞",    role: "装配工",       hours: 184, cost: 1.3 },
      { name: "吴小军",  role: "装配工",       hours: 178, cost: 1.2 },
      { name: "胡明亮",  role: "包装",         hours: 176, cost: 1.1 },
      { name: "马大鹏",  role: "终检",         hours: 170, cost: 1.3 },
      { name: "黄文斌",  role: "终检",         hours: 168, cost: 1.3 },
    ],
    equipment: [
      { name: "总装流水线",          type: "线体", usageHours: 720, cost: 18.6, oee: 78 },
      { name: "拧紧扳手（智能）×8",   type: "工具", usageHours: 1380, cost: 5.4, oee: 82 },
      { name: "在线检测台 ×2",       type: "检测", usageHours: 720, cost: 8.2, oee: 76 },
      { name: "终检测试台",          type: "检测", usageHours: 480, cost: 4.6, oee: 70 },
    ],
    energy: [
      { type: "电力",         quantity: "7.6 万度", cost: 6.2, note: "线体分表" },
      { type: "压缩空气",     quantity: "48,000 m³", cost: 2.4, note: "按工时分摊" },
    ],
    auxiliary: [
      { name: "螺纹胶",     plannedQty: "120 kg", actualQty: "118 kg", cost: 6.8, variance: -1.7 },
      { name: "扎带",       plannedQty: "8400 根", actualQty: "8520 根", cost: 1.2, variance: 1.4 },
      { name: "包装泡棉",   plannedQty: "240 件", actualQty: "248 件",  cost: 3.2, variance: 3.3 },
      { name: "标签贴纸",   plannedQty: "12000 张", actualQty: "12180 张", cost: 0.8, variance: 1.5 },
    ],
    products: [
      { name: "A 客户总成件",   spec: "比亚迪海豚",   qty: 8400,  unit: "件", transferPrice: 168, revenue: 1411, unitCost: 142, valueAdded: 15.5 },
      { name: "B 客户总成件",   spec: "吉利星越",     qty: 3200,  unit: "件", transferPrice: 246, revenue: 787,  unitCost: 218, valueAdded: 11.4 },
      { name: "C 客户总成件",   spec: "长城炮 系列",  qty: 2800,  unit: "件", transferPrice: 312, revenue: 874,  unitCost: 282, valueAdded: 9.6 },
    ],
    wasteCosts: [
      { category: "scrap",      label: "废品成本",         amount: 1.4, rootCause: "终检不良率 0.28%，已属行业最优分位" },
      { category: "rework",     label: "返工工时",         amount: 2.8, rootCause: "终检台 OEE 70%，部分件需二次测试" },
      { category: "overtime",   label: "加班工时成本",     amount: 3.6, rootCause: "客户拉量波动导致月末加班" },
      { category: "overconsume", label: "辅料超耗",        amount: 0.6, rootCause: "辅料管理良好，超耗 < 4%" },
      { category: "claim",      label: "客诉赔偿分摊",     amount: 0.0, rootCause: "无客诉" },
    ],
    strengths: [
      "智能拧紧扳手覆盖率 100%，关键力矩可追溯",
      "终检不良率连续 4 月低于 0.3%",
      "辅料定额管理执行较好，整体超耗 < 4%",
    ],
    weaknesses: [
      "终检测试台 OEE 70%，瓶颈识别需进一步",
      "新人培训周期偏长（3 周），班组分担压力",
    ],
    improvements: [
      { title: "终检测试台扩容",       impact: "medium", desc: "新增一台测试设备，预计投入 28 万元，瓶颈节拍提升 30%" },
      { title: "线边智能 SOP 看板",     impact: "medium", desc: "试点 2 个工位，减少新人请教时间" },
    ],
  },

  "ningbo-hengzhan::品质阿米巴": {
    breakdown: { labor: 95, materials: 12, auxiliary: 18, energy: 8, equipment: 22, travel: 18, finance: 4, other: 18 },
    employees: [
      { name: "孙经理",  role: "阿米巴长 / 品质经理",  hours: 192, cost: 3.4 },
      { name: "周文涛",  role: "SQE",                  hours: 188, cost: 2.4 },
      { name: "李君伟",  role: "QE",                   hours: 186, cost: 2.0 },
      { name: "陈丽华",  role: "IQC",                  hours: 184, cost: 1.4 },
      { name: "杨小宇",  role: "OQC",                  hours: 180, cost: 1.4 },
    ],
    equipment: [
      { name: "三坐标测量机",   type: "检测", usageHours: 280, cost: 6.8, oee: 58 },
      { name: "影像测量仪",     type: "检测", usageHours: 320, cost: 4.2, oee: 67 },
      { name: "盐雾试验箱",     type: "试验", usageHours: 720, cost: 3.6, oee: 100 },
      { name: "拉力试验机",     type: "试验", usageHours: 180, cost: 2.4, oee: 38 },
    ],
    energy: [
      { type: "电力",       quantity: "8500 度", cost: 0.7, note: "实验室分表" },
      { type: "实验室冷却水", quantity: "12 吨",   cost: 0.1 },
    ],
    auxiliary: [
      { name: "检测试剂",     plannedQty: "—",     actualQty: "12 批", cost: 4.8, variance: 0 },
      { name: "塞规 / 量规",   plannedQty: "—",     actualQty: "8 批",  cost: 1.8, variance: 0 },
      { name: "盐雾试剂",     plannedQty: "60 L",  actualQty: "62 L",  cost: 0.9, variance: 3.3 },
    ],
    products: [
      { name: "进货检验（IQC）服务", spec: "按产量收费", qty: 145000, unit: "件",  transferPrice: 0.15, revenue: 217, unitCost: 198, valueAdded: 8.8 },
      { name: "出货检验（OQC）服务", spec: "按产量收费", qty: 132000, unit: "件",  transferPrice: 0.12, revenue: 158, unitCost: 142, valueAdded: 10.1 },
      { name: "供应商审核服务",     spec: "项目计费",   qty: 8,       unit: "次",  transferPrice: 5800, revenue: 47,  unitCost: 38,  valueAdded: 19.1 },
    ],
    wasteCosts: [
      { category: "rework",      label: "复检工时",         amount: 1.2, rootCause: "首检不规范导致少量复检" },
      { category: "idle",        label: "拉力机闲置",       amount: 1.8, rootCause: "OEE 38%，设备投资未充分利用" },
      { category: "claim",       label: "客诉外部分摊",     amount: 0.4, rootCause: "本月 1 起轻微客诉，品质承担 40%" },
    ],
    strengths: [
      "客诉赔偿连续 28 天为 0",
      "SQE 主动管理供应商，PPM 同比下降 38%",
      "三坐标测量准确度行业领先",
    ],
    weaknesses: [
      "拉力试验机 OEE 38%，使用率过低（投资回报周期长）",
      "差旅占总成本 9%，主要是客户审核与供应商现场",
    ],
    improvements: [
      { title: "拉力试验机对外接单",       impact: "medium", desc: "向同行业小厂提供外包检测服务，年化预计 12-18 万元收入" },
      { title: "客户审核标准化资料库",     impact: "low",    desc: "减少重复准备时间，预计差旅 + 工时降低 15%" },
    ],
  },

  // ============ 苏州智微 — partial showcase ============
  "suzhou-zhiwei::项目阿米巴-A": {
    breakdown: { labor: 1280, materials: 720, auxiliary: 45, energy: 18, equipment: 65, travel: 152, finance: 78, other: 122 },
    employees: [
      { name: "项目王",   role: "项目经理",         hours: 200, cost: 4.8 },
      { name: "刘工",     role: "机械主设计",       hours: 220, cost: 3.6 },
      { name: "周工",     role: "电气主设计",       hours: 215, cost: 3.4 },
      { name: "陈工",     role: "软件 / PLC",       hours: 230, cost: 3.2 },
      { name: "孙工",     role: "机械设计",         hours: 218, cost: 2.4 },
      { name: "马工",     role: "现场调试",         hours: 240, cost: 2.8 },
      { name: "李工",     role: "外协采购",         hours: 188, cost: 1.8 },
    ],
    equipment: [
      { name: "大型加工中心租赁",   type: "加工", usageHours: 320, cost: 18.0 },
      { name: "项目仿真工作站",     type: "软件", usageHours: 720, cost: 4.2 },
    ],
    energy: [
      { type: "现场调试电力（客户场地）", quantity: "—", cost: 1.8, note: "项目独立计量" },
    ],
    auxiliary: [
      { name: "电控元器件备件", plannedQty: "—",   actualQty: "8 批",  cost: 3.8,  variance: 0 },
      { name: "气路接头 / 管材", plannedQty: "120 套", actualQty: "138 套", cost: 0.8,  variance: 15.0 },
    ],
    products: [
      { name: "锂电极片涂布线（主机）", spec: "宁德某基地",   qty: 1, unit: "套", transferPrice: 18500000, revenue: 1850, unitCost: 1605, valueAdded: 13.2 },
      { name: "上料模块（变更追加）",   spec: "客户后补",     qty: 2, unit: "套", transferPrice: 380000,    revenue: 76,   unitCost: 72,   valueAdded: 5.3 },
    ],
    wasteCosts: [
      { category: "rework",      label: "客户变更返工",     amount: 18.4, rootCause: "3 次未签证变更累计返工" },
      { category: "overtime",    label: "工时超预算",       amount: 38.6, rootCause: "项目工时超预算 18%（红色预警）" },
      { category: "scrap",       label: "试装报废件",       amount: 4.2,  rootCause: "试装时尺寸偏差 8mm，更换零件" },
      { category: "claim",       label: "里程碑罚款风险",   amount: 12.0, rootCause: "如延期 > 4 周，预计客户索赔（已计提）" },
    ],
    strengths: ["技术骨干稳定", "项目工时颗粒度精细，可追溯到每位工程师"],
    weaknesses: [
      "工时累计超预算 18%（红色预警）",
      "客户变更签证流程不健全，已发生 3 次未补签证",
      "差旅成本占比 7.3%，明显高于同类项目",
    ],
    improvements: [
      { title: "立即补办变更签证",         impact: "high",   desc: "本周内整理 3 笔未签证变更，与客户对账闭环" },
      { title: "项目变更管控硬性流程",     impact: "high",   desc: "未签证不开工，由销售 + 项目经理双人审批" },
      { title: "差旅政策细化",             impact: "medium", desc: "调试人员单次出差 ≤ 14 天，超期需走特批" },
    ],
  },

  "suzhou-zhiwei::销售-新能源组": {
    breakdown: { labor: 180, materials: 0, auxiliary: 4, energy: 2, equipment: 8, travel: 95, finance: 35, other: 26 },
    employees: [
      { name: "陈总监", role: "销售总监 / 阿米巴长", hours: 200, cost: 6.8 },
      { name: "王经理", role: "客户经理",             hours: 198, cost: 4.2 },
      { name: "李经理", role: "客户经理",             hours: 195, cost: 4.0 },
      { name: "赵助理", role: "销售支持",             hours: 188, cost: 1.6 },
    ],
    equipment: [],
    energy: [],
    auxiliary: [
      { name: "样件 / DEMO 物料", plannedQty: "—", actualQty: "5 批", cost: 3.8, variance: 0 },
    ],
    products: [
      { name: "新能源涂布线订单",   spec: "宁德时代",     qty: 1, unit: "项目", transferPrice: 42000000, revenue: 4200, unitCost: 0, valueAdded: 100 },
      { name: "PACK 自动化产线",   spec: "比亚迪",        qty: 1, unit: "项目", transferPrice: 28000000, revenue: 2800, unitCost: 0, valueAdded: 100 },
      { name: "改造类小单",         spec: "多客户",        qty: 4, unit: "项目", transferPrice: 1200000,  revenue: 480,  unitCost: 0, valueAdded: 100 },
    ],
    wasteCosts: [
      { category: "rework",      label: "样件 / DEMO 报废",   amount: 3.8, rootCause: "客户验证调整，样件不可复用" },
      { category: "overconsume", label: "差旅低效",            amount: 6.2, rootCause: "重复出差未做行程合并" },
      { category: "claim",       label: "履约延期罚款",        amount: 0,   rootCause: "无" },
    ],
    strengths: [
      "新能源行业渗透率高，年度签约率 92%",
      "中标 ¥4200 万订单，本月明星单",
      "客户经理梯队稳定",
    ],
    weaknesses: [
      "差旅占成本 26.4%，主要由头部客户密集差旅造成",
      "样件物料未单独核算，挤占销售费用预算",
    ],
    improvements: [
      { title: "样件物料预算独立账户", impact: "medium", desc: "由总部承担样件成本，避免误导销售毛利核算" },
      { title: "客户分级差旅频次管控", impact: "low",    desc: "B/C 类客户改为线上 + 季度走访" },
    ],
  },

  // ============ 杭州金鼎 — partial showcase ============
  "hangzhou-jinding::模具设计阿米巴": {
    breakdown: { labor: 825, materials: 156, auxiliary: 12, energy: 18, equipment: 285, travel: 28, finance: 32, other: 64 },
    employees: [
      { name: "高工",   role: "阿米巴长 / 主任工程师", hours: 200, cost: 6.8 },
      { name: "陈工",   role: "高级模具设计",            hours: 198, cost: 4.2 },
      { name: "孙工",   role: "高级模具设计",            hours: 195, cost: 4.2 },
      { name: "李工",   role: "中级模具设计",            hours: 200, cost: 3.0 },
      { name: "周工",   role: "中级模具设计",            hours: 198, cost: 3.0 },
      { name: "王工",   role: "CAE 仿真",                hours: 192, cost: 2.8 },
      { name: "赵工",   role: "结构设计",                hours: 196, cost: 2.4 },
      { name: "马工",   role: "结构设计",                hours: 190, cost: 2.4 },
    ],
    equipment: [
      { name: "高性能仿真工作站 ×6", type: "软件",   usageHours: 1080, cost: 16.5, oee: 82 },
      { name: "UG / CATIA 套件",     type: "软件许可", usageHours: 1280, cost: 8.2 },
      { name: "云端仿真集群",        type: "云资源",   usageHours: 380,  cost: 4.4 },
    ],
    energy: [
      { type: "电力（设计中心）", quantity: "1.2 万度", cost: 1.0, note: "区域分表" },
    ],
    auxiliary: [
      { name: "打印纸 / 蓝图", plannedQty: "—", actualQty: "正常", cost: 0.4, variance: 0 },
      { name: "CAD 标准件库授权", plannedQty: "—", actualQty: "—", cost: 0.8, variance: 0 },
    ],
    products: [
      { name: "汽车冲压模具（大型）", spec: "比亚迪 / 长城",  qty: 3, unit: "套", transferPrice: 1850000, revenue: 555, unitCost: 432, valueAdded: 22.2 },
      { name: "汽车冲压模具（中型）", spec: "多客户",          qty: 5, unit: "套", transferPrice: 980000,  revenue: 490, unitCost: 392, valueAdded: 20.0 },
      { name: "模具修复 / 改造服务",   spec: "多客户",          qty: 12, unit: "项", transferPrice: 240000,  revenue: 288, unitCost: 226, valueAdded: 21.5 },
    ],
    wasteCosts: [
      { category: "rework",      label: "设计变更返工",     amount: 4.2, rootCause: "客户需求变更率 8%，CAE 已提前拦截大部分" },
      { category: "overconsume", label: "软件许可闲置",     amount: 8.6, rootCause: "夜间许可证空闲率 35%" },
      { category: "idle",        label: "CAE 集群闲置",     amount: 2.8, rootCause: "利用率 35%，可对外服务化" },
      { category: "claim",       label: "客诉赔偿",         amount: 0,   rootCause: "本月无" },
    ],
    strengths: [
      "设计师梯队高级:中级 = 3:5，知识结构合理",
      "项目准时率 96%，行业 Top 10%",
      "CAE 仿真前置，开模一次成功率提升至 88%",
    ],
    weaknesses: [
      "软件许可成本占比 19%（行业均值 12%），可能存在闲置许可证",
      "CAE 仿真集群利用率偏低（35%），可考虑外接订单",
    ],
    improvements: [
      { title: "软件许可使用情况盘点",   impact: "medium", desc: "按月统计活跃许可证数，闲置许可逐步缩减" },
      { title: "CAE 集群对外服务化",     impact: "medium", desc: "对兄弟企业 / 客户开放仿真订单，年化预期 30-50 万元增收" },
    ],
  },

  "hangzhou-jinding::热处理阿米巴": {
    breakdown: { labor: 165, materials: 95, auxiliary: 38, energy: 195, equipment: 58, travel: 4, finance: 12, other: 23 },
    employees: [
      { name: "吴主任",  role: "阿米巴长",   hours: 198, cost: 3.2 },
      { name: "陈志强",  role: "热处理技师", hours: 192, cost: 2.4 },
      { name: "李大伟",  role: "热处理技师", hours: 190, cost: 2.2 },
      { name: "孙建军",  role: "热处理工",   hours: 188, cost: 1.4 },
      { name: "周明",    role: "热处理工",   hours: 186, cost: 1.4 },
    ],
    equipment: [
      { name: "井式渗碳炉 ×2",  type: "热处理", usageHours: 560, cost: 18.6, oee: 65 },
      { name: "真空淬火炉",     type: "热处理", usageHours: 320, cost: 16.4, oee: 58 },
      { name: "回火炉 ×3",      type: "热处理", usageHours: 720, cost: 12.8, oee: 70 },
      { name: "硬度检测室",     type: "检测",   usageHours: 240, cost: 4.8 },
    ],
    energy: [
      { type: "天然气",   quantity: "16,400 m³", cost: 12.3, note: "炉群独立计量" },
      { type: "电力",     quantity: "7.2 万度",  cost: 5.8 },
      { type: "氮气",     quantity: "2,800 m³",   cost: 1.4 },
    ],
    auxiliary: [
      { name: "渗碳剂",   plannedQty: "1200 kg", actualQty: "1380 kg", cost: 8.4, variance: 15.0 },
      { name: "淬火油",   plannedQty: "320 L",   actualQty: "382 L",   cost: 9.6, variance: 19.4 },
      { name: "清洗剂",   plannedQty: "240 L",   actualQty: "286 L",   cost: 1.8, variance: 19.2 },
    ],
    products: [
      { name: "渗碳处理服务",       spec: "模具钢", qty: 28, unit: "炉", transferPrice: 18500, revenue: 52,  unitCost: 46,  valueAdded: 11.5 },
      { name: "真空淬火服务",       spec: "工模具", qty: 18, unit: "炉", transferPrice: 22000, revenue: 40,  unitCost: 35,  valueAdded: 12.5 },
      { name: "回火 / 时效处理",     spec: "通用",   qty: 96, unit: "炉", transferPrice: 4200,  revenue: 40,  unitCost: 35,  valueAdded: 12.5 },
      { name: "技术服务（外协接单）", spec: "兄弟厂", qty: 6,  unit: "项", transferPrice: 12800, revenue: 7.7, unitCost: 6.2, valueAdded: 19.5 },
    ],
    wasteCosts: [
      { category: "rework",      label: "硬度返修",         amount: 1.8, rootCause: "工艺参数波动导致少量返工" },
      { category: "overconsume", label: "淬火油超耗",       amount: 1.6, rootCause: "超耗 19.4%，与抽真空时间偏长有关" },
      { category: "overconsume", label: "渗碳剂超耗",       amount: 1.1, rootCause: "超耗 15%，未做剂量优化" },
      { category: "idle",        label: "炉群空载浪费",     amount: 3.2, rootCause: "OEE 58-70%，部分炉次未填满" },
      { category: "scrap",       label: "废品成本",         amount: 1.4, rootCause: "尺寸涨差超标少量报废" },
    ],
    strengths: [
      "工艺工程师能力强，新材料试制能力突出",
    ],
    weaknesses: [
      "能耗占成本 33%（行业均值 25%），主要是设备老化 + 工艺裕量过大",
      "辅料超耗 15-19%，与工艺标准化不足相关",
      "OEE 普遍低于公司其他阿米巴",
    ],
    improvements: [
      { title: "工艺参数标准化项目",     impact: "high",   desc: "由顾问 + 工艺工程师联合驱动，目标 6 月底完成 SOP 落地" },
      { title: "井式渗碳炉余热回收改造", impact: "high",   desc: "预算 38 万元，预计年节约能源 22 万元" },
      { title: "辅料采购改为集中议价",   impact: "medium", desc: "与精加工阿米巴打包采购，预计单价降 6%" },
    ],
  },
};

/**
 * Lookup an amiba's detailed financial breakdown. If not pre-authored,
 * synthesize a reasonable default from the amiba's totals.
 */
export function getAmibaDetail(enterpriseSlug: string, amibaName: string): AmibaDetail | null {
  const key = `${enterpriseSlug}::${amibaName}`;
  if (AMIBA_DETAILS[key]) return AMIBA_DETAILS[key];
  return null;
}

// =====================================================================
// Default enterprise-level rules & architecture (used unless overridden)
// =====================================================================

export const DEFAULT_ACCOUNTING_RULES: AccountingRule[] = [
  {
    id: "rule.transfer",
    name: "内部转让定价",
    category: "transfer_price",
    formula: "转让价 = 标准工时成本 × (1 + 内部利润率%)",
    inputs: ["MES 标准工时", "ERP 人工费率", "总部下达内部利润率"],
    example: "冲压阿米巴 → 营销阿米巴：\n  标准工时成本 28.5 元/h × (1 + 12%) = 31.92 元/h\n  本月销量 380 工时 → 转让收入 12.13 万元",
    reviewBy: "总部 + 阿米巴长协商",
    reviewCadence: "季度初核定，季度内冻结",
  },
  {
    id: "rule.equipment",
    name: "设备内部租赁制",
    category: "depreciation",
    formula: "设备工时单价 = (月折旧额 + 月均维修费 + 备件储备金) ÷ 月度可用工时",
    inputs: ["资产台账折旧", "维修工单实际成本", "财务备件库存"],
    example: "200T 高速冲床：\n  (3.5 + 0.6 + 0.4) 万 ÷ 165 h = 28.8 元/h\n  本月使用 612 h → 计入 17.6 万元",
    reviewBy: "财务 + 设备部",
    reviewCadence: "年度核定，单价季度复算",
  },
  {
    id: "rule.energy",
    name: "能耗分摊（三级计量）",
    category: "energy",
    formula: "高耗能设备：实物计量\n中耗能：按工时分摊\n低耗能：按面积分摊",
    inputs: ["智能电表实时读数", "MES 工时", "厂房面积台账"],
    example: "电力 11.8 万元：\n  · 子表精确计量 → 8.2 万元归冲压\n  · 公用电力 3.6 万元按工时占比分摊到 5 个阿米巴",
    reviewBy: "财务 + IT",
    reviewCadence: "月度结算",
  },
  {
    id: "rule.auxiliary",
    name: "辅料定额消耗法",
    category: "auxiliary",
    formula: "标准辅料成本 = Σ(产量 × 产品级定额单耗 × 辅料单价)\n超额成本归阿米巴自行承担",
    inputs: ["产品定额库", "ERP 辅料价格", "出库扫码记录"],
    example: "冲压油定额 180 kg × 实价 50 元 = 0.9 万元\n实际 176 kg → 节约 0.04 万元（绿色亮点）",
    reviewBy: "工程 + 班组长",
    reviewCadence: "每季度调整定额库",
  },
  {
    id: "rule.waste",
    name: "浪费成本核算",
    category: "waste",
    formula: "浪费成本 = 不良品成本 + 返工工时 × 工时单价 + 超耗辅料 + 设备空转电耗 + 客诉赔偿\n纳入阿米巴利润扣减项",
    inputs: ["质量系统", "MES 状态机", "辅料超耗台账", "客诉系统"],
    example: "本月：返工 4.8 万 + 超耗辅料 2.1 万 + 空转电耗 0.6 万 = 7.5 万元\n占本阿米巴成本 0.8%",
    reviewBy: "财务月结",
    reviewCadence: "月度",
  },
  {
    id: "rule.quality",
    name: "质量成本责任归属",
    category: "quality",
    formula: "正常磨损 → 设备资产阿米巴\n操作失误 → 责任阿米巴 100%\n工艺超负荷 → 工程 + 制造各 50%\n客诉赔偿 → 营销 + 制造按责任比例",
    inputs: ["质量根因分析单", "工单关联"],
    example: "上月客诉赔偿 1.2 万元：营销 30% + 制造 70% = 制造承担 0.84 万",
    reviewBy: "品质阿米巴 + 责任阿米巴",
    reviewCadence: "事件触发 + 月度复盘",
  },
];

export const DEFAULT_GOVERNANCE_RULES: GovernanceRule[] = [
  {
    id: "gov.aux10",
    title: "辅料超额自承担规则",
    scope: "所有制造阿米巴",
    threshold: "超额 ≤ 10%",
    action: "阿米巴自行承担，无需上报",
    ownedBy: "阿米巴长",
  },
  {
    id: "gov.aux10plus",
    title: "辅料超额异常分析",
    scope: "所有制造阿米巴",
    threshold: "超额 > 10%",
    action: "触发跨部门异常分析，限 5 个工作日内出根因报告",
    ownedBy: "工程 + 财务 + 阿米巴长",
  },
  {
    id: "gov.milestone",
    title: "里程碑延误升级",
    scope: "项目 / 系统改造类",
    threshold: "延误 > 4 周",
    action: "P0 红色预警，自动通知老板与顾问；24h 内对齐会",
    ownedBy: "项目经理",
  },
  {
    id: "gov.transferprice",
    title: "内部转让价冻结",
    scope: "全部阿米巴",
    threshold: "季度内",
    action: "核定后冻结，期间不得变更；下季度协商一次",
    ownedBy: "总部 + 阿米巴长",
  },
  {
    id: "gov.profitshare",
    title: "超利分享机制",
    scope: "全部阿米巴",
    threshold: "实际利润率 > 目标 110%",
    action: "超出部分 30% 进入阿米巴分红池，70% 留企业",
    ownedBy: "财务 + HR",
  },
  {
    id: "gov.dataquality",
    title: "数据质量月度巡检",
    scope: "全部数据源",
    threshold: "缺录率 > 8%",
    action: "黄色预警，3 个工作日内修复",
    ownedBy: "IT + 数据治理委员会",
  },
];

export const DEFAULT_DATA_ARCHITECTURE: DataArchitecture = {
  nodes: [
    // ===== Layer 1: data sources =====
    {
      id: "iot",
      label: "IoT / 智能电表",
      shortLabel: "IoT",
      layer: "source",
      description: "设备物联网采集层。子表精确到产线/单设备级，5 秒采样频率上传到数采网关。",
      dataFields: ["瞬时功率", "累计电量", "压缩空气流量", "天然气流量", "设备运行状态"],
      integration: "MQTT → 数据网关 → REST",
      status: "live",
      vendor: "宇电 + 西门子工业网关",
      chart: {
        kind: "line",
        title: "近 24 小时车间用电曲线",
        subtitle: "智能电表 · 5 秒级采样",
        unit: "kW",
        series: [
          { x: "00:00", y: 142 }, { x: "02:00", y: 138 }, { x: "04:00", y: 135 },
          { x: "06:00", y: 168 }, { x: "08:00", y: 320 }, { x: "10:00", y: 412 },
          { x: "12:00", y: 285 }, { x: "14:00", y: 405 }, { x: "16:00", y: 398 },
          { x: "18:00", y: 372 }, { x: "20:00", y: 245 }, { x: "22:00", y: 168 },
        ],
        stats: [
          { label: "今日累计", value: "6,832 kWh", tone: "primary" },
          { label: "高峰", value: "412 kW @ 10:00" },
          { label: "采样设备数", value: "27 台", tone: "muted" },
        ],
      },
    },
    {
      id: "mes",
      label: "MES 制造执行",
      shortLabel: "MES",
      layer: "source",
      description: "工单 / 工时 / 产量数据来源。覆盖冲压 / 焊接 / 总装等核心工序。",
      dataFields: ["工单号", "标准工时", "实际工时", "产品产量", "设备工时", "工艺参数"],
      integration: "数据库直连 + 准实时同步",
      status: "partial",
      vendor: "自研（基于开源 OpenMES）",
      chart: {
        kind: "bar",
        title: "本周各阿米巴工时产出",
        subtitle: "工单完工统计",
        unit: "工时",
        series: [
          { x: "周一", y: 412 }, { x: "周二", y: 438 }, { x: "周三", y: 425 },
          { x: "周四", y: 456 }, { x: "周五", y: 432 }, { x: "周六", y: 285 }, { x: "周日", y: 0 },
        ],
        stats: [
          { label: "本周累计", value: "2,448 工时", tone: "primary" },
          { label: "工时达成率", value: "104%", tone: "success" },
        ],
      },
    },
    {
      id: "erp",
      label: "ERP 财务 / 物料",
      shortLabel: "ERP",
      layer: "source",
      description: "财务核算与物料管理主系统。承载科目、价格、库存。",
      dataFields: ["科目余额", "物料编码与单价", "人工费率", "采购订单", "辅料出库"],
      integration: "金蝶 K/3 API + Webhook",
      status: "live",
      vendor: "金蝶云星空 K/3",
      chart: {
        kind: "donut",
        title: "本月成本科目分布",
        subtitle: "全公司汇总",
        slices: [
          { name: "直接物料", value: 1820, color: "#2d2a8e" },
          { name: "人工",     value: 920,  color: "#4a90d9" },
          { name: "制造费用", value: 480,  color: "#9ed4f6" },
          { name: "辅料",     value: 220,  color: "#d97706" },
          { name: "能耗",     value: 285,  color: "#16a34a" },
          { name: "其他",     value: 175,  color: "#94a3b8" },
        ],
      },
    },
    {
      id: "manual",
      label: "钉钉 / 手工台账",
      shortLabel: "手工台账",
      layer: "source",
      description: "补充 IT 覆盖不到的颗粒度，如辅料周报、定额修订、改善小组活动。",
      dataFields: ["辅料消耗周报", "定额修订", "改善小组活动", "现场异常"],
      integration: "钉钉表单 / Excel 导入",
      status: "live",
      vendor: "钉钉智能填报",
      chart: {
        kind: "stat",
        title: "数据上报质量",
        subtitle: "本月统计",
        stats: [
          { label: "应填表单", value: "248 份" },
          { label: "已完成",   value: "232 份", tone: "primary" },
          { label: "缺录率",   value: "6.5%",  tone: "warning" },
          { label: "异常上报", value: "12 起", tone: "muted" },
        ],
      },
    },
    // ===== Layer 2: hub =====
    {
      id: "cost_eng",
      label: "成本归因引擎",
      shortLabel: "成本归因",
      layer: "hub",
      description: "把多源数据按规则归集到阿米巴。规则可视化、可审计。",
      dataFields: ["阿米巴 ID → 工时 × 工时单价", "能耗实物 + 分摊系数", "辅料定额匹配"],
      integration: "Amoeba Copilot 内置",
      status: "live",
      chart: {
        kind: "bar",
        title: "本月各阿米巴成本归集",
        subtitle: "由引擎自动拆分",
        unit: "万元",
        series: [
          { x: "冲压",  y: 950 },
          { x: "焊接",  y: 825 },
          { x: "涂装",  y: 545 },
          { x: "总装",  y: 1290 },
          { x: "品质",  y: 195 },
        ],
        stats: [
          { label: "已归集金额", value: "¥3,805 万", tone: "primary" },
          { label: "归集准确度", value: "97.2%",     tone: "success" },
        ],
      },
    },
    {
      id: "transfer_calc",
      label: "内部转让价计算器",
      shortLabel: "转让价",
      layer: "hub",
      description: "季度核定，期间冻结；按公式自动生成本月转让收入。",
      dataFields: ["标准工时", "费率表", "内部利润率"],
      integration: "Amoeba Copilot 内置",
      status: "live",
      chart: {
        kind: "kv",
        title: "本季度转让价表（节选）",
        subtitle: "由总部与阿米巴协商冻结",
        kv: [
          { k: "冲压 → 营销", v: "31.92 元/h" },
          { k: "焊接 → 营销", v: "42.50 元/h" },
          { k: "涂装 → 营销", v: "28.30 元/h" },
          { k: "总装 → 营销", v: "38.80 元/h" },
          { k: "模具 → 项目", v: "186 元/h" },
          { k: "品质 → 全公司", v: "按产量 0.15 元/件" },
        ],
      },
    },
    {
      id: "waste_model",
      label: "浪费识别模型",
      shortLabel: "浪费识别",
      layer: "hub",
      description: "结合质量 / 设备 / 辅料异常数据，识别 7 类浪费并量化金额。",
      dataFields: ["不良品", "返工工时", "超耗辅料", "设备空转", "超时工时", "客诉", "废品处置"],
      integration: "规则 + 轻量统计学习",
      status: "live",
      chart: {
        kind: "bar",
        title: "本月浪费类型 Top 7",
        subtitle: "全公司汇总",
        unit: "万元",
        series: [
          { x: "返工", y: 28.4 },
          { x: "超耗辅料", y: 19.6 },
          { x: "废品", y: 18.2 },
          { x: "设备空转", y: 8.6 },
          { x: "加班", y: 6.4 },
          { x: "客诉", y: 4.8 },
          { x: "处置", y: 2.1 },
        ],
        stats: [
          { label: "本月总浪费", value: "¥88.1 万", tone: "danger" },
          { label: "可消除部分", value: "¥52.8 万", tone: "success" },
        ],
      },
    },
    // ===== Layer 3: outputs =====
    {
      id: "amiba_pl",
      label: "阿米巴利润表",
      shortLabel: "利润表",
      layer: "output",
      description: "每个阿米巴月度独立损益表，可下钻到单据级。",
      dataFields: ["营收", "成本拆解", "利润", "对比目标", "对比同行业"],
      integration: "Amoeba Copilot 看板",
      status: "live",
      chart: {
        kind: "line",
        title: "近 6 月公司综合利润趋势",
        subtitle: "由 5 个阿米巴利润聚合",
        unit: "万元",
        series: [
          { x: "12月", y: 420 }, { x: "1月", y: 385 }, { x: "2月", y: 348 },
          { x: "3月", y: 462 }, { x: "4月", y: 498 }, { x: "5月", y: 532 },
        ],
        stats: [
          { label: "5 月利润", value: "532 万", tone: "primary" },
          { label: "环比", value: "+6.8%", tone: "success" },
        ],
      },
    },
    {
      id: "waste_dash",
      label: "浪费看板",
      shortLabel: "浪费看板",
      layer: "output",
      description: "可视化 7 类浪费金额与趋势，按阿米巴 / 工序 / 责任人切片。",
      dataFields: ["浪费金额", "趋势", "Top 5 来源", "根因分布"],
      integration: "Amoeba Copilot 看板",
      status: "live",
      chart: {
        kind: "donut",
        title: "本月浪费来源切片",
        subtitle: "按阿米巴归属",
        slices: [
          { name: "涂装", value: 28.5, color: "#dc2626" },
          { name: "焊接", value: 23.2, color: "#d97706" },
          { name: "冲压", value: 9.5,  color: "#a855f7" },
          { name: "热处理", value: 9.1, color: "#0891b2" },
          { name: "总装", value: 7.8,  color: "#16a34a" },
          { name: "其他", value: 10.0, color: "#94a3b8" },
        ],
      },
    },
    {
      id: "alerts",
      label: "智能预警 + 行动建议",
      shortLabel: "预警建议",
      layer: "output",
      description: "基于阈值规则触发，每条预警附 AI 生成的行动建议。",
      dataFields: ["阈值规则", "触发记录", "处置闭环", "AI 建议"],
      integration: "Amoeba Copilot + 钉钉推送",
      status: "live",
      chart: {
        kind: "stat",
        title: "本周预警分布",
        subtitle: "按严重度",
        stats: [
          { label: "P0 红色", value: "1 起", tone: "danger" },
          { label: "P1 黄色", value: "4 起", tone: "warning" },
          { label: "绿色亮点", value: "3 起", tone: "success" },
          { label: "信息", value: "12 起", tone: "muted" },
        ],
      },
    },
  ],
  edges: [
    { from: "iot", to: "cost_eng", label: "能耗" },
    { from: "mes", to: "cost_eng", label: "工时" },
    { from: "erp", to: "cost_eng", label: "人工/物料" },
    { from: "manual", to: "cost_eng", label: "辅料" },
    { from: "mes", to: "transfer_calc", label: "工时" },
    { from: "erp", to: "transfer_calc", label: "费率" },
    { from: "mes", to: "waste_model", label: "返工/空转" },
    { from: "erp", to: "waste_model", label: "客诉" },
    { from: "manual", to: "waste_model", label: "超耗" },
    { from: "cost_eng", to: "amiba_pl" },
    { from: "transfer_calc", to: "amiba_pl" },
    { from: "waste_model", to: "waste_dash" },
    { from: "waste_model", to: "amiba_pl" },
    { from: "cost_eng", to: "alerts" },
    { from: "waste_model", to: "alerts" },
  ],
};

export function getAccountingRules(_enterpriseSlug: string): AccountingRule[] {
  return DEFAULT_ACCOUNTING_RULES;
}
export function getGovernanceRules(_enterpriseSlug: string): GovernanceRule[] {
  return DEFAULT_GOVERNANCE_RULES;
}
export function getDataArchitecture(_enterpriseSlug: string): DataArchitecture {
  return DEFAULT_DATA_ARCHITECTURE;
}

// =====================================================================
// Planning detail: business processes (used by the rule-detail planning page)
// =====================================================================

export interface ProcessStep {
  step: string;
  owner: string;
  system: string;     // "MES" / "ERP" / "钉钉" / "手工" / "Copilot"
  sla?: string;       // e.g. "T+1"
  note?: string;
}

export interface BusinessProcess {
  id: string;
  name: string;
  category: "accounting" | "ops" | "quality" | "governance";
  frequency: string;  // 月度 / 季度 / 事件触发
  steps: ProcessStep[];
}

export const DEFAULT_PROCESSES: BusinessProcess[] = [
  {
    id: "p.monthly-close",
    name: "月度阿米巴核算与对账",
    category: "accounting",
    frequency: "每月 1-3 工作日",
    steps: [
      { step: "数据归集（MES 工时 / ERP 物料 / IoT 能耗 / 手工辅料）", owner: "财务-周", system: "Copilot", sla: "T+1" },
      { step: "成本归因引擎自动跑账", owner: "Copilot", system: "Copilot", sla: "自动" },
      { step: "差异审核（双轨期间）", owner: "财务-周 + IT-王", system: "手工 + Copilot" },
      { step: "阿米巴长签字确认", owner: "阿米巴长", system: "钉钉审批" },
      { step: "分红基数计算（如已落地）", owner: "财务 + HR", system: "Copilot + ERP" },
      { step: "结果公布（看板 + 月报）", owner: "财务-周", system: "Copilot" },
    ],
  },
  {
    id: "p.transfer-pricing",
    name: "季度内部转让价协商",
    category: "governance",
    frequency: "每季度初",
    steps: [
      { step: "Copilot 基于上季度标准工时 + 利润目标，生成初版定价", owner: "Copilot", system: "Copilot" },
      { step: "各阿米巴长查看草案 + 内部异议反馈（限 5 工作日）", owner: "阿米巴长", system: "钉钉" },
      { step: "总部 + 阿米巴长协商会议（必要时）", owner: "总部 + 阿米巴长", system: "线下" },
      { step: "定价冻结、写入 ERP 价表", owner: "财务 + IT-王", system: "ERP" },
      { step: "下发至各阿米巴，季度内不可变更", owner: "总部", system: "Copilot" },
    ],
  },
  {
    id: "p.aux-out",
    name: "辅料出库扫码流程（改造后）",
    category: "ops",
    frequency: "每次领用",
    steps: [
      { step: "领用人在 PDA 上选择阿米巴 ID + 物料编码", owner: "操作工", system: "PDA" },
      { step: "扫码出库，系统校验定额", owner: "PDA", system: "ERP" },
      { step: "超定额需 班组长审批（实时）", owner: "班组长", system: "PDA" },
      { step: "数据回写 ERP + Copilot 归集", owner: "ERP", system: "ERP" },
      { step: "月度生成定额执行报告", owner: "Copilot", system: "Copilot" },
    ],
  },
  {
    id: "p.change-order",
    name: "客户变更签证流程（项目制企业）",
    category: "ops",
    frequency: "变更触发",
    steps: [
      { step: "客户变更需求口头 / 邮件接收", owner: "项目经理", system: "邮件" },
      { step: "项目经理 + 销售在 24h 内完成评估（影响工时 / 物料 / 工期）", owner: "项目经理 + 销售", system: "Copilot 计算器" },
      { step: "客户书面签证（电子签或盖章）", owner: "销售", system: "钉钉电子签" },
      { step: "签证文件入档 + 关联工单变更", owner: "项目经理", system: "PLM / ERP" },
      { step: "未签证不开工（硬性卡口）", owner: "项目经理", system: "硬性流程" },
    ],
  },
  {
    id: "p.anomaly",
    name: "异常分析触发流程（辅料超额 / OEE 偏低 等）",
    category: "quality",
    frequency: "阈值触发",
    steps: [
      { step: "Copilot 监测到阈值触发（如辅料超额 > 10%）", owner: "Copilot", system: "Copilot" },
      { step: "钉钉自动推送给阿米巴长 + 工程 + 财务", owner: "Copilot", system: "钉钉" },
      { step: "5 工作日内出根因报告", owner: "阿米巴长 + 工程", system: "钉钉表单" },
      { step: "改进措施落地 + 复测", owner: "阿米巴长", system: "—" },
      { step: "复测后超额未消除 → 升级至总部", owner: "总部", system: "—" },
    ],
  },
  {
    id: "p.dispute",
    name: "跨阿米巴争议处置",
    category: "governance",
    frequency: "事件触发",
    steps: [
      { step: "任一方在 Copilot 上提交争议（含金额、责任比例预案）", owner: "阿米巴长", system: "Copilot" },
      { step: "另一方 3 工作日内确认 / 反驳", owner: "对方阿米巴长", system: "Copilot" },
      { step: "若双方达成一致 → 自动写入双方账本", owner: "Copilot", system: "Copilot" },
      { step: "若分歧 → 总部仲裁（限 1 周内）", owner: "总部", system: "线下 + Copilot" },
      { step: "记录沉淀到知识库，作为下季度规则修订依据", owner: "顾问", system: "Copilot" },
    ],
  },
];

export function getBusinessProcesses(_slug: string): BusinessProcess[] {
  return DEFAULT_PROCESSES;
}

// =====================================================================
// Data collection plan — derived from architecture nodes, with extra detail
// =====================================================================

export interface DataCollectionItem {
  source: "IoT" | "MES" | "ERP" | "手工台账" | "钉钉" | "新建";
  topic: string;            // what is collected
  granularity: string;      // 实时 / 每班 / 每日 / 每周
  destination: string;      // where it lands (归因引擎 / 浪费模型 / 转让价计算器)
  owner: string;
  status: "live" | "partial" | "planned";
  note?: string;
}

export function getDataCollectionPlan(_slug: string): DataCollectionItem[] {
  return [
    { source: "IoT",    topic: "高耗能设备实时功率",       granularity: "5 秒",   destination: "能耗归集 / 浪费识别",     owner: "IT-王",        status: "planned", note: "需先完成电表分级改造" },
    { source: "IoT",    topic: "压缩空气 / 天然气流量",     granularity: "5 秒",   destination: "能耗归集",                owner: "IT-王",        status: "planned" },
    { source: "MES",    topic: "工单实际工时 / 产量",       granularity: "工序级", destination: "归因引擎 / 转让价",       owner: "工程 + IT",    status: "planned", note: "MES 选型中" },
    { source: "MES",    topic: "设备开机 / 状态机",         granularity: "实时",   destination: "OEE / 浪费识别",          owner: "工程 + IT",    status: "planned" },
    { source: "ERP",    topic: "科目余额 + 阿米巴维度",     granularity: "T+1",    destination: "归因引擎",                owner: "IT-王 + 金蝶顾问", status: "partial", note: "辅助核算字段开发中" },
    { source: "ERP",    topic: "物料 / 辅料价格表",         granularity: "维护频率", destination: "归因引擎 / 浪费识别",   owner: "采购",         status: "live" },
    { source: "ERP",    topic: "辅料出库扫码数据",          granularity: "实时",   destination: "归因引擎",                owner: "仓储 + IT",    status: "planned", note: "PDA + 扫码出库改造" },
    { source: "手工台账", topic: "改善小组活动 / 现场异常",   granularity: "每周",   destination: "知识库 / 评估",           owner: "工程组",       status: "live" },
    { source: "钉钉",   topic: "员工花名册 / 阿米巴归属",   granularity: "变更触发", destination: "归因引擎 / HR",         owner: "HR",           status: "live" },
    { source: "钉钉",   topic: "阿米巴长签字 / 异常上报",   granularity: "事件触发", destination: "审批闭环",              owner: "阿米巴长",     status: "live" },
    { source: "新建",   topic: "客户变更签证电子化",        granularity: "事件触发", destination: "项目阿米巴成本",         owner: "项目经理",     status: "planned", note: "项目制企业适用" },
  ];
}

// =====================================================================
// Planning engine: per-enterprise plan
// =====================================================================

export type PlanPath = "A" | "B" | "C";

export interface PlanMilestone {
  phase: string;
  name: string;
  start: string;        // YYYY-MM
  end: string;
  progress: number;     // 0-100
  status: "done" | "in_progress" | "delayed" | "todo";
  owner: string;
  deliverables: string[];
}

export interface PlanBudgetItem {
  label: string;
  amount: number;       // 万元
  color?: string;
  note?: string;
}

export interface PlanRisk {
  title: string;
  level: "high" | "medium" | "low";
  probability: number;  // 0-100
  impact: number;       // 0-100
  mitigation: string;
  owner: string;
}

export interface EnterprisePlan {
  path: PlanPath;
  pathName: string;
  pathReason: string;
  startedAt: string;
  expectedEnd: string;
  milestones: PlanMilestone[];
  budget: { total: number; spent: number; items: PlanBudgetItem[] };
  risks: PlanRisk[];
  /** Constraint inputs that drove path selection */
  constraints: { label: string; value: string }[];
}

export const ENTERPRISE_PLANS: Record<string, EnterprisePlan> = {
  "ningbo-hengzhan": {
    path: "B",
    pathName: "稳健推进型",
    pathReason: "信息化基础中等、组织变革承受力中、老板期望 12 个月内见效，B 路径最匹配",
    startedAt: "2026-03",
    expectedEnd: "2027-05",
    constraints: [
      { label: "改造预算上限", value: "80 万元" },
      { label: "期望见效时间", value: "12 个月" },
      { label: "组织变革承受力", value: "中" },
      { label: "信息化起点", value: "L1（仅 ERP）" },
    ],
    milestones: [
      { phase: "P1", name: "诊断 + 设计 + 系统改造并行", start: "2026-03", end: "2026-05", progress: 100, status: "done", owner: "顾问 + 老板",
        deliverables: ["六维诊断报告", "5 个阿米巴切割方案", "MES 选型 RFP"] },
      { phase: "P2", name: "信息化改造 + 数据自采", start: "2026-06", end: "2026-08", progress: 35, status: "in_progress", owner: "IT-王 + 顾问",
        deliverables: ["MES 系统上线", "智能电表 + 子表部署", "辅料扫码出库"] },
      { phase: "P3", name: "阿米巴核算双轨并行", start: "2026-09", end: "2026-11", progress: 0, status: "todo", owner: "财务-周",
        deliverables: ["手工台账 + MES 数据双轨", "首份阿米巴利润表", "转让定价首次试算"] },
      { phase: "P4", name: "全量切换 + 关闭旧体系", start: "2026-12", end: "2027-01", progress: 0, status: "todo", owner: "总部 + 阿米巴长",
        deliverables: ["关闭传统部门核算", "正式阿米巴运行"] },
      { phase: "P5", name: "动态优化 + 分红机制上线", start: "2027-02", end: "2027-05", progress: 0, status: "todo", owner: "HR + 财务",
        deliverables: ["超利分享机制", "季度复盘上线", "边界争议处置流程"] },
    ],
    budget: { total: 80, spent: 32, items: [
      { label: "MES 系统采购 + 实施", amount: 35, color: "#2d2a8e", note: "占预算 44%" },
      { label: "IoT 智能电表 + 网关", amount: 15, color: "#4a90d9" },
      { label: "顾问陪跑费",          amount: 18, color: "#16a34a" },
      { label: "辅料扫码改造",        amount: 6,  color: "#d97706" },
      { label: "培训与团建",          amount: 3,  color: "#a855f7" },
      { label: "预留",                amount: 3,  color: "#94a3b8" },
    ]},
    risks: [
      { title: "MES 厂商交付能力不稳", level: "high", probability: 55, impact: 75, mitigation: "签合同前要求样板客户走访 + 分期付款 30/40/30", owner: "IT-王" },
      { title: "中层管理者抵触新核算", level: "medium", probability: 60, impact: 50, mitigation: "提前 4 周一对一沟通 + 试点阿米巴示范", owner: "老板 + HR" },
      { title: "辅料定额初版不准确", level: "medium", probability: 70, impact: 35, mitigation: "首季按宽松定额运行，季末根据实际调整", owner: "工程组" },
      { title: "数据双轨期间数据冲突", level: "low",    probability: 40, impact: 30, mitigation: "建立差异审核小组，每周三对账", owner: "财务-周" },
    ],
  },

  "suzhou-zhiwei": {
    path: "B",
    pathName: "稳健推进型（信息化优先）",
    pathReason: "项目制业务 + 已遇里程碑延误，按 B 路径但 MES 优先 PLM，分阶段降级风险",
    startedAt: "2026-02",
    expectedEnd: "2027-06",
    constraints: [
      { label: "改造预算上限", value: "65 万元" },
      { label: "期望见效时间", value: "16 个月" },
      { label: "组织变革承受力", value: "中" },
      { label: "信息化起点", value: "L1（U8 基础）" },
    ],
    milestones: [
      { phase: "P1", name: "诊断 + 项目阿米巴切割设计", start: "2026-02", end: "2026-04", progress: 100, status: "done", owner: "顾问 + 总经理",
        deliverables: ["项目阿米巴定义", "工时颗粒度方案"] },
      { phase: "P2", name: "MES + PLM 集成（延误中）", start: "2026-05", end: "2026-07", progress: 65, status: "delayed", owner: "IT 负责人 + 厂家",
        deliverables: ["工时自动采集", "项目级 BOM 同步"] },
      { phase: "P3", name: "项目阿米巴核算上线", start: "2026-08", end: "2026-10", progress: 20, status: "in_progress", owner: "项目王 + 财务",
        deliverables: ["项目级 P&L", "客户变更签证流程"] },
      { phase: "P4", name: "资源池服务化运行", start: "2026-11", end: "2027-02", progress: 0, status: "todo", owner: "工程经理",
        deliverables: ["机械/电气/软件资源池", "工时分级定价"] },
      { phase: "P5", name: "知识库 + 分红机制", start: "2027-03", end: "2027-06", progress: 0, status: "todo", owner: "顾问 + HR",
        deliverables: ["项目复盘知识库", "项目奖金池规则"] },
    ],
    budget: { total: 65, spent: 38, items: [
      { label: "MES 系统",            amount: 22, color: "#2d2a8e" },
      { label: "PLM 系统（延期降级）", amount: 12, color: "#dc2626" },
      { label: "顾问陪跑费",          amount: 16, color: "#16a34a" },
      { label: "工时管理系统",        amount: 8,  color: "#4a90d9" },
      { label: "培训与变更管理",      amount: 4,  color: "#a855f7" },
      { label: "预留",                amount: 3,  color: "#94a3b8" },
    ]},
    risks: [
      { title: "里程碑延误已触发 P0", level: "high", probability: 90, impact: 85, mitigation: "MES 与 PLM 解耦、MES 优先上线、客户变更补偿协议", owner: "项目王" },
      { title: "客户变更签证流程缺失", level: "high", probability: 75, impact: 70, mitigation: "未签证不开工，销售+项目经理双签", owner: "总经理" },
      { title: "PLM 厂商资源不稳",    level: "medium", probability: 60, impact: 55, mitigation: "考虑切换备选厂商，预留 1 个月窗口", owner: "IT 负责人" },
      { title: "差旅成本不可控",      level: "medium", probability: 65, impact: 35, mitigation: "出差预算包干 + 月度复盘", owner: "财务" },
      { title: "项目奖金分红争议",    level: "low",    probability: 40, impact: 30, mitigation: "项目立项即冻结分红基数与比例", owner: "HR" },
    ],
  },

  "hangzhou-jinding": {
    path: "C",
    pathName: "数字原生型",
    pathReason: "已有 SAP CO + 自研 MES 完整闭环，信息化基础最佳，可走数字原生路线",
    startedAt: "2025-09",
    expectedEnd: "2026-08",
    constraints: [
      { label: "改造预算上限", value: "280 万元" },
      { label: "期望见效时间", value: "12 个月" },
      { label: "组织变革承受力", value: "高" },
      { label: "信息化起点", value: "L3（已较成熟）" },
    ],
    milestones: [
      { phase: "S1", name: "ERP/MES 深度改造", start: "2025-09", end: "2025-12", progress: 100, status: "done", owner: "IT 团队",
        deliverables: ["SAP CO 阿米巴维度配置", "MES 工时颗粒度细化"] },
      { phase: "S2", name: "数据治理 + 成本归因规则", start: "2026-01", end: "2026-03", progress: 100, status: "done", owner: "财务 + IT",
        deliverables: ["完整核算规则手册", "归因引擎上线"] },
      { phase: "S3", name: "阿米巴平台上线", start: "2026-04", end: "2026-07", progress: 80, status: "in_progress", owner: "顾问 + 阿米巴长",
        deliverables: ["4 个阿米巴利润表", "浪费看板", "智能预警"] },
      { phase: "S4", name: "持续迭代 + 全员利润分享", start: "2026-08", end: "2027-12", progress: 35, status: "in_progress", owner: "HR + 总部",
        deliverables: ["分红方案落地", "热处理阿米巴改善小组", "热处理炉余热回收改造"] },
    ],
    budget: { total: 280, spent: 198, items: [
      { label: "SAP CO 模块定制开发",  amount: 95, color: "#2d2a8e" },
      { label: "自研 MES 升级",        amount: 65, color: "#4a90d9" },
      { label: "顾问深度参与",         amount: 38, color: "#16a34a" },
      { label: "炉群余热回收改造",     amount: 38, color: "#d97706" },
      { label: "数据治理 + 规则建模",  amount: 22, color: "#a855f7" },
      { label: "培训与文化变革",       amount: 14, color: "#0891b2" },
      { label: "预留",                 amount: 8,  color: "#94a3b8" },
    ]},
    risks: [
      { title: "热处理阿米巴改造投入大但回报周期不明", level: "medium", probability: 50, impact: 50, mitigation: "分两期投入，先做工艺标准化看效果", owner: "工艺工程师" },
      { title: "文化变革推进偏慢", level: "low", probability: 55, impact: 40, mitigation: "Q3 全员利润分享试运行 → 实际体验驱动", owner: "HR" },
    ],
  },

  "shanghai-changyuan": {
    path: "B",
    pathName: "稳健推进型（建议）",
    pathReason: "暂未发起诊断，路径为初步建议",
    startedAt: "—",
    expectedEnd: "—",
    constraints: [
      { label: "改造预算上限", value: "待评估" },
      { label: "期望见效时间", value: "待评估" },
      { label: "组织变革承受力", value: "待评估" },
      { label: "信息化起点", value: "L1（U8 基础）" },
    ],
    milestones: [],
    budget: { total: 0, spent: 0, items: [] },
    risks: [],
  },
};

export function getEnterprisePlan(slug: string): EnterprisePlan | null {
  return ENTERPRISE_PLANS[slug] || null;
}

// =====================================================================
// Mindmap roadmap — single landscape view of an enterprise's amiba rollout
// =====================================================================

export type RoadmapTone = "keep" | "remove" | "modify" | "new" | "rule" | "primary" | "ok" | "warn" | "bad" | "neutral";

export type RoadmapChart =
  | { kind: "bars";     title: string; unit?: string;
      data: Array<{ label: string; value: number; threshold?: number; tone?: RoadmapTone }> }
  | { kind: "donut";    title: string;
      data: Array<{ name: string; value: number; color?: string }> }
  | { kind: "progress"; title: string;
      items: Array<{ label: string; progress: number; note?: string }> }
  | { kind: "formula";  title: string; formula: string; example?: string }
  | { kind: "stat";     title: string;
      items: Array<{ label: string; value: string; tone?: RoadmapTone }> }
  | { kind: "table";    title: string; columns: string[]; rows: string[][] };

export interface RoadmapNode {
  id: string;
  label: string;
  tone?: RoadmapTone;
  /** Optional detail to render when clicking the node */
  detail?: {
    description?: string;
    owner?: string;
    dataSource?: string;     // IoT / MES / ERP / 手工 / 待对接
    method?: string;         // how the data is gathered
    risk?: string;           // associated risk if any
    mitigation?: string;
    eta?: string;            // estimated timeline
    cost?: string;
  };
  /** Optional chart embedded in the detail popup */
  chart?: RoadmapChart;
  children?: RoadmapNode[];
}

/** Get the master mindmap of an enterprise's amiba rollout. */
export function getEnterpriseRoadmap(slug: string): RoadmapNode {
  const ent = DEMO_ENTERPRISES[slug];
  const plan = ENTERPRISE_PLANS[slug];
  const isAuto = ent?.industry === "auto_parts";

  // Aggregate equipment / auxiliary data across amibas for charts
  const allEquip = ent?.amibas.flatMap((a) => a.detail?.equipment || []).slice(0, 8) || [];
  const allAux = ent?.amibas.flatMap((a) => a.detail?.auxiliary || []).slice(0, 8) || [];
  const peopleRoles = ent?.amibas.flatMap((a) => a.detail?.employees || [])
    .reduce<Record<string, number>>((m, e) => {
      const role = e.role.includes("阿米巴长") || e.role.includes("经理") || e.role.includes("主管") ? "管理 / 技术骨干"
                 : e.role.includes("师傅") || e.role.includes("技师") || e.role.includes("工程师") || e.role.includes("工") ? "技工 / 工程"
                 : e.role.includes("员") || e.role.includes("学徒") ? "辅助 / 学徒" : "其他";
      m[role] = (m[role] || 0) + 1; return m;
    }, {}) || {};

  // Pre-compute waste totals (per category) across all amibas
  const wasteAgg: Record<string, number> = {};
  ent?.amibas.forEach((a) => {
    a.detail?.wasteCosts?.forEach((w) => {
      wasteAgg[w.label] = (wasteAgg[w.label] || 0) + w.amount;
    });
  });

  // Common branches (industry-aware)
  return {
    id: "root",
    label: ent?.name || "阿米巴落地",
    tone: "primary",
    children: [
      {
        id: "current", label: "现状盘点", tone: "keep",
        detail: { description: "对企业现有人 / 设备 / 物料 / 系统进行全量盘点，作为改造基线" },
        children: [
          {
            id: "current.people", label: "人 · 班组结构", tone: "keep",
            detail: {
              description: `当前共 ${ent?.scale || "—"}，含 ${ent?.amibas.length || 0} 个阿米巴长候选`,
              dataSource: "HR 花名册 + 钉钉组织架构",
              method: "API 拉取 + 月度盘点",
              owner: "HR + 阿米巴长",
            },
            chart: {
              kind: "donut", title: "人员角色分布（按全公司汇总）",
              data: Object.entries(peopleRoles).map(([name, value], i) => ({
                name, value, color: ["#2d2a8e", "#4a90d9", "#16a34a", "#94a3b8"][i % 4],
              })),
            },
          },
          {
            id: "current.equipment", label: "设备 · 核心资产", tone: "keep",
            detail: {
              description: isAuto ? "冲压 / 焊接机器人 / 涂装 / 总装 / 检测设备" : "项目专用工装、加工中心、调试设备",
              dataSource: "ERP 资产模块",
              method: "数据库直连每月校验",
              owner: "设备部",
            },
            chart: {
              kind: "bars", title: "核心设备 OEE 现状", unit: "%",
              data: allEquip
                .filter((e) => e.oee !== undefined)
                .map((e) => ({
                  label: e.name.length > 12 ? e.name.slice(0, 10) + "…" : e.name,
                  value: e.oee || 0,
                  threshold: 80,
                  tone: (e.oee || 0) >= 80 ? "ok" : (e.oee || 0) >= 65 ? "modify" : "bad",
                })),
            },
          },
          {
            id: "current.material", label: "原材料", tone: "keep",
            detail: {
              description: isAuto ? "钢卷、铝板、焊丝、防腐涂料等主物料" : "标准件、外协零件、PLC 控制器",
              dataSource: "ERP 库存模块",
              method: "出入库扫码 + 月末盘存",
              owner: "仓储 + 采购",
            },
            chart: {
              kind: "stat", title: "本月主物料指标",
              items: [
                { label: "物料编码数", value: isAuto ? "186 项" : "412 项" },
                { label: "本月采购金额", value: isAuto ? "¥ 1,820 万" : "¥ 540 万", tone: "primary" },
                { label: "周转天数", value: isAuto ? "18 天" : "32 天" },
                { label: "呆滞物料占比", value: "3.8%", tone: "modify" },
              ],
            },
          },
          {
            id: "current.auxiliary", label: "辅料 · 耗材", tone: "modify",
            detail: {
              description: "冲压油 / 防锈油 / 焊丝 / 涂料添加剂 / 清洁剂 等十余类，目前账物不一致",
              dataSource: "钉钉手工台账",
              method: "手工填报 → 周报",
              owner: "工程组",
              risk: "辅料超耗 14%（涂装阿米巴）/ 缺录率 12%（杭州金鼎热处理）",
              mitigation: "见「改造分支 → 辅料扫码出库」",
            },
            chart: {
              kind: "bars", title: "本月主要辅料超耗 / 节约对比", unit: "%",
              data: allAux.map((a) => ({
                label: a.name,
                value: a.variance,
                threshold: 0,
                tone: a.variance > 10 ? "bad" : a.variance > 0 ? "modify" : "ok",
              })),
            },
          },
          {
            id: "current.systems", label: "已有信息化", tone: "keep",
            detail: {
              description: "金蝶 K/3 ERP + 钉钉 OA + Excel 工时台账",
              dataSource: "—",
              method: "—",
              owner: "IT-王",
            },
            chart: {
              kind: "table", title: "信息化系统现状",
              columns: ["系统", "状态", "覆盖度"],
              rows: [
                ["ERP（金蝶 K/3）", "已上线 5 年", "100%"],
                ["MES",              "未部署",      "0%"],
                ["WMS",              "未部署",      "0%"],
                ["IoT 数采",         "未部署",      "0%"],
                ["OA（钉钉）",       "已上线",      "100%"],
              ],
            },
          },
        ],
      },

      // ===== Remove =====
      {
        id: "remove", label: "要去除", tone: "remove",
        detail: { description: "在新体系中不再使用的旧流程 / 旧账套" },
        children: [
          {
            id: "remove.dept", label: "旧部门月度账", tone: "remove",
            detail: {
              description: "按部门归集的传统月度损益表",
              method: "P3 双轨并行期后停用，全面替换为阿米巴利润表",
              owner: "财务-周",
              risk: "停用过早会导致核算混乱",
              mitigation: "双轨并行至少 3 个月并对账误差 < 5% 后切换",
            },
          },
          {
            id: "remove.excel", label: "Excel 辅料台账", tone: "remove",
            detail: {
              description: "目前由工程组每周手工填的 Excel 辅料消耗台账",
              method: "扫码出库上线后停用",
              owner: "工程组",
              eta: "P2 末",
            },
          },
          {
            id: "remove.weekly", label: "线下周例会消耗", tone: "remove",
            detail: {
              description: "每周 2 小时的 全员车间例会改为阿米巴单元月度复盘",
              method: "改为阿米巴长 + 总部 月度损益对话",
              owner: "总部",
              eta: "P3 起",
            },
          },
        ],
      },

      // ===== Modify =====
      {
        id: "modify", label: "要改造", tone: "modify",
        detail: { description: "现有系统 / 流程 / 设备上的改造，复用基础设施" },
        children: [
          {
            id: "modify.erp", label: "ERP 加阿米巴维度", tone: "modify",
            detail: {
              description: "金蝶 K/3 中所有损益类科目加 阿米巴 自定义辅助核算字段",
              dataSource: "ERP API",
              method: "金蝶云星空开放平台 → 自定义辅助核算",
              owner: "IT-王 + 金蝶顾问",
              eta: "P1 末上线",
              cost: "约 ¥3 万开发费",
              risk: "字段映射不准会导致归集错误",
              mitigation: "首月手工对账，差异 > 2% 立即返工",
            },
            chart: {
              kind: "progress", title: "ERP 改造分项进度",
              items: [
                { label: "辅助核算字段设计", progress: 100, note: "已完成" },
                { label: "科目映射规则",     progress: 80,  note: "正在评审" },
                { label: "API 接口联调",     progress: 45,  note: "进行中" },
                { label: "首月对账试运行",   progress: 0,   note: "P2 启动" },
              ],
            },
          },
          {
            id: "modify.aux", label: "辅料出库改扫码", tone: "modify",
            detail: {
              description: "仓库辅料出库改为扫码强制约束，关联阿米巴 ID",
              dataSource: "新增辅料扫码系统 → ERP",
              method: "PDA / 手机扫码，3 秒内出库",
              owner: "仓储 + IT",
              eta: "P2",
              cost: "约 ¥6 万（PDA + 系统改造）",
              risk: "员工不熟悉新流程",
              mitigation: "上线前 2 周培训 + 现场陪伴 1 周",
            },
          },
          {
            id: "modify.meter", label: "电表分级改造", tone: "modify",
            detail: {
              description: "在现有总表基础上加车间分表 + 重耗能设备子表",
              dataSource: "智能电表 → IoT 网关",
              method: "MQTT 5 秒采样上传",
              owner: "设备部 + IT",
              eta: "P2",
              cost: "约 ¥4-15 万（按规模）",
              risk: "停电改造可能影响生产",
              mitigation: "周末分批改造，每次仅停一条产线",
            },
            chart: {
              kind: "bars", title: "电力计量覆盖度（现状 vs 目标）", unit: "%",
              data: [
                { label: "厂区总表",  value: 100, tone: "ok" },
                { label: "车间分表",  value: 25,  threshold: 100, tone: "modify" },
                { label: "产线子表",  value: 8,   threshold: 80,  tone: "bad" },
                { label: "设备子表",  value: 0,   threshold: 60,  tone: "new" },
              ],
            },
          },
        ],
      },

      // ===== New =====
      {
        id: "new", label: "要新建", tone: "new",
        detail: { description: "从零搭建的能力，决定阿米巴体系的精度上限" },
        children: [
          {
            id: "new.mes", label: "MES · 工时采集", tone: "new",
            detail: {
              description: "工序级工时实时上报，是制造类阿米巴成本核算的关键",
              dataSource: "MES → 数据库直连",
              method: "工位扫码刷卡 + 自动计时",
              owner: "IT + 工程",
              eta: "P2 中",
              cost: "约 ¥22-35 万",
              risk: "MES 厂商交付能力不稳定",
              mitigation: "样板客户走访 + 分期付款 30/40/30",
            },
          },
          {
            id: "new.iot", label: "IoT · 智能电表", tone: "new",
            detail: {
              description: "高耗能设备子表 + 网关",
              dataSource: "IoT 网关 → 时序数据库",
              method: "MQTT 实时 / 5 秒级采样",
              owner: "IT-王",
              eta: "P2",
              cost: "约 ¥15 万（网关 + 50 台子表）",
            },
          },
          {
            id: "new.transfer", label: "转让定价计算器", tone: "new",
            detail: {
              description: "按规则自动核算各阿米巴之间的月度内部转让收入",
              dataSource: "MES 工时 + ERP 费率 + 总部下达内部利润率",
              method: "Amoeba Copilot 内置规则引擎",
              owner: "财务 + 顾问",
              eta: "P2 末",
            },
          },
          {
            id: "new.waste", label: "浪费识别模型", tone: "new",
            detail: {
              description: "结合质量 / 设备 / 辅料异常数据，识别 7 类浪费并量化金额",
              dataSource: "MES + ERP + 质量系统",
              method: "规则 + 轻量统计学习",
              owner: "顾问 + 财务",
              eta: "P3",
            },
            chart: {
              kind: "bars", title: "本月 7 类浪费金额（汇总）", unit: "万元",
              data: Object.entries(wasteAgg).map(([label, value]) => ({
                label, value: Math.round(value * 10) / 10,
                tone: value > 5 ? "bad" : value > 2 ? "modify" : "neutral",
              })),
            },
          },
          {
            id: "new.dashboard", label: "阿米巴利润看板", tone: "new",
            detail: {
              description: "每个阿米巴月度独立 P&L，可下钻到单据级",
              dataSource: "归因引擎",
              method: "T+1 自动生成 + 月末对账",
              owner: "财务-周",
              eta: "P3 中",
            },
          },
        ],
      },

      // ===== Rules =====
      {
        id: "rules", label: "核算规则", tone: "rule",
        detail: { description: "规则的明确性 = 阿米巴体系的公平性。规则由总部 + 阿米巴长协商冻结" },
        children: [
          {
            id: "rules.transfer", label: "内部转让定价公式", tone: "rule",
            detail: {
              description: "转让价 = 标准工时成本 × (1 + 内部利润率%)",
              owner: "总部 + 阿米巴长协商",
              method: "季度核定，期间冻结",
            },
            chart: {
              kind: "formula",
              title: "公式",
              formula: "转让价 = 标准工时成本 × (1 + 内部利润率%)",
              example: "冲压 → 营销：\n  28.5 元/h × (1 + 12%) = 31.92 元/h\n  月度销量 380 工时 → 转让收入 12.13 万元",
            },
          },
          {
            id: "rules.equipment", label: "设备内部租赁", tone: "rule",
            detail: {
              description: "设备工时单价 = (月折旧 + 月均维修 + 备件储备金) / 月度可用工时",
              owner: "财务 + 设备部",
              method: "年度核定单价",
            },
            chart: {
              kind: "formula",
              title: "公式",
              formula: "设备工时单价 = (月折旧 + 月均维修 + 备件储备金) / 月度可用工时",
              example: "200T 高速冲床：\n  (3.5 + 0.6 + 0.4) 万 / 165 h = 28.8 元/h\n  本月使用 612 h → 计入 17.6 万元",
            },
          },
          {
            id: "rules.energy", label: "能耗三级计量", tone: "rule",
            detail: {
              description: "高耗能 → 实物计量；中耗能 → 工时分摊；低耗能 → 面积分摊",
              owner: "财务 + IT",
              method: "月度结算",
            },
          },
          {
            id: "rules.auxiliary", label: "辅料定额消耗法", tone: "rule",
            detail: {
              description: "标准辅料成本 = Σ(产量 × 产品级定额单耗 × 辅料单价)；超额阿米巴承担",
              owner: "工程 + 班组长",
              method: "每季度调整定额库",
            },
          },
          {
            id: "rules.waste", label: "浪费成本核算", tone: "rule",
            detail: {
              description: "浪费 = 不良 + 返工 × 工时单价 + 超耗 + 空转电耗 + 客诉",
              owner: "财务 + 顾问",
              method: "月度",
            },
          },
        ],
      },

      // ===== Steps =====
      {
        id: "steps", label: "实施步骤", tone: "ok",
        detail: { description: "按路径分阶段推进，避免一次性推翻" },
        children: (plan?.milestones || []).map((m) => ({
          id: "step." + m.phase,
          label: `${m.phase} · ${m.name}`,
          tone: (m.status === "done" ? "ok" : m.status === "in_progress" ? "primary" : m.status === "delayed" ? "bad" : "neutral") as RoadmapTone,
          detail: {
            description: m.deliverables.join("；"),
            owner: m.owner,
            eta: `${m.start} → ${m.end} · ${m.progress}%`,
          },
          chart: {
            kind: "progress" as const,
            title: `${m.phase} · ${m.name} 交付物进度`,
            items: m.deliverables.map((d) => ({
              label: d,
              progress: m.status === "done" ? 100 : m.status === "in_progress" ? Math.max(20, m.progress) : 0,
              note: m.status === "delayed" ? "延期" : undefined,
            })),
          },
        })),
      },

      // ===== Risks =====
      {
        id: "risks", label: "风险管控", tone: "warn",
        detail: { description: "高发概率 + 高影响的风险需要重点治理" },
        children: (plan?.risks || []).map((r, i) => ({
          id: "risk." + i,
          label: r.title,
          tone: (r.level === "high" ? "bad" : r.level === "medium" ? "warn" : "neutral") as RoadmapTone,
          detail: {
            description: r.mitigation,
            owner: r.owner,
            risk: `概率 ${r.probability}% / 影响 ${r.impact}% · ${r.level === "high" ? "高" : r.level === "medium" ? "中" : "低"}风险`,
          },
          chart: {
            kind: "stat" as const,
            title: "风险特征",
            items: [
              { label: "等级", value: r.level === "high" ? "高" : r.level === "medium" ? "中" : "低",
                tone: r.level === "high" ? "bad" : r.level === "medium" ? "warn" : "neutral" },
              { label: "发生概率", value: `${r.probability}%`, tone: r.probability >= 60 ? "bad" : "modify" },
              { label: "影响程度", value: `${r.impact}%`,       tone: r.impact >= 60 ? "bad" : "modify" },
              { label: "风险值",   value: `${Math.round(r.probability * r.impact / 100)}`, tone: "primary" },
            ],
          },
        })),
      },
    ],
  };
}

// =====================================================================
// Design engine: per-enterprise design (amiba cut + transfer pricing + KPI)
// =====================================================================

export type AmibaCategory = "strategy" | "sales" | "manufacturing" | "support" | "function";

export const CATEGORY_META: Record<AmibaCategory, { label: string; color: string }> = {
  strategy:      { label: "战略阿米巴", color: "#2d2a8e" },
  sales:         { label: "营销 / 销售阿米巴", color: "#16a34a" },
  manufacturing: { label: "制造 / 项目阿米巴", color: "#4a90d9" },
  support:       { label: "支持阿米巴", color: "#d97706" },
  function:      { label: "职能阿米巴", color: "#a855f7" },
};

export interface DesignAmibaUnit {
  name: string;
  leader: string;
  category: AmibaCategory;
  /** Internal pricing model description */
  pricingModel: string;
  /** Income type */
  incomeType: string;
  /** Cost composition */
  costComposition: string[];
  /** Core KPIs */
  kpis: Array<{ label: string; target: string; actual?: string; tone?: "ok" | "warn" | "bad" | "neutral" }>;
}

export interface TransferPriceCell {
  from: string;
  to: string;
  formula: string;        // displayed in tooltip
  price: string;          // displayed in cell
}

export interface EnterpriseDesign {
  amibas: DesignAmibaUnit[];
  transferPrices: TransferPriceCell[];
}

/** Heuristic mapping from amiba name to category */
function classifyAmiba(name: string): AmibaCategory {
  const n = name.toLowerCase();
  if (n.includes("销售") || n.includes("营销") || n.includes("客户")) return "sales";
  if (n.includes("品质") || n.includes("工程") || n.includes("模具") || n.includes("设计")) return "support";
  if (n.includes("财务") || n.includes("hr") || n.includes("it") || n.includes("采购") || n.includes("职能") || n.includes("调试")) return "function";
  if (n.includes("项目")) return "manufacturing";
  return "manufacturing";
}

function defaultKpisForCategory(cat: AmibaCategory, baseRevenue: number, profitMargin: number): DesignAmibaUnit["kpis"] {
  if (cat === "sales") return [
    { label: "签约金额", target: `${baseRevenue} 万`, actual: `${baseRevenue} 万`, tone: "ok" },
    { label: "毛利率",   target: "≥ 20%",            actual: `${profitMargin.toFixed(1)}%`, tone: profitMargin >= 20 ? "ok" : "warn" },
    { label: "中标率",   target: "≥ 35%",            actual: "42%", tone: "ok" },
  ];
  if (cat === "manufacturing") return [
    { label: "单位工时产值", target: "≥ 1.40 千元/h", actual: "1.56 千元/h", tone: "ok" },
    { label: "OEE",          target: "≥ 80%",         actual: "84%", tone: "ok" },
    { label: "利润率",       target: "≥ 15%",         actual: `${profitMargin.toFixed(1)}%`, tone: profitMargin >= 15 ? "ok" : "warn" },
    { label: "返工率",       target: "≤ 1.0%",        actual: "0.6%", tone: "ok" },
  ];
  if (cat === "support") return [
    { label: "服务收入",   target: `${baseRevenue} 万`,  actual: `${baseRevenue} 万`,  tone: "neutral" },
    { label: "客诉响应时长", target: "≤ 4 h",            actual: "2.1 h", tone: "ok" },
    { label: "项目准时率", target: "≥ 90%",              actual: "96%", tone: "ok" },
  ];
  if (cat === "function") return [
    { label: "服务收入",     target: `${baseRevenue} 万`, actual: `${baseRevenue} 万`, tone: "neutral" },
    { label: "内部满意度",   target: "≥ 4.0 / 5",          actual: "4.3", tone: "ok" },
  ];
  return [];
}

function getEnterpriseDesign(slug: string): EnterpriseDesign | null {
  const ent = DEMO_ENTERPRISES[slug];
  if (!ent || ent.amibas.length === 0) return null;

  const amibas: DesignAmibaUnit[] = ent.amibas.map((a) => {
    const cat = classifyAmiba(a.name);
    return {
      name: a.name,
      leader: a.leader,
      category: cat,
      pricingModel:
        cat === "manufacturing" ? "工时单价 × (1 + 内部利润率)"
        : cat === "sales" ? "外部订单营收 - 内部转让价采购"
        : cat === "support" ? "按产量 / 项目收取服务费"
        : "按服务范围分摊",
      incomeType:
        cat === "manufacturing" ? "内部转让收入" :
        cat === "sales" ? "主机厂订单" :
        cat === "support" ? "内部服务费 + 项目服务费" :
        "分摊收入",
      costComposition:
        cat === "manufacturing" ? ["人工", "直接物料", "辅料", "能耗", "设备折旧", "其他分摊"] :
        cat === "sales" ? ["人工", "差旅", "样件物料"] :
        cat === "support" ? ["人工", "检测/试验设备", "差旅"] :
        ["人工", "办公费用"],
      kpis: defaultKpisForCategory(cat, a.revenue, a.profitMargin),
    };
  });

  // Transfer prices: every manufacturing → sales link, support → all
  const transferPrices: TransferPriceCell[] = [];
  const sales = amibas.filter((a) => a.category === "sales");
  const mfgs = amibas.filter((a) => a.category === "manufacturing");
  const supports = amibas.filter((a) => a.category === "support");

  // mfg → sales: standard-hour-based
  mfgs.forEach((m) => {
    sales.forEach((s) => {
      transferPrices.push({
        from: m.name, to: s.name,
        formula: "标准工时 × (1 + 12%)",
        price: m.name.includes("冲压") ? "31.92 元/h"
             : m.name.includes("焊接") ? "42.50 元/h"
             : m.name.includes("涂装") ? "28.30 元/h"
             : m.name.includes("总装") ? "38.80 元/h"
             : m.name.includes("项目") ? "186 元/h"
             : m.name.includes("设计") ? "高 1200 / 中 800 / 初 500 元/天"
             : m.name.includes("处理") ? "渗碳 18500 元/炉"
             : "按工时核算",
      });
    });
  });
  // mfg → mfg internal (e.g. 模具设计 → 项目)
  if (sales.length === 0 && mfgs.length > 1) {
    transferPrices.push({
      from: mfgs[0].name, to: mfgs[1].name,
      formula: "工时单价 × (1 + 内部利润率)",
      price: "186 元/h",
    });
  }
  // support → all amibas: service fee
  supports.forEach((sp) => {
    amibas.forEach((a) => {
      if (a.name === sp.name) return;
      if (a.category === "function") return;
      transferPrices.push({
        from: sp.name, to: a.name,
        formula: sp.name.includes("品质") ? "按产量 × 0.15 元/件"
              : sp.name.includes("模具") ? "项目计价"
              : "服务费 = 工时 × 单价",
        price: sp.name.includes("品质") ? "0.15 元/件"
             : sp.name.includes("模具") ? "议价"
             : "按工时",
      });
    });
  });

  return { amibas, transferPrices };
}

export { getEnterpriseDesign };

// =====================================================================
// Alerts
// =====================================================================

export type Severity = "danger" | "warning" | "success" | "info";

export interface DemoAlert {
  slug: string;
  severity: Severity;
  title: string;
  oneLine: string;
  enterpriseSlug?: string;
  enterpriseName?: string;
  raisedAt: string;
  ageHours: number;
  // Timeline of events leading to the alert
  timeline: Array<{
    at: string;
    kind: "info" | "warn" | "trigger" | "action";
    title: string;
    desc?: string;
  }>;
  // Trend data showing the metric that triggered the alert
  trend: Array<{ x: string; value: number; threshold?: number }>;
  trendLabel: string;
  trendUnit: string;
  // Impact analysis
  impact: Array<{ area: string; severity: number /*0-100*/; note: string }>;
  // Recommended actions
  actions: Array<{ priority: "high" | "medium" | "low"; title: string; owner?: string; due?: string }>;
  // Key facts
  facts: { label: string; value: string }[];
}

export const DEMO_ALERTS: Record<string, DemoAlert> = {
  "suzhou-zhiwei-milestone": {
    slug: "suzhou-zhiwei-milestone",
    severity: "danger",
    title: "里程碑延误：信息化改造延期 5 周",
    oneLine: "已超红色预警阈值（4 周），建议立即拉对齐会议",
    enterpriseSlug: "suzhou-zhiwei",
    enterpriseName: "苏州智微非标设备",
    raisedAt: "今日 14:32",
    ageHours: 26,
    timeline: [
      { at: "3 月初", kind: "info", title: "MES + PLM 集成项目立项", desc: "原计划 6 月底完成 UAT" },
      { at: "4 月 15 日", kind: "info", title: "需求评审完成，进入开发阶段" },
      { at: "5 月 8 日", kind: "warn", title: "第一次延期信号", desc: "PLM 厂商人员变更，进度 - 1.5 周" },
      { at: "5 月 22 日", kind: "warn", title: "第二次延期信号", desc: "客户变更需求注入，重新设计 2 个模块" },
      { at: "今日 14:32", kind: "trigger", title: "里程碑里程碑延误超 4 周触发红色预警", desc: "智能体自动升级至 P0" },
      { at: "待办", kind: "action", title: "建议：今晚 19:00 召开项目对齐会", desc: "顾问 + 老板 + 项目王 + PLM 厂商 PM" },
    ],
    trend: [
      { x: "1 月", value: 0 },
      { x: "2 月", value: 0 },
      { x: "3 月", value: 0 },
      { x: "4 月", value: 5 },
      { x: "5 月初", value: 14, threshold: 14 },
      { x: "5 月中", value: 24, threshold: 14 },
      { x: "5 月底", value: 35, threshold: 14 },
    ],
    trendLabel: "累计延误天数",
    trendUnit: "天",
    impact: [
      { area: "项目阿米巴-A", severity: 85, note: "依赖 MES 工时数据，无法准确核算" },
      { area: "项目阿米巴-B", severity: 60, note: "同样受影响，但项目交付期较远" },
      { area: "销售-新能源组", severity: 45, note: "客户问询交付节奏" },
      { area: "总部财务", severity: 70, note: "Q3 阿米巴双轨并行无法启动" },
      { area: "顾问陪跑节奏", severity: 55, note: "9 月里程碑可能联动后延" },
    ],
    actions: [
      { priority: "high", title: "立即拉对齐会，重新评估关键路径", owner: "项目王 + 顾问", due: "今晚 19:00" },
      { priority: "high", title: "MES 与 PLM 解耦，MES 优先上线", owner: "IT 负责人", due: "本周内决策" },
      { priority: "medium", title: "起草客户变更补偿协议草案", owner: "销售负责人", due: "下周一" },
      { priority: "medium", title: "通知财务调整 Q3 双轨并行计划", owner: "财务负责人", due: "本周五" },
      { priority: "low", title: "更新顾问陪跑里程碑甘特图", owner: "顾问", due: "下周二" },
    ],
    facts: [
      { label: "预警级别", value: "P0 红色" },
      { label: "触发规则", value: "里程碑延误 > 28 天" },
      { label: "当前延误", value: "35 天" },
      { label: "建议升级", value: "已通知老板" },
      { label: "类似历史", value: "近 12 月行业 3 起" },
    ],
  },

  "hangzhou-jinding-data-quality": {
    slug: "hangzhou-jinding-data-quality",
    severity: "warning",
    title: "数据质量预警：辅料消耗台账上月缺录 12%",
    oneLine: "影响热处理阿米巴成本归集精度，建议技改",
    enterpriseSlug: "hangzhou-jinding",
    enterpriseName: "杭州金鼎模具",
    raisedAt: "昨日 18:05",
    ageHours: 18,
    timeline: [
      { at: "上月初", kind: "info", title: "辅料台账缺录率 3.8%（正常）" },
      { at: "上月中", kind: "info", title: "缺录率上升至 6.5%" },
      { at: "上月底", kind: "warn", title: "缺录率突破 10%，进入观察" },
      { at: "本月 1 日", kind: "trigger", title: "本月初统计：缺录率 12%，触发黄色预警" },
      { at: "今日上午", kind: "action", title: "智能体已生成 3 条改进建议" },
    ],
    trend: [
      { x: "1 月", value: 3.2, threshold: 8 },
      { x: "2 月", value: 3.5, threshold: 8 },
      { x: "3 月", value: 4.1, threshold: 8 },
      { x: "4 月", value: 5.8, threshold: 8 },
      { x: "5 月", value: 9.3, threshold: 8 },
      { x: "上月", value: 12.0, threshold: 8 },
    ],
    trendLabel: "台账缺录率",
    trendUnit: "%",
    impact: [
      { area: "热处理阿米巴", severity: 75, note: "成本归集偏差 ±8%" },
      { area: "精加工阿米巴", severity: 35, note: "少量辅料共用，影响有限" },
      { area: "财务月结", severity: 50, note: "需手工调账，月结 +1 工日" },
      { area: "审计合规", severity: 30, note: "暂未影响审计意见" },
    ],
    actions: [
      { priority: "high", title: "辅料出库改为扫码强制约束", owner: "IT + 仓库", due: "下周三" },
      { priority: "high", title: "热处理工艺辅料定额库建立", owner: "工程部", due: "月底前" },
      { priority: "medium", title: "上月成本数据回溯修正", owner: "财务部", due: "本月 25 日" },
      { priority: "low", title: "增加月度数据质量自动巡检", owner: "IT", due: "下个月" },
    ],
    facts: [
      { label: "预警级别", value: "P1 黄色" },
      { label: "触发规则", value: "缺录率 > 8%" },
      { label: "当前缺录率", value: "12.0%" },
      { label: "趋势", value: "连续 4 月上升" },
      { label: "影响金额估算", value: "≈ ¥18 万 / 月" },
    ],
  },

  "ningbo-hengzhan-outperform": {
    slug: "ningbo-hengzhan-outperform",
    severity: "success",
    title: "冲压阿米巴单位工时产值高于预期 18%",
    oneLine: "已超目标线，建议总结经验并向焊接阿米巴推广",
    enterpriseSlug: "ningbo-hengzhan",
    enterpriseName: "宁波恒展精密冲压",
    raisedAt: "今日 09:42",
    ageHours: 5,
    timeline: [
      { at: "本季初", kind: "info", title: "冲压阿米巴单工时产值目标 1.32 千元" },
      { at: "上月", kind: "info", title: "实际 1.45 千元，达成 110%" },
      { at: "本月初", kind: "info", title: "实际 1.49 千元，达成 113%" },
      { at: "今日上午", kind: "trigger", title: "本月预计 1.56 千元，超目标 18%（绿色亮点）" },
      { at: "智能体建议", kind: "action", title: "拆解经验并迁移到焊接阿米巴" },
    ],
    trend: [
      { x: "去年 12 月", value: 1.28, threshold: 1.32 },
      { x: "1 月", value: 1.35, threshold: 1.32 },
      { x: "2 月", value: 1.29, threshold: 1.32 },
      { x: "3 月", value: 1.43, threshold: 1.32 },
      { x: "4 月", value: 1.49, threshold: 1.32 },
      { x: "5 月", value: 1.56, threshold: 1.32 },
    ],
    trendLabel: "单工时产值",
    trendUnit: "千元",
    impact: [
      { area: "冲压阿米巴利润", severity: 80, note: "月度利润同比 +24%" },
      { area: "焊接阿米巴（可迁移）", severity: 60, note: "工序相似，可借鉴换线优化" },
      { area: "员工分红", severity: 70, note: "本月分红池预计 +13%" },
      { area: "客户报价", severity: 25, note: "暂不调整对外报价" },
    ],
    actions: [
      { priority: "high", title: "复盘冲压阿米巴换线优化经验", owner: "工程 + 班组长", due: "本周内" },
      { priority: "high", title: "组织焊接阿米巴现场学习", owner: "焊接班长", due: "下周二" },
      { priority: "medium", title: "将经验录入企业知识库", owner: "顾问", due: "下周五" },
      { priority: "low", title: "考虑将该指标作为分红计算因子", owner: "财务 + 总部", due: "Q3 评估" },
    ],
    facts: [
      { label: "预警级别", value: "绿色亮点" },
      { label: "触发规则", value: "实际 > 目标 110%" },
      { label: "当前达成率", value: "118%" },
      { label: "可迁移单元", value: "焊接 / 总装" },
    ],
  },

  "benchmark-updated": {
    slug: "benchmark-updated",
    severity: "info",
    title: "行业 Benchmark 已更新",
    oneLine: "汽车零部件 Q2 数据新增 7 家样本，分位线已重算",
    raisedAt: "今日 06:00",
    ageHours: 8,
    timeline: [
      { at: "Q1 末", kind: "info", title: "汽车零部件 benchmark 样本量 5 家" },
      { at: "4 月", kind: "info", title: "新增 2 家样本接入" },
      { at: "5 月", kind: "info", title: "新增 5 家样本接入" },
      { at: "今日凌晨", kind: "trigger", title: "总样本达 12 家，自动重算分位线" },
      { at: "完成", kind: "action", title: "P25 / P50 / P75 已更新到画像页" },
    ],
    trend: [
      { x: "Q1", value: 5 },
      { x: "4 月", value: 7 },
      { x: "5 月", value: 12 },
    ],
    trendLabel: "行业累计样本数",
    trendUnit: "家",
    impact: [
      { area: "宁波恒展", severity: 40, note: "百分位 67 → 67（无变化）" },
      { area: "苏州智微", severity: 35, note: "百分位 41 → 39（轻微下移）" },
      { area: "杭州金鼎", severity: 30, note: "百分位 87 → 89（上移）" },
      { area: "其他在管企业", severity: 25, note: "整体波动 ±3" },
    ],
    actions: [
      { priority: "low", title: "通知顾问检查百分位变化幅度大的企业", owner: "顾问负责人", due: "本周内" },
      { priority: "low", title: "在月报中说明分位线更新", owner: "运营", due: "下周月报" },
    ],
    facts: [
      { label: "预警级别", value: "信息" },
      { label: "更新范围", value: "汽车零部件" },
      { label: "本次新增样本", value: "7 家" },
      { label: "总样本量", value: "12 家" },
    ],
  },
};
