"use client";

// 流程图节点样式配置（可在页面上调整，存 localStorage）。SubflowSwimlane 据此渲染。
// 参照 X6 BPMN 案例的节点形式，并把"形式与内容"开放为可配置。

export interface FlowStyle {
  shape: "rounded" | "rect";       // 节点形状
  accent: "amiba" | "fixed";       // 取色：按阿米巴 / 固定主题色
  fill: string;                    // accent=fixed 时的填充
  stroke: string;                  // accent=fixed 时的描边
  showSeq: boolean;                // 显示序号
  showName: boolean;               // 显示活动名
  showDept: boolean;               // 节点上显示部门短名
  showEvents: boolean;             // 显示开始/结束事件
  dashCrossLane: boolean;          // 跨泳道连线虚线（BPMN 习惯）
  nodeW: number;
  nodeH: number;
  laneH: number;
}

export const DEFAULT_FLOW_STYLE: FlowStyle = {
  shape: "rounded",
  accent: "amiba",
  fill: "#EFF4FF",
  stroke: "#5F95FF",
  showSeq: true,
  showName: true,
  showDept: false,
  showEvents: true,
  dashCrossLane: true,
  nodeW: 168,
  nodeH: 56,
  laneH: 100,
};

const KEY = "amiba.flow.style.v1";

export function loadFlowStyle(): FlowStyle {
  if (typeof window === "undefined") return DEFAULT_FLOW_STYLE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_FLOW_STYLE;
    return { ...DEFAULT_FLOW_STYLE, ...(JSON.parse(raw) as Partial<FlowStyle>) };
  } catch {
    return DEFAULT_FLOW_STYLE;
  }
}

export function saveFlowStyle(s: FlowStyle) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}
