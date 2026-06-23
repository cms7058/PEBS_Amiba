import type { ConnectorSource, Factor } from "./factory-types";

// 四个子工具的元信息 + 注册页地址。
// 「接入工具」时，阿米巴生成连接器令牌，并跳转到该工具的注册页，
// 把 amiba_endpoint / amiba_token / enterprise_id / source 作为查询参数带过去，
// 工具侧注册页读取后写入自身配置即完成插拔接入（详见设计方案 §9.6）。

export interface ToolDef {
  id: Exclude<ConnectorSource, "manual">;
  name: string;
  tagline: string;
  factors: Factor[];
  /** 工具注册页地址（可被环境变量覆盖，便于不同部署） */
  registerUrl: string;
  /** 工具自身能力点（用于界面说明） */
  capabilities: string[];
  accent: string; // tailwind 色调 key，用于卡片
  /** 支持「按产品建项目」工作台：阿米巴侧按产品(订单/零件号)打开该工具工作台并接收回填 */
  productWorkbench?: boolean;
}

// 各工具注册页默认地址，可用环境变量覆盖（NEXT_PUBLIC_ 前缀才能在客户端读取）。
const WORKTIME_URL = process.env.NEXT_PUBLIC_TOOL_WORKTIME_URL || "http://localhost:8000/register";
const APS_URL = process.env.NEXT_PUBLIC_TOOL_APS_URL || "http://localhost:8787/register";
const BOM_URL = process.env.NEXT_PUBLIC_TOOL_BOM_URL || "http://localhost:3000/register";
const LEAN_URL = process.env.NEXT_PUBLIC_TOOL_LEAN_URL || "http://localhost:5173/register";
const NESTING_URL = process.env.NEXT_PUBLIC_TOOL_NESTING_URL || "http://localhost:9100/register";

export const TOOLS: ToolDef[] = [
  {
    id: "worktime",
    name: "PEBS Worktime · 视频工时",
    tagline: "固定机位视频自动切分工步、统计循环工时，无需上 MES 即可拿到现场实测工时",
    factors: ["man"],
    registerUrl: WORKTIME_URL,
    capabilities: ["工步切分", "循环工时", "工时负荷率", "PMTS 标准工时对比", "异常识别"],
    accent: "blue",
    productWorkbench: true,
  },
  {
    id: "aps",
    name: "PEBS APS · AI 排产",
    tagline: "有限产能排产、插单/故障重排、OEE 与产能瓶颈、排料利用率与库存联动",
    factors: ["machine", "material", "environment"],
    registerUrl: APS_URL,
    capabilities: ["有限产能排产", "插单重排", "OEE", "产能瓶颈", "排料利用率", "库存周转"],
    accent: "violet",
    productWorkbench: true,
  },
  {
    id: "bom",
    name: "PEBS BOM · 对话式 BOM",
    tagline: "3D/表格自动生成 BOM，G6 可视化，智能体实时操控；支持余料 BOM 与辅料定额",
    factors: ["material"],
    registerUrl: BOM_URL,
    capabilities: ["BOM 自动生成", "标准用量", "余料 BOM", "辅料定额", "G6 可视化"],
    accent: "emerald",
    productWorkbench: true,
  },
  {
    id: "lean",
    name: "PEBS LeanAI · 精益方法论",
    tagline: "对话式精益诊断、VSM/鱼骨/Pareto、8D/DMAIC 报告、RAG 知识库",
    factors: ["method", "environment"],
    registerUrl: LEAN_URL,
    capabilities: ["流程三性诊断", "VSM 价值流", "鱼骨/Pareto 根因", "8D/DMAIC 报告", "RAG 知识库"],
    accent: "amber",
    productWorkbench: true,
  },
  {
    id: "nesting",
    name: "Nesting Copilot · 排料套料",
    tagline: "板材/型材套料利用率分析与优化、共边共线、余料调用，利用率损失折算材料浪费成本",
    factors: ["material"],
    registerUrl: NESTING_URL,
    capabilities: ["套料利用率", "共边/共线", "余料再利用", "利用率损失成本"],
    accent: "emerald",
    productWorkbench: true,
  },
];

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

/** 构造跳转到工具注册页的完整 URL（带接入参数） */
export function buildRegisterRedirect(opts: {
  tool: ToolDef;
  amibaEndpoint: string;
  token: string;
  enterpriseId: string;
}): string {
  const u = new URL(opts.tool.registerUrl);
  u.searchParams.set("amiba_endpoint", opts.amibaEndpoint);
  u.searchParams.set("amiba_token", opts.token);
  u.searchParams.set("enterprise_id", opts.enterpriseId);
  u.searchParams.set("source", opts.tool.id);
  return u.toString();
}
