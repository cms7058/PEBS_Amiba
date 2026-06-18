"use client";

import { useEffect, useRef } from "react";
import { Graph, Node } from "@antv/x6";
import { attachZoomPan } from "../../lib/graph-interactions";
import { FACTOR_LABELS } from "../../lib/factory-types";
import { getAmiba } from "../../lib/amibas";
import { THREE_PROPS_LABELS, kpiImprovement, type OtdNode } from "../../lib/otd-types";

// OTD 价值流 — X6 BPMN 风格 + 阿米巴结合：
// 每个任务节点按归属阿米巴着色（左侧色带 + 阿米巴名），相邻节点跨阿米巴处的连线
// 高亮为「交接点」（橙色虚线 + 转让价标签）—— 即内部转让价 + 责任归属发生处。

const W = 214, H = 94, GX = 52, GY = 64, COLS = 4, EV = 38;

let registered = false;
function registerShapes() {
  if (registered) return;
  registered = true;
  Graph.registerNode("otd-task", {
    inherit: "rect",
    markup: [
      { tagName: "rect", selector: "body" },
      { tagName: "rect", selector: "topbar" },
      { tagName: "rect", selector: "amibaBand" },
      { tagName: "text", selector: "seq" },
      { tagName: "text", selector: "title" },
      { tagName: "text", selector: "amibaName" },
      { tagName: "text", selector: "meta" },
      { tagName: "text", selector: "cost" },
      { tagName: "rect", selector: "subMark" },
      { tagName: "text", selector: "subPlus" },
    ],
    attrs: {
      body: { refWidth: "100%", refHeight: "100%", rx: 8, ry: 8, fill: "#ffffff", stroke: "#e1e4ef", strokeWidth: 1 },
      topbar: { refWidth: "100%", height: 5, x: 0, y: 0, rx: 3, ry: 3, fill: "#94a3b8" },
      amibaBand: { x: 0, y: 5, width: 7, height: H - 5, fill: "#94a3b8" },
      seq: { refX: 16, refY: 50, fontSize: 26, fontWeight: 800, fill: "#94a3b8", fontFamily: "ui-monospace, monospace", textAnchor: "start", textVerticalAnchor: "middle" },
      title: { refX: 52, refY: 28, fontSize: 14.5, fontWeight: 700, fill: "#0f1334", textAnchor: "start", textVerticalAnchor: "middle" },
      amibaName: { refX: 52, refY: 52, fontSize: 12, fontWeight: 600, fill: "#5e6586", textAnchor: "start", textVerticalAnchor: "middle" },
      meta: { refX: 52, refY: 74, fontSize: 11.5, fill: "#5e6586", textAnchor: "start", textVerticalAnchor: "middle" },
      cost: { refX: "100%", x: -12, refY: 22, fontSize: 12, fontWeight: 800, fill: "#2d2a8e", textAnchor: "end", textVerticalAnchor: "middle", fontFamily: "ui-monospace, monospace" },
      // BPMN 子流程标记（⊞）：底部右角，仅含子流程的节点显示（绝对坐标定位，W=214/H=94）
      subMark: { x: W - 28, y: H - 26, width: 20, height: 20, rx: 3, ry: 3, fill: "#2d2a8e", stroke: "#ffffff", strokeWidth: 1.5, opacity: 0 },
      subPlus: { text: "+", x: W - 18, y: H - 16, fontSize: 18, fontWeight: 800, fill: "#ffffff", textAnchor: "middle", textVerticalAnchor: "middle", opacity: 0, pointerEvents: "none" },
    },
  }, true);
}

function trendColor(node: OtdNode): string {
  const imp = node.kpis.map(kpiImprovement).filter((x): x is number => x != null);
  if (imp.length === 0) return "#94a3b8";
  const avg = imp.reduce((a, b) => a + b, 0) / imp.length;
  if (avg === 0) return "#94a3b8";
  return avg > 0 ? "#16a34a" : "#dc2626";
}

function metaText(node: OtdNode): string {
  const parts: string[] = [];
  if (node.factor) parts.push(FACTOR_LABELS[node.factor]);
  if (node.riskProp) parts.push(`⚠${THREE_PROPS_LABELS[node.riskProp]}`);
  const tools = node.tools.filter((t) => t.enabled).length;
  if (tools) parts.push(`🔧${tools}`);
  return parts.join(" · ") || "—";
}

interface Pos { x: number; y: number }
function snakePositions(n: number): Pos[] {
  const pos: Pos[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / COLS);
    let col = i % COLS;
    if (row % 2 === 1) col = COLS - 1 - col;
    pos.push({ x: 64 + col * (W + GX), y: 30 + row * (H + GY) });
  }
  return pos;
}

const yuan = (n: number) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });

export function OtdFlow({
  nodes, selectedId, onSelect, costByNode, subflowIds, height = 580,
}: {
  nodes: OtdNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  costByNode?: Record<string, number>;
  subflowIds?: string[];
  height?: number;
}) {
  const subSet = new Set(subflowIds || []);
  const subKey = (subflowIds || []).slice().sort().join(",");
  const ref = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const mapRef = useRef<Map<string, Node>>(new Map());

  const sorted = nodes.slice().sort((a, b) => a.seq - b.seq);
  // 结构 + 阿米巴归属变化时重建（归属变化会影响交接点判定）
  const structureKey = sorted.map((n) => `${n.id}:${n.amibaId || ""}`).join("|");

  useEffect(() => {
    if (!ref.current) return;
    registerShapes();
    const graph = new Graph({
      container: ref.current,
      autoResize: true,
      panning: { enabled: true, eventTypes: ["rightMouseDown"] },
      mousewheel: { enabled: false },
      background: { color: "transparent" },
      interacting: { nodeMovable: false },
    });
    graphRef.current = graph;
    const map = new Map<string, Node>();
    mapRef.current = map;

    const pos = snakePositions(sorted.length);

    const first = pos[0];
    if (first) {
      graph.addNode({
        id: "__start", shape: "circle", x: first.x - EV - 22, y: first.y + (H - EV) / 2, width: EV, height: EV,
        attrs: { body: { fill: "#fff", stroke: "#16a34a", strokeWidth: 2 }, label: { text: "开始", fontSize: 11, fill: "#16a34a" } },
      });
    }
    sorted.forEach((n, i) => {
      const p = pos[i];
      const amb = getAmiba(n.amibaId);
      const node = graph.addNode({
        id: n.id, shape: "otd-task", x: p.x, y: p.y, width: W, height: H,
        data: { otd: true },
        attrs: {
          seq: { text: String(n.seq), fill: amb?.color || "#94a3b8" },
          title: { text: n.name.length > 12 ? n.name.slice(0, 11) + "…" : n.name },
          amibaName: { text: amb?.name || "未归属阿米巴", fill: amb?.color || "#94a3b8" },
          meta: { text: metaText(n) },
          cost: { text: costByNode?.[n.id] ? yuan(costByNode[n.id]) : "" },
          topbar: { fill: trendColor(n) },
          amibaBand: { fill: amb?.color || "#cbd5e1" },
          subMark: { opacity: subSet.has(n.id) ? 1 : 0 },
          subPlus: { opacity: subSet.has(n.id) ? 1 : 0 },
        },
      });
      map.set(n.id, node);
    });
    const lastIdx = sorted.length - 1;
    const last = pos[lastIdx];
    if (last) {
      const row = Math.floor(lastIdx / COLS);
      const toRight = row % 2 === 0;
      graph.addNode({
        id: "__end", shape: "circle",
        x: toRight ? last.x + W + 22 : last.x - EV - 22,
        y: last.y + (H - EV) / 2, width: EV, height: EV,
        attrs: { body: { fill: "#fff", stroke: "#dc2626", strokeWidth: 3 }, label: { text: "交付", fontSize: 11, fill: "#dc2626" } },
      });
    }

    const addEdge = (s: string, t: string, handoff: boolean) => graph.addEdge({
      source: s, target: t, zIndex: -1,
      router: { name: "manhattan", args: { padding: 12 } },
      connector: { name: "rounded", args: { radius: 8 } },
      labels: handoff ? [{
        attrs: {
          label: { text: "交接·转让价", fill: "#b45309", fontSize: 10, fontWeight: 600 },
          body: { fill: "#fffbeb", stroke: "#fcd34d", strokeWidth: 1, rx: 3, ry: 3 },
        },
        position: 0.5,
      }] : [],
      attrs: {
        line: {
          stroke: handoff ? "#d97706" : "#aab0d0",
          strokeWidth: handoff ? 2.5 : 1.5,
          strokeDasharray: handoff ? "6 3" : undefined,
          targetMarker: { name: "classic", size: 7 },
        },
      },
    });
    if (sorted[0]) addEdge("__start", sorted[0].id, false);
    for (let i = 0; i < sorted.length - 1; i++) {
      const handoff = sorted[i].amibaId !== sorted[i + 1].amibaId;
      addEdge(sorted[i].id, sorted[i + 1].id, handoff);
    }
    if (sorted[lastIdx]) addEdge(sorted[lastIdx].id, "__end", false);

    graph.on("node:click", ({ node }) => {
      if (node.getData()?.otd) onSelect(node.id);
    });

    graph.zoomToFit({ padding: 24, maxScale: 1 });
    const detach = attachZoomPan(graph, ref.current, 24);

    return () => { detach(); graph.dispose(); graphRef.current = null; mapRef.current = new Map(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  // 数据变化（KPI/工具/名称）→ 就地更新视觉
  useEffect(() => {
    const map = mapRef.current;
    for (const n of sorted) {
      const node = map.get(n.id);
      if (!node) continue;
      const amb = getAmiba(n.amibaId);
      node.attr("seq/text", String(n.seq));
      node.attr("seq/fill", amb?.color || "#94a3b8");
      node.attr("title/text", n.name.length > 12 ? n.name.slice(0, 11) + "…" : n.name);
      node.attr("amibaName/text", amb?.name || "未归属阿米巴");
      node.attr("amibaName/fill", amb?.color || "#94a3b8");
      node.attr("amibaBand/fill", amb?.color || "#cbd5e1");
      node.attr("meta/text", metaText(n));
      node.attr("cost/text", costByNode?.[n.id] ? yuan(costByNode[n.id]) : "");
      node.attr("topbar/fill", trendColor(n));
      const hasSub = subSet.has(n.id) ? 1 : 0;
      node.attr("subMark/opacity", hasSub);
      node.attr("subPlus/opacity", hasSub);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, costByNode, subKey]);

  useEffect(() => {
    const map = mapRef.current;
    for (const [id, node] of map) {
      const on = id === selectedId;
      node.attr("body/stroke", on ? "#2d2a8e" : "#e1e4ef");
      node.attr("body/strokeWidth", on ? 2.5 : 1);
    }
  }, [selectedId]);

  return <div ref={ref} style={{ height }} className="w-full" />;
}
