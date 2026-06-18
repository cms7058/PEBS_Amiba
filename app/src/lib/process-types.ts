import type { ConnectorSource, Factor } from "./factory-types";

// 分层流程模型（设计方案 §13）。OTD 节点可下钻为子流程（BPMN 泳道图，泳道=部门）；
// 子流程活动可再下钻；无子流程的活动即叶子，承载数据采集与成本归因。

/** 叶子成本科目项（P-c 用；P-a 先占位） */
export interface CostItem {
  key: string;
  factor: Factor;
  account: string;                 // 成本科目，如 "直接人工"
  capture: "tool" | "manual";      // 采集方式（接部署规则引擎）
  source?: ConnectorSource;        // 数据源 / manual
  rateKey?: string;                // 关联费率表
  planQty?: number;
  actualQty?: number;
}

/** 泳道 = 部门（部门来自设计引擎的组织架构；denormalize 名称/颜色/单元以便渲染与交接判定） */
export interface Lane {
  id: string;
  departmentId: string;            // 设计部门 id（或静态部门目录 id）
  name?: string;                   // 部门名（设计部门）
  color?: string;                  // 归属阿米巴单元颜色
  amibaUnitId?: string;            // 归属阿米巴单元 id（用于跨单元交接=转让价判定）
}

/** 输入/输出物条目；inherited=true 表示「上个节点的输出物」（继承），否则为「本节点新增」 */
export interface IOItem { name: string; inherited?: boolean }
/** 兼容历史：旧数据为纯字符串数组，新数据为 IOItem。读取统一用 ioName/ioInherited */
export type IORef = string | IOItem;
export function ioName(x: IORef): string { return typeof x === "string" ? x : x.name; }
export function ioInherited(x: IORef): boolean { return typeof x === "string" ? false : !!x.inherited; }

/** 子流程内的活动节点 */
export interface ProcessActivity {
  id: string;
  name: string;
  laneId: string;                  // 所在泳道（部门）
  seq: number;                     // 全局顺序（顺序流方向）
  inputs?: IORef[];                // 输入物（可多个；继承上节点输出 或 本节点新增）
  outputs?: IORef[];               // 输出物（可多个）
  subflowId?: string;              // 可继续下钻
  costItems?: CostItem[];          // 叶子成本（无子流程时）
}

export interface ProcessEdge {
  id: string;
  from: string;                    // activity id
  to: string;
}

export interface Subflow {
  id: string;
  enterpriseId: string;
  ownerNodeId: string;             // 归属的上层节点（OTD 节点或父活动）id
  ownerLabel?: string;             // 上层节点名称（展示用）
  lanes: Lane[];
  activities: ProcessActivity[];
  edges: ProcessEdge[];
  createdAt: string;
  updatedAt: string;
}
