"use client";

import { useEffect, useRef } from "react";
import { Graph, type Node } from "@antv/x6";
import { attachZoomPan } from "../../lib/graph-interactions";
import { getDepartment, amibaOfDepartment, handoffLevel } from "../../lib/departments";
import type { Lane, ProcessActivity } from "../../lib/process-types";
import { DEFAULT_FLOW_STYLE, type FlowStyle } from "../../lib/flow-style";

// 子流程 BPMN 泳道图 —— 参照 X6 官方 BPMN 案例：
// 注册 lane(带标题栏的容器，活动作为其子节点)、activity、start/end event、bpmn-edge(orth 路由)；
// 跨泳道(部门)的连线虚线高亮，并按 transfer(跨阿米巴)/collab(同阿米巴) 着色。

const HEADER_W = 132;

let registered = false;
function registerOnce() {
  if (registered) return;
  registered = true;

  Graph.registerNode("bpmn-lane", {
    inherit: "rect",
    markup: [
      { tagName: "rect", selector: "body" },
      { tagName: "rect", selector: "name-rect" },
      { tagName: "rect", selector: "amiba-bar" },
      { tagName: "text", selector: "name-text" },
      { tagName: "text", selector: "amiba-text" },
    ],
    attrs: {
      body: { fill: "#FFFFFF", stroke: "#5F95FF", strokeWidth: 1 },
      "name-rect": { width: HEADER_W, refHeight: "100%", fill: "#F0F5FF", stroke: "#5F95FF", strokeWidth: 1 },
      "amiba-bar": { width: 5, refHeight: "100%", x: 0, y: 0, fill: "#5F95FF" },
      "name-text": { refX: 18, refY: "46%", textAnchor: "start", textVerticalAnchor: "middle", fontWeight: "bold", fill: "#262626", fontSize: 13 },
      "amiba-text": { refX: 18, refY: "62%", textAnchor: "start", textVerticalAnchor: "middle", fill: "#5F95FF", fontSize: 11 },
    },
  }, true);

  Graph.registerNode("bpmn-activity", {
    inherit: "rect",
    markup: [
      { tagName: "rect", selector: "body" },
      { tagName: "rect", selector: "bar" },
      { tagName: "circle", selector: "seqBg" },
      { tagName: "text", selector: "seq" },
      { tagName: "text", selector: "label" },
      { tagName: "text", selector: "dept" },
      { tagName: "rect", selector: "subMark" },
      { tagName: "text", selector: "subPlus" },
    ],
    attrs: {
      body: { rx: 6, ry: 6, stroke: "#5F95FF", fill: "#EFF4FF", strokeWidth: 1 },
      bar: { x: 0, y: 0, refWidth: "100%", height: 4, rx: 2, ry: 2, fill: "#5F95FF" },
      seqBg: { r: 10, fill: "#5F95FF", fillOpacity: 0.14, stroke: "#5F95FF", strokeWidth: 1 },
      seq: { ref: "seqBg", refX: "50%", refY: "50%", textAnchor: "middle", textVerticalAnchor: "middle", fontSize: 11, fontWeight: 700, fill: "#5F95FF", fontFamily: "ui-monospace, monospace" },
      label: { refX: "50%", refY: "44%", textAnchor: "middle", textVerticalAnchor: "middle", fontSize: 13, fontWeight: 600, fill: "#262626" },
      dept: { refX: "50%", refY: "78%", textAnchor: "middle", textVerticalAnchor: "middle", fontSize: 10.5, fill: "#8C8C8C" },
      // BPMN 子流程标记（⊞）：底部右角，含下级子流程的活动显示（几何在 addNode 时按节点尺寸设置）
      subMark: { rx: 3, ry: 3, fill: "#2d2a8e", stroke: "#ffffff", strokeWidth: 1.5, opacity: 0 },
      subPlus: { text: "+", fontWeight: 800, fill: "#ffffff", textAnchor: "middle", textVerticalAnchor: "middle", opacity: 0, pointerEvents: "none" },
    },
  }, true);

  Graph.registerNode("bpmn-start", {
    inherit: "circle",
    attrs: { body: { strokeWidth: 2, stroke: "#52C41A", fill: "#FFF" }, label: { text: "开始", fontSize: 11, fill: "#52C41A" } },
  }, true);
  Graph.registerNode("bpmn-end", {
    inherit: "circle",
    attrs: { body: { strokeWidth: 4, stroke: "#FF4D4F", fill: "#FFF" }, label: { text: "交付", fontSize: 11, fill: "#FF4D4F" } },
  }, true);

  Graph.registerEdge("bpmn-edge", {
    inherit: "edge",
    attrs: { line: { stroke: "#A2B1C3", strokeWidth: 2, targetMarker: "classic" } },
  }, true);
}

export function SubflowSwimlane({
  lanes, activities, style = DEFAULT_FLOW_STYLE, selectedId, onSelect, subflowIds, height = 440,
}: {
  lanes: Lane[];
  activities: ProcessActivity[];
  style?: FlowStyle;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  subflowIds?: string[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const subSet = new Set(subflowIds || []);

  useEffect(() => {
    if (!ref.current) return;
    registerOnce();
    const graph = new Graph({
      container: ref.current,
      autoResize: true,
      panning: { enabled: true, eventTypes: ["rightMouseDown"] },
      mousewheel: { enabled: false },
      background: { color: "transparent" },
      interacting: { nodeMovable: false },
    });

    const LANE_H = style.laneH, NW = style.nodeW, NH = style.nodeH;
    const COL_W = NW + 56;
    const ordered = activities.slice().sort((a, b) => a.seq - b.seq);
    const laneIndex = new Map(lanes.map((l, i) => [l.id, i]));
    const nCols = Math.max(1, ordered.length);
    const startX = HEADER_W + (style.showEvents ? 84 : 28);
    const totalW = startX + nCols * COL_W + (style.showEvents ? 64 : 24);
    const laneById = new Map(lanes.map((l) => [l.id, l]));
    // 部门信息优先取设计引擎写入的 lane.name/color/amibaUnitId，回退到静态目录
    const laneName = (laneId: string) => { const l = laneById.get(laneId); return l?.name || getDepartment(l?.departmentId)?.name || "未指定部门"; };
    const laneColor = (laneId: string) => { const l = laneById.get(laneId); return l?.color || amibaOfDepartment(l?.departmentId)?.color || "#5F95FF"; };
    const laneUnit = (laneId: string) => { const l = laneById.get(laneId); return l?.amibaUnitId || amibaOfDepartment(l?.departmentId)?.id; };
    const laneAmibaLabel = (laneId: string) => { const l = laneById.get(laneId); const amb = amibaOfDepartment(l?.departmentId); return l?.amibaUnitId ? "阿米巴单元" : amb ? amb.short + "阿米巴" : ""; };
    const laneNodeOf = new Map<string, Node>();

    // 泳道（容器）
    lanes.forEach((lane, li) => {
      const n = graph.addNode({
        shape: "bpmn-lane", x: 0, y: li * LANE_H, width: totalW, height: LANE_H, zIndex: 1,
        attrs: {
          "name-text": { text: laneName(lane.id) },
          "amiba-text": { text: laneAmibaLabel(lane.id) },
          "amiba-bar": { fill: laneColor(lane.id) },
        },
        data: { lane: true },
      });
      laneNodeOf.set(lane.id, n);
    });

    function nodeFill(amb?: { color: string }) {
      return style.accent === "amiba" && amb ? "#ffffff" : style.fill;
    }
    function nodeStroke(amb?: { color: string }) {
      return style.accent === "amiba" && amb ? amb.color : style.stroke;
    }

    // 活动节点（作为所属泳道的子节点）
    ordered.forEach((act, col) => {
      const li = laneIndex.get(act.laneId) ?? 0;
      const color = laneColor(act.laneId);
      const amb = { color };
      const x = startX + col * COL_W;
      const y = li * LANE_H + (LANE_H - NH) / 2;
      const node = graph.addNode({
        id: act.id, shape: "bpmn-activity", x, y, width: NW, height: NH, zIndex: 3,
        attrs: {
          body: { fill: nodeFill(amb), stroke: selectedId === act.id ? "#2d2a8e" : nodeStroke(amb), strokeWidth: selectedId === act.id ? 2.5 : 1, rx: style.shape === "rect" ? 0 : 6, ry: style.shape === "rect" ? 0 : 6 },
          bar: { fill: color },
          seqBg: { cx: 16, cy: NH - 15, fill: color, stroke: color, display: style.showSeq ? "block" : "none" },
          seq: { text: style.showSeq ? String(act.seq) : "", fill: color, display: style.showSeq ? "block" : "none" },
          label: { text: style.showName ? (act.name.length > 10 ? act.name.slice(0, 9) + "…" : act.name) : "" },
          dept: { text: style.showDept ? laneName(act.laneId).slice(0, 4) : "" },
          subMark: { x: NW - 24, y: NH - 24, width: 18, height: 18, opacity: subSet.has(act.id) ? 1 : 0 },
          subPlus: { x: NW - 15, y: NH - 15, fontSize: 16, opacity: subSet.has(act.id) ? 1 : 0 },
        },
        data: { act: true },
      });
      laneNodeOf.get(act.laneId)?.addChild(node);
    });

    // 开始 / 结束事件
    let startNode: Node | undefined, endNode: Node | undefined;
    if (style.showEvents && ordered.length) {
      const firstLi = laneIndex.get(ordered[0].laneId) ?? 0;
      const lastLi = laneIndex.get(ordered[ordered.length - 1].laneId) ?? 0;
      startNode = graph.addNode({ shape: "bpmn-start", x: HEADER_W + 24, y: firstLi * LANE_H + (LANE_H - 36) / 2, width: 36, height: 36, zIndex: 3 });
      endNode = graph.addNode({ shape: "bpmn-end", x: startX + nCols * COL_W + 8, y: lastLi * LANE_H + (LANE_H - 36) / 2, width: 36, height: 36, zIndex: 3 });
    }

    // 顺序流：同泳道走直线，跨泳道走折线(orth)；跨部门虚线 + 转让/协作着色
    const addEdge = (s: string, t: string, level: "none" | "collab" | "transfer", sameLane: boolean) => {
      const transfer = level === "transfer", collab = level === "collab";
      graph.addEdge({
        shape: "bpmn-edge", source: s, target: t, zIndex: 2,
        router: sameLane ? undefined : { name: "orth", args: { padding: 14 } },
        connector: sameLane ? { name: "normal" } : { name: "rounded", args: { radius: 8 } },
        labels: transfer ? [{ attrs: { label: { text: "转让价", fill: "#b45309", fontSize: 10, fontWeight: 600 }, body: { fill: "#fffbeb", stroke: "#fcd34d", rx: 3, ry: 3 } }, position: 0.5 }]
          : collab ? [{ attrs: { label: { text: "协作价", fill: "#475569", fontSize: 9 }, body: { fill: "#f1f5f9", stroke: "#cbd5e1", rx: 3, ry: 3 } }, position: 0.5 }] : [],
        attrs: {
          line: {
            stroke: transfer ? "#d97706" : collab ? "#64748b" : "#A2B1C3",
            strokeWidth: transfer ? 2.5 : 2,
            strokeDasharray: (style.dashCrossLane && level !== "none") ? "5 5" : undefined,
            targetMarker: "classic",
          },
        },
      });
    };
    const laneOf = (a: ProcessActivity) => laneIndex.get(a.laneId) ?? 0;
    // 交接判定：同泳道=none；跨泳道按归属阿米巴单元——不同单元=转让价，同单元=协作价
    const handoff = (aId: string, bId: string): "none" | "collab" | "transfer" => {
      if (aId === bId) return "none";
      const ua = laneUnit(aId), ub = laneUnit(bId);
      if (ua && ub && ua !== ub) return "transfer";
      // 回退到静态部门→阿米巴映射
      const fallback = handoffLevel(getDepartment(laneById.get(aId)?.departmentId)?.id, getDepartment(laneById.get(bId)?.departmentId)?.id);
      return fallback === "transfer" ? "transfer" : "collab";
    };
    if (startNode && ordered[0]) addEdge(startNode.id, ordered[0].id, "none", true);
    for (let i = 0; i < ordered.length - 1; i++) {
      const same = laneOf(ordered[i]) === laneOf(ordered[i + 1]);
      addEdge(ordered[i].id, ordered[i + 1].id, handoff(ordered[i].laneId, ordered[i + 1].laneId), same);
    }
    if (endNode && ordered.length) addEdge(ordered[ordered.length - 1].id, endNode.id, "none", true);

    if (onSelect) graph.on("node:click", ({ node }) => { if (node.getData()?.act) onSelect(node.id); });
    graph.zoomToFit({ padding: 16, maxScale: 1 });
    const detach = attachZoomPan(graph, ref.current, 16);

    return () => { detach(); graph.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, activities, style, selectedId, onSelect, (subflowIds || []).join(",")]);

  return <div ref={ref} style={{ height }} className="w-full" />;
}
