"use client";

import { useEffect, useRef } from "react";
import { Graph } from "@antv/x6";
import type { OrgDesign } from "../../lib/org-types";

// 杜邦式组织架构图：企业 → 阿米巴单元 → 部门（自顶向下分层树）。

const NW = 188, NH = 54, GX = 26, GY = 54;

interface TNode { id: string; label: string; sub?: string; color: string; children: TNode[] }

let registered = false;
function registerNode() {
  if (registered) return; registered = true;
  Graph.registerNode("org-node", {
    inherit: "rect",
    markup: [
      { tagName: "rect", selector: "body" },
      { tagName: "rect", selector: "bar" },
      { tagName: "text", selector: "label" },
      { tagName: "text", selector: "sub" },
    ],
    attrs: {
      body: { refWidth: "100%", refHeight: "100%", rx: 8, ry: 8, fill: "#fff", stroke: "#e1e4ef", strokeWidth: 1 },
      bar: { x: 0, y: 0, width: 5, refHeight: "100%", fill: "#94a3b8" },
      label: { refX: 16, refY: 18, fontSize: 13.5, fontWeight: 700, fill: "#0f1334", textAnchor: "start", textVerticalAnchor: "middle" },
      sub: { refX: 16, refY: 38, fontSize: 11, fill: "#5e6586", textAnchor: "start", textVerticalAnchor: "middle" },
    },
  }, true);
}

function buildTree(org: OrgDesign, enterpriseName: string): TNode {
  const unitNodes: TNode[] = org.amibaUnits.map((u) => ({
    id: u.id, label: u.name, sub: `${u.type} · ${u.departmentIds.length} 部门`, color: u.color || "#0ea5e9",
    children: org.departments.filter((d) => d.amibaId === u.id).map((d) => ({
      id: d.id, label: d.name, sub: `${d.personnel.length} 人`, color: u.color || "#0ea5e9", children: [],
    })),
  }));
  const unassigned = org.departments.filter((d) => !d.amibaId || !org.amibaUnits.some((u) => u.id === d.amibaId));
  if (unassigned.length) {
    unitNodes.push({
      id: "__unassigned", label: "未归属部门", sub: `${unassigned.length} 部门`, color: "#94a3b8",
      children: unassigned.map((d) => ({ id: d.id, label: d.name, sub: `${d.personnel.length} 人`, color: "#94a3b8", children: [] })),
    });
  }
  return { id: "__company", label: enterpriseName || "企业", sub: "战略阿米巴", color: "#2d2a8e", children: unitNodes };
}

export function OrgTree({ org, enterpriseName, height = 460 }: { org: OrgDesign; enterpriseName: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    registerNode();
    const graph = new Graph({
      container: ref.current, autoResize: true, panning: true,
      mousewheel: { enabled: true, modifiers: ["ctrl", "meta"] },
      background: { color: "transparent" }, interacting: { nodeMovable: false },
    });
    const tree = buildTree(org, enterpriseName);

    // tidy top-down layout
    let leaf = 0;
    const pos = new Map<string, { x: number; y: number }>();
    function assign(n: TNode, depth: number): number {
      const y = depth * (NH + GY);
      let x: number;
      if (!n.children.length) { x = leaf * (NW + GX); leaf++; }
      else { const xs = n.children.map((c) => assign(c, depth + 1)); x = (xs[0] + xs[xs.length - 1]) / 2; }
      pos.set(n.id, { x, y });
      return x;
    }
    assign(tree, 0);

    function add(n: TNode) {
      const p = pos.get(n.id)!;
      graph.addNode({ id: n.id, shape: "org-node", x: p.x, y: p.y, width: NW, height: NH,
        attrs: { label: { text: n.label.length > 11 ? n.label.slice(0, 10) + "…" : n.label }, sub: { text: n.sub || "" }, bar: { fill: n.color } } });
      n.children.forEach((c) => {
        add(c);
        graph.addEdge({ source: n.id, target: c.id, zIndex: -1, router: { name: "manhattan", args: { padding: 10 } },
          connector: { name: "rounded", args: { radius: 8 } }, attrs: { line: { stroke: "#c7cbe0", strokeWidth: 1.5, targetMarker: { name: "block", width: 8, height: 6 } } } });
      });
    }
    add(tree);
    graph.zoomToFit({ padding: 24, maxScale: 1 });
    return () => { graph.dispose(); };
  }, [org, enterpriseName]);

  return <div ref={ref} style={{ height }} className="w-full" />;
}
