"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { G6Network, type G6NetNode, type G6NetEdge, TONE_COLOR, type G6Tone } from "./G6Network";
import type { NMNode, NMEdge } from "../demo/NeuralMap";

/**
 * Drop-in replacement for the legacy NeuralMap component, but renders with
 * AntV G6 v5 (force-directed, hover highlight, drag, zoom).
 *
 * Accepts the same NMNode[] / NMEdge[] data shape so existing data builders
 * (in profile / deployment / design pages) keep working unchanged.
 */
export function G6NeuralView({
  title, subtitle, layerLabels, nodes, edges, height = 480, onNodeSelected,
}: {
  title?: string;
  subtitle?: string;
  layerLabels?: string[];
  nodes: NMNode[];
  edges: NMEdge[];
  height?: number;
  /** unused but kept for API compatibility */
  aspect?: number;
  /** Called whenever the user clicks a node — lets parent feed AI assistant */
  onNodeSelected?: (s: { label: string; meta?: Record<string, unknown> } | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Convert NMNode → G6NetNode
  const g6Nodes: G6NetNode[] = useMemo(
    () => nodes.map((n) => ({
      id: n.id,
      label: n.label,
      category: n.tone || "primary",
      tone: (n.tone as G6Tone) || "primary",
      size: (n.r ?? 22) + 10,
      meta: { sub: n.sub, detail: n.detail },
    })),
    [nodes]
  );
  const g6Edges: G6NetEdge[] = useMemo(
    () => edges.map((e) => ({ source: e.from, target: e.to, label: e.label })),
    [edges]
  );

  const selected = selectedId ? nodes.find((n) => n.id === selectedId) : null;

  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div>
          {title && <div className="text-sm font-semibold">{title}</div>}
          {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
      )}

      {layerLabels && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {layerLabels.map((l) => (
            <span key={l} className="rounded-md bg-[color:var(--primary)]/8 px-2 py-0.5 text-[color:var(--primary)]">
              {l}
            </span>
          ))}
          <span>·</span>
          <span>Hover 高亮关联 · 点击节点查看详情 · 可拖拽 / 缩放</span>
        </div>
      )}

      <G6Network
        nodes={g6Nodes}
        edges={g6Edges}
        height={height}
        onNodeClick={(n) => {
          const id = n?.id || null;
          setSelectedId(id);
          const nm = id ? nodes.find((x) => x.id === id) : null;
          onNodeSelected?.(
            nm ? { label: nm.label, meta: { ...(nm.detail || {}), sub: nm.sub } } : null
          );
        }}
      />

      {selected ? (
        <NodeCard node={selected} onClose={() => { setSelectedId(null); onNodeSelected?.(null); }} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
          点击任意节点查看完整说明
        </div>
      )}
    </div>
  );
}

function NodeCard({ node, onClose }: { node: NMNode; onClose: () => void }) {
  const tone = (node.tone as G6Tone) || "primary";
  const color = TONE_COLOR[tone];
  const d = node.detail || {};
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm animate-fade-up">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ background: color }}
          >
            <span className="text-base font-bold">{(node.label || "?")[0]}</span>
          </div>
          <div>
            <div className="text-sm font-semibold">{d.title || node.label}</div>
            {node.sub && <div className="text-[11px] text-muted-foreground">{node.sub}</div>}
            {d.badges && (
              <div className="mt-1 flex flex-wrap gap-1">
                {d.badges.map((b, i) => {
                  const bTone = (b.tone as G6Tone) || "primary";
                  const bColor = TONE_COLOR[bTone];
                  return (
                    <span key={i} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: bColor + "22", color: bColor }}>
                      {b.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {d.description && <p className="mb-3 whitespace-pre-wrap text-xs text-foreground">{d.description}</p>}

      {d.kv && d.kv.length > 0 && (
        <ul className="mb-3 space-y-1">
          {d.kv.map((kv, i) => (
            <li key={i} className="flex items-center justify-between border-b border-border py-1 text-xs last:border-0">
              <span className="text-muted-foreground">{kv.k}</span>
              <span className="font-mono text-foreground">{kv.v}</span>
            </li>
          ))}
        </ul>
      )}

      {d.bullets && d.bullets.length > 0 && (
        <ul className="space-y-1.5">
          {d.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-xs text-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: color }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
