"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { TONE_COLOR, type G6Tone } from "./G6Network";

export interface MindNode {
  id: string;
  label: string;
  tone?: G6Tone;
  /** drives node fill via tone fallback */
  category?: string;
  /** optional meta passed back on click */
  meta?: Record<string, unknown>;
  children?: MindNode[];
}

export interface G6MindmapProps {
  root: MindNode;
  height?: number;
  /** Horizontal mindmap default; "compactBox" yields top-down */
  layout?: "mindmap" | "compactBox" | "indented";
  onNodeClick?: (node: MindNode | null) => void;
}

/**
 * Mindmap-style tree graph inspired by G6 v5 mindmap example.
 * - Two-sided horizontal branching from root.
 * - Color/style per node via tone.
 * - Click bubbles up so parent can show a rich detail card.
 */
export function G6Mindmap({
  root, height = 560, layout = "mindmap", onNodeClick,
}: G6MindmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanupFns: Array<() => void> = [];

    (async () => {
      try {
        const { Graph, treeToGraphData } = await import("@antv/g6");
        if (disposed || !containerRef.current) return;

        // Convert children-based hierarchy to graph format
        const annotated = annotate(root);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const graphData = treeToGraphData(annotated as any);

        // Restyle each node — auto-fit width to label so Chinese text is never clipped
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graphData.nodes = (graphData.nodes || []).map((n: any) => {
          const tone: G6Tone = (n.data?.tone as G6Tone) || "primary";
          const depth: number = (n.data?.depth as number) || 0;
          const isRoot = depth === 0;
          const fill = TONE_COLOR[tone];
          const label: string = n.data?.label || n.id;

          // Visual width per glyph: Chinese ~14px, ASCII ~7px at fontSize 12
          const fontSize = isRoot ? 15 : depth === 1 ? 13 : 12;
          const glyphW = (s: string) =>
            Array.from(s).reduce((sum, ch) => sum + (/[一-龥]/.test(ch) ? fontSize : fontSize * 0.62), 0);
          const PAD_X = isRoot ? 32 : 22;
          const minW = isRoot ? 200 : depth === 1 ? 130 : 110;
          const width = Math.max(minW, Math.round(glyphW(label) + PAD_X));
          const height = isRoot ? 52 : depth === 1 ? 36 : 30;

          const labelOnDark = isRoot || (tone !== "keep" && tone !== "neutral");
          return {
            ...n,
            type: "rect",
            style: {
              size: [width, height],
              fill,
              stroke: isRoot ? "#1a2369" : "rgba(255,255,255,0.9)",
              lineWidth: isRoot ? 2.5 : 1.5,
              labelText: label,
              labelFill: labelOnDark ? "#fff" : "#0f1334",
              labelFontWeight: isRoot ? 700 : depth === 1 ? 600 : 500,
              labelFontSize: fontSize,
              labelPlacement: "center" as const,
              labelMaxLines: 1,
              labelWordWrap: false,
              radius: isRoot ? 14 : 8,
              shadowColor: "rgba(0,0,0,0.06)",
              shadowBlur: 4,
              shadowOffsetY: 2,
            },
          };
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graphData.edges = (graphData.edges || []).map((e: any) => ({
          ...e,
          style: {
            stroke: "rgba(45,42,142,0.35)",
            lineWidth: 1.2,
            endArrow: false,
            // a soft cubic-bezier-like curve
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // (G6 default for tree is fine; keep simple)
          },
        }));

        const layoutType = layout === "mindmap" ? "mindmap"
                          : layout === "compactBox" ? "compactBox" : "indented";

        const graph = new Graph({
          container: containerRef.current,
          height,
          autoFit: "view",
          padding: 32,
          background: "transparent",
          data: graphData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          layout: { type: layoutType, direction: "H" as const, getHeight: () => 48, getWidth: () => 180, getVGap: () => 18, getHGap: () => 120 } as any,
          // Drop "collapse-expand": it intercepted clicks on parent nodes and
          // blocked our onNodeClick from firing.
          behaviors: ["drag-canvas", "zoom-canvas"],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graphRef.current = graph as any;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractId = (e: any): string | null => {
          // Try every place G6 v5 might stash the node id
          const candidates = [
            e?.itemId,
            e?.target?.id,
            e?.target?.attributes?.id,
            e?.target?.config?.id,
            e?.targetItem?.id,
            e?.item?.getID?.(),
          ];
          for (const c of candidates) {
            if (c == null) continue;
            const s = String(c);
            // accept only ids we own
            if (findNode(root, s)) return s;
          }
          return null;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onClick = (e: any) => {
          const id = extractId(e);
          if (!id) return;
          const node = findNode(root, id);
          if (node) onNodeClick?.(node);
        };
        graph.on("node:click", onClick);
        // Some G6 v5 builds emit the click on the inner shape; cover that.
        graph.on("element:click", onClick);
        cleanupFns.push(() => graph.off("node:click", onClick));
        cleanupFns.push(() => graph.off("element:click", onClick));

        await graph.render();
        if (disposed) {
          graph.destroy();
          return;
        }
        setLoading(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[G6Mindmap] render failed", err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rootIds(root)), height, layout]);

  return (
    <div className="relative rounded-lg border border-border bg-card" style={{ minHeight: height }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 渲染思维导图中...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-red-600">
          思维导图加载失败：{error}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}

// annotate depth recursively so the renderer can size differently
function annotate(node: MindNode, depth = 0): MindNode & { data: Record<string, unknown> } {
  return {
    ...node,
    data: {
      label: node.label,
      tone: node.tone || (depth === 0 ? "primary" : "keep"),
      depth,
      ...(node.meta || {}),
    },
    children: node.children?.map((c) => annotate(c, depth + 1)),
    // satisfy TS
    label: node.label,
    id: node.id,
  };
}

function rootIds(node: MindNode): string[] {
  const ids: string[] = [node.id];
  node.children?.forEach((c) => ids.push(...rootIds(c)));
  return ids;
}

function findNode(node: MindNode, id: string): MindNode | null {
  if (node.id === id) return node;
  for (const c of node.children || []) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}
