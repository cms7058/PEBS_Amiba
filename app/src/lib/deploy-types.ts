// 部署引擎：阿米巴落地改进任务（甘特 + 责任人 + 状态）。客户端/服务端共用，不依赖 fs。

export type TaskStatus = "todo" | "doing" | "done";

export interface DeployTask {
  id: string;
  enterpriseId: string;
  title: string;
  detail?: string;
  owner?: string;          // 责任人/部门
  dimension?: string;      // 关联维度（人/机/料/法/测/成本/流程…）
  nodeId?: string;
  nodeName?: string;       // 关联 OTD 节点（可选）
  start: string;           // YYYY-MM-DD
  end: string;             // YYYY-MM-DD
  status: TaskStatus;
  impact?: string;         // 预期收益
  order: number;
  // 细化改进点（由 improve-plan 生成）
  factor?: string;         // labor/material/method/quality
  current?: string;        // 现状值
  target?: string;         // 目标值
  saving?: number;         // 预计回收（元）
  difficulty?: number;     // 1-3
  measures?: string[];     // 具体改进意见（培训/系统模块/材料精算…）
}

export const STATUS_LABEL: Record<TaskStatus, string> = { todo: "待开始", doing: "进行中", done: "已完成" };
export const STATUS_COLOR: Record<TaskStatus, string> = { todo: "#94a3b8", doing: "#4a90d9", done: "#16a34a" };

export const dayMs = 86400000;
export function parseDate(s: string): number { return new Date(s + "T00:00:00").getTime(); }
export function fmtDate(t: number): string { return new Date(t).toISOString().slice(0, 10); }
export function addDays(s: string, days: number): string { return fmtDate(parseDate(s) + days * dayMs); }
export function todayStr(): string { return new Date().toISOString().slice(0, 10); }
export function taskDays(t: DeployTask): number { return Math.max(1, Math.round((parseDate(t.end) - parseDate(t.start)) / dayMs) + 1); }
