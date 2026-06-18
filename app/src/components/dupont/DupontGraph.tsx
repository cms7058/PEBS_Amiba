"use client";

import { useEffect, useRef } from "react";
import { Graph, Node } from "@antv/x6";
import type { DupontNode } from "../../lib/dupont";

// 杜邦成本树 — 参照 AntV X6 DAG 案例：自顶向下节点 + 正交圆角连线 + 趋势着色。
// 节点 = 财务/成本科目，连线 = 父→子分解关系。

const NODE_W = 240;
const NODE_H = 70;
const GAP_X = 32;
const GAP_Y = 60;

let registered = false;
function registerNode() {
  if (registered) return;
  registered = true;
  Graph.registerNode(
    "dupont-node",
    {
      inherit: "rect",
      markup: [
        { tagName: "rect", selector: "body" },
        { tagName: "rect", selector: "accent" },
        { tagName: "text", selector: "label" },
        { tagName: "text", selector: "value" },
      ],
      attrs: {
        body: { refWidth: "100%", refHeight: "100%", rx: 8, ry: 8, fill: "#ffffff", stroke: "#e1e4ef", strokeWidth: 1 },
        accent: { x: 0, y: 0, width: 4, refHeight: "100%", fill: "#94a3b8" },
        label: { refX: 18, refY: 13, fontSize: 15, fontWeight: 700, fill: "#0f1334", textAnchor: "start", textVerticalAnchor: "top" },
        value: { refX: 18, refY: 38, fontSize: 14, fontFamily: "ui-monospace, monospace", fill: "#5e6586", textAnchor: "start", textVerticalAnchor: "top" },
      },
    },
    true,
  );
}

function fmt(v?: number) {
  if (v == null) return "—";
  return v.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

interface Flat {
  node: DupontNode;
  x: number;
  y: number;
}

// 自顶向下整齐树布局：叶子顺序排布，父节点居中于子节点之上
function layout(root: DupontNode): Flat[] {
  const out: Flat[] = [];
  const xById = new Map<string, number>();
  let leafCursor = 0;

  function assign(node: DupontNode, depth: number): number {
    const y = depth * (NODE_H + GAP_Y);
    let x: number;
    const kids = node.children || [];
    if (kids.length === 0) {
      x = leafCursor * (NODE_W + GAP_X);
      leafCursor++;
    } else {
      const xs = kids.map((c) => assign(c, depth + 1));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    xById.set(node.id, x);
    out.push({ node, x, y });
    return x;
  }
  assign(root, 0);
  return out;
}

function trendColor(node: DupontNode): { accent: string; value: string } {
  const { baseline, current } = node.values;
  if (baseline == null || current == null) return { accent: "#94a3b8", value: "#5e6586" };
  const lowerBetter = /成本|DSO|周期|呆滞|换线/.test(node.label);
  const delta = current - baseline;
  const good = lowerBetter ? delta < 0 : delta > 0;
  if (delta === 0) return { accent: "#94a3b8", value: "#5e6586" };
  return good ? { accent: "#16a34a", value: "#16a34a" } : { accent: "#dc2626", value: "#dc2626" };
}

export function DupontGraph({ tree, selectedId, onSelect }: { tree: DupontNode; selectedId?: string | null; onSelect?: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    registerNode();

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      panning: true,
      mousewheel: { enabled: true, modifiers: ["ctrl", "meta"] },
      background: { color: "transparent" },
      interacting: { nodeMovable: false },
      connecting: { allowBlank: false },
    });
    graphRef.current = graph;

    const flats = layout(tree);
    const nodes: Node[] = flats.map((f) => {
      const c = trendColor(f.node);
      const v = f.node.values;
      const label = f.node.label + (f.node.actual ? "  ·现场实测" : "");
      const valueText = `${fmt(v.baseline)} → ${fmt(v.current)} (${fmt(v.target)})${f.node.unit ? " " + f.node.unit : ""}`;
      return graph.addNode({
        id: f.node.id,
        shape: "dupont-node",
        x: f.x,
        y: f.y,
        width: NODE_W,
        height: NODE_H,
        attrs: {
          label: { text: label, fill: f.node.actual ? "#2d2a8e" : "#0f1334" },
          value: { text: valueText, fill: c.value },
          accent: { fill: f.node.actual ? "#2d2a8e" : c.accent },
          body: {
            stroke: selectedId === f.node.id ? "#2d2a8e" : f.node.actual ? "#2d2a8e" : f.node.costAccount ? "#cbd5e1" : "#e1e4ef",
            strokeWidth: selectedId === f.node.id ? 2.5 : f.node.actual ? 1.5 : 1,
          },
        },
      });
    });

    // 边：父 → 子
    function addEdges(node: DupontNode) {
      for (const child of node.children || []) {
        graph.addEdge({
          source: node.id,
          target: child.id,
          router: { name: "manhattan", args: { padding: 12 } },
          connector: { name: "rounded", args: { radius: 10 } },
          attrs: {
            line: {
              stroke: "#c7cbe0",
              strokeWidth: 1.5,
              targetMarker: { name: "block", width: 8, height: 6 },
            },
          },
          zIndex: -1,
        });
        addEdges(child);
      }
    }
    addEdges(tree);
    void nodes;

    if (onSelect) graph.on("node:click", ({ node }) => onSelect(node.id));
    graph.zoomToFit({ padding: 24, maxScale: 1 });

    return () => { graph.dispose(); graphRef.current = null; };
  }, [tree, selectedId, onSelect]);

  return <div ref={containerRef} className="h-[560px] w-full" />;
}
