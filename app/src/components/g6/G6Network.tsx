"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export type G6Tone = "keep" | "remove" | "modify" | "new" | "rule" | "primary" | "ok" | "warn" | "bad" | "neutral";

export const TONE_COLOR: Record<G6Tone, string> = {
  keep:    "#94a3b8",   // 灰：现状沿用
  remove:  "#dc2626",   // 红：去除
  modify:  "#d97706",   // 琥珀：改造
  new:     "#2d2a8e",   // 蓝：新建
  rule:    "#a855f7",   // 紫：规则
  primary: "#2d2a8e",
  ok:      "#16a34a",
  warn:    "#d97706",
  bad:     "#dc2626",
  neutral: "#94a3b8",
};

export interface G6NetNode {
  id: string;
  label: string;
  /** category drives node color via palette */
  category: string;
  tone?: G6Tone;
  /** node size; default 32 */
  size?: number;
  /** any extra data passed back on click */
  meta?: Record<string, unknown>;
}

export interface G6NetEdge {
  source: string;
  target: string;
  label?: string;
}

export interface G6NetworkProps {
  nodes: G6NetNode[];
  edges: G6NetEdge[];
  /** Override category → color mapping. If not provided, use TONE_COLOR via node.tone */
  categoryColors?: Record<string, string>;
  height?: number;
  /** Called when user clicks a node */
  onNodeClick?: (node: G6NetNode | null) => void;
  /** Layout choice */
  layout?: "force" | "d3-force" | "concentric";
}

/**
 * Force-directed graph inspired by the G6 "unicorns-investors" example.
 * - Category-coded node fill via palette.
 * - Hover highlights connected sub-graph.
 * - Click bubbles up the node so the parent can render a rich detail card.
 */
export function G6Network({
  nodes, edges, categoryColors, height = 480, onNodeClick, layout = "d3-force",
}: G6NetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve fill color either from category map or node tone
  const palette = categoryColors || Object.fromEntries(
    nodes.map((n) => [n.category, n.tone ? TONE_COLOR[n.tone] : TONE_COLOR.primary])
  );

  useEffect(() => {
    let disposed = false;
    let cleanupFns: Array<() => void> = [];

    (async () => {
      try {
        const { Graph } = await import("@antv/g6");
        if (disposed || !containerRef.current) return;

        const graphData = {
          nodes: nodes.map((n) => ({
            id: n.id,
            data: { category: n.category, label: n.label, ...(n.meta || {}) },
            style: {
              size: n.size ?? 32,
              fill: n.tone ? TONE_COLOR[n.tone] : (palette[n.category] || TONE_COLOR.primary),
              stroke: "#fff",
              lineWidth: 2,
              labelText: n.label,
              labelPlacement: "bottom" as const,
              labelOffsetY: 8,
              labelFontSize: 11,
              labelFontWeight: 600,
              labelFill: "#0f1334",
              labelBackground: true,
              labelBackgroundFill: "rgba(255,255,255,0.85)",
              labelBackgroundRadius: 4,
              labelPadding: [1, 4] as [number, number],
            },
          })),
          edges: edges.map((e, i) => ({
            id: `${e.source}-${e.target}-${i}`,
            source: e.source,
            target: e.target,
            data: { label: e.label || "" },
            style: {
              stroke: "rgba(148,163,184,0.55)",
              lineWidth: 1.2,
              endArrow: false,
            },
          })),
        };

        const layoutConfig =
          layout === "concentric"
            ? { type: "concentric", preventOverlap: true, nodeSize: 50, minNodeSpacing: 20 }
            : layout === "force"
              ? { type: "force", preventOverlap: true, nodeStrength: -50, linkDistance: 80 }
              : { type: "d3-force", manyBody: { strength: -120 }, x: {}, y: {}, collide: { radius: 30 } };

        const graph = new Graph({
          container: containerRef.current,
          height,
          autoFit: "view",
          padding: 24,
          background: "transparent",
          data: graphData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          layout: layoutConfig as any,
          behaviors: ["drag-canvas", "zoom-canvas", "drag-element"],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graphRef.current = graph as any;

        // 选中/悬停状态：点击节点 → 聚焦放大并把名称放大显示在节点右侧（否则密集时看不清）
        let selected: string | null = null;
        let hovered: string | null = null;
        let lastClickAt = 0, lastClickId = "";

        const neighborsOf = (id: string) => {
          const s = new Set<string>([id]);
          graphData.edges.forEach((edge: { source: string; target: string }) => {
            if (edge.source === id) s.add(edge.target);
            if (edge.target === id) s.add(edge.source);
          });
          return s;
        };

        const restyle = () => {
          const focusId = hovered || selected;
          const nb = focusId ? neighborsOf(focusId) : null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (graph as any).updateNodeData(
            graphData.nodes.map((n) => {
              const isSel = n.id === selected;
              const dimmed = nb ? !nb.has(n.id) : false;
              const baseSize = n.style.size as number;
              return {
                id: n.id,
                style: {
                  opacity: dimmed ? 0.15 : 1,
                  size: isSel ? baseSize + 18 : baseSize,
                  lineWidth: isSel ? 3 : 2,
                  stroke: isSel ? "#2d2a8e" : "#fff",
                  zIndex: isSel ? 10 : 0,
                  labelFontSize: isSel ? 17 : 11,
                  labelFontWeight: isSel ? 700 : 600,
                  labelPlacement: isSel ? "right" : "bottom",
                  labelOffsetX: isSel ? 8 : 0,
                  labelOffsetY: isSel ? 0 : 8,
                  labelFill: isSel ? "#2d2a8e" : "#0f1334",
                  labelBackgroundFill: isSel ? "rgba(45,42,142,0.12)" : "rgba(255,255,255,0.85)",
                  labelPadding: isSel ? [4, 9] : [1, 4],
                },
              };
            })
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (graph as any).updateEdgeData(
            graphData.edges.map((edge: { id: string; source: string; target: string }) => {
              const active = focusId ? (edge.source === focusId || edge.target === focusId) : false;
              return {
                id: edge.id,
                style: {
                  opacity: nb ? (active ? 1 : 0.08) : 1,
                  lineWidth: active ? 2 : 1.2,
                  stroke: active ? "#2d2a8e" : "rgba(148,163,184,0.55)",
                },
              };
            })
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (graph as any).draw();
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onEnter = (e: any) => { const id = e.itemId || e.target?.id; if (!id) return; hovered = String(id); restyle(); };
        const onLeave = () => { hovered = null; restyle(); };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onClick = (e: any) => {
          const id = e.itemId || e.target?.id;
          if (!id) return;
          const sid = String(id);
          const now = Date.now();
          if (sid === lastClickId && now - lastClickAt < 120) return; // 去重：node:click 与 element:click 可能双触发
          lastClickAt = now; lastClickId = sid;
          const node = nodes.find((n) => n.id === sid);
          if (!node) return;
          if (selected === sid) {
            selected = null; restyle();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            try { (graph as any).fitView(); } catch { /* noop */ }
            onNodeClick?.(null);
          } else {
            selected = sid; restyle();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            try { (graph as any).zoomTo(1.6); (graph as any).focusElement(sid); } catch { /* noop */ }
            onNodeClick?.(node);
          }
        };
        const onCanvasClick = () => {
          if (!selected) return;
          selected = null; restyle();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          try { (graph as any).fitView(); } catch { /* noop */ }
          onNodeClick?.(null);
        };

        graph.on("node:pointerenter", onEnter);
        graph.on("node:pointerleave", onLeave);
        graph.on("node:click", onClick);
        // Backup: some G6 v5 builds emit on inner shape only
        graph.on("element:click", onClick);
        graph.on("canvas:click", onCanvasClick);
        cleanupFns.push(() => graph.off("node:pointerenter", onEnter));
        cleanupFns.push(() => graph.off("node:pointerleave", onLeave));
        cleanupFns.push(() => graph.off("node:click", onClick));
        cleanupFns.push(() => graph.off("element:click", onClick));
        cleanupFns.push(() => graph.off("canvas:click", onCanvasClick));

        await graph.render();
        if (disposed) {
          graph.destroy();
          return;
        }
        setLoading(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[G6Network] render failed", err);
        if (!disposed) setError((err as Error).message);
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      cleanupFns.forEach((f) => f());
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (graphRef.current as any)?.destroy?.();
      } catch { /* noop */ }
      graphRef.current = null;
    };
    // intentionally re-init on data change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(nodes.map((n) => n.id)), JSON.stringify(edges), height, layout]);

  return (
    <div className="relative rounded-lg border border-border bg-card" style={{ minHeight: height }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 渲染图谱中...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-red-600">
          图谱加载失败：{error}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}
