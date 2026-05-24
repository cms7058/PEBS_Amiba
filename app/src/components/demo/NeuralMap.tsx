"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

export type NMTone = "ok" | "warn" | "bad" | "neutral" | "primary";

const TONE_META: Record<NMTone, { fill: string; ring: string; text: string }> = {
  ok:      { fill: "#16a34a", ring: "rgba(22,163,74,0.15)",  text: "#fff"     },
  warn:    { fill: "#d97706", ring: "rgba(217,119,6,0.15)",  text: "#fff"     },
  bad:     { fill: "#dc2626", ring: "rgba(220,38,38,0.18)",  text: "#fff"     },
  primary: { fill: "#2d2a8e", ring: "rgba(45,42,142,0.15)",  text: "#fff"     },
  neutral: { fill: "#94a3b8", ring: "rgba(148,163,184,0.15)", text: "#fff"    },
};

export interface NMNode {
  id: string;
  label: string;
  /** Display in two lines: sub appears under the label */
  sub?: string;
  /** Color tone */
  tone?: NMTone;
  /** Where to place: layer index (0 = leftmost). Auto-stacks vertically within a layer */
  layer: number;
  /** Optional manual y override 0..1, otherwise auto-distributed */
  y?: number;
  /** Optional radius override (default 22) */
  r?: number;
  /** Right-side detail rendered when this node is selected */
  detail?: {
    title?: string;
    badges?: Array<{ label: string; tone?: NMTone }>;
    description?: string;
    bullets?: string[];
    kv?: Array<{ k: string; v: string }>;
  };
}

export interface NMEdge {
  from: string;
  to: string;
  label?: string;
  tone?: NMTone;
}

export interface NeuralMapProps {
  nodes: NMNode[];
  edges: NMEdge[];
  /** Heading shown above the canvas */
  title?: string;
  subtitle?: string;
  /** Optional labels for each layer column shown as a chip at the top */
  layerLabels?: string[];
  /** Initial selected node id */
  initialSelectedId?: string;
  /** SVG aspect ratio: width / height. Defaults to 2 */
  aspect?: number;
  /** Show edge labels even when not hovered (defaults to false) */
  alwaysShowEdgeLabels?: boolean;
}

const VB_W = 1000;
const NODE_R = 22;

export function NeuralMap({
  nodes, edges, title, subtitle, layerLabels,
  initialSelectedId, aspect = 2.2, alwaysShowEdgeLabels = false,
}: NeuralMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { positions, height, layerCount } = useMemo(() => layout(nodes), [nodes]);
  // Aspect honors viewBox W; height computed by layout
  const vbH = Math.max(height, Math.round(VB_W / aspect));

  const focusedId = hoveredId || selectedId;
  const relatedSet = useMemo(() => {
    if (!focusedId) return new Set<string>();
    const s = new Set([focusedId]);
    edges.forEach((e) => {
      if (e.from === focusedId) s.add(e.to);
      if (e.to === focusedId) s.add(e.from);
    });
    return s;
  }, [edges, focusedId]);

  const selected = selectedId ? nodes.find((n) => n.id === selectedId) : null;

  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div>
          {title && <div className="text-sm font-semibold">{title}</div>}
          {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <svg
          viewBox={`0 0 ${VB_W} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full"
          style={{ minHeight: 280, maxHeight: 560 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <defs>
            <linearGradient id="nm-edge-active" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#2d2a8e" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#4a90d9" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="nm-edge-default" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Layer chips */}
          {layerLabels && (
            <g>
              {layerLabels.map((l, i) => {
                const x = colX(i, layerCount);
                return (
                  <g key={i}>
                    <rect x={x - 70} y={12} width={140} height={24} rx={12} fill="rgba(45,42,142,0.08)" />
                    <text x={x} y={28} textAnchor="middle" fontSize="11" fontWeight="600" fill="#2d2a8e">
                      {l}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = positions[edge.from];
            const to = positions[edge.to];
            if (!from || !to) return null;
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            const fr = fromNode.r ?? NODE_R;
            const tr = toNode.r ?? NODE_R;
            const startX = from.x + fr;
            const startY = from.y;
            const endX = to.x - tr;
            const endY = to.y;
            const midX = (startX + endX) / 2;
            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
            const related = focusedId === edge.from || focusedId === edge.to;
            const dim = focusedId !== null && !related;
            const showLabel = alwaysShowEdgeLabels || related;
            return (
              <g key={i} style={{ opacity: dim ? 0.12 : 1, transition: "opacity 150ms" }}>
                <path
                  d={path}
                  stroke={related ? "url(#nm-edge-active)" : "url(#nm-edge-default)"}
                  strokeWidth={related ? 2.5 : 1.2}
                  fill="none"
                  strokeLinecap="round"
                />
                {showLabel && edge.label && (
                  <text
                    x={midX} y={(startY + endY) / 2 - 6}
                    textAnchor="middle" fontSize="10"
                    fill={related ? "#2d2a8e" : "#5e6586"}
                    fontWeight={related ? 600 : 400}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const p = positions[node.id];
            if (!p) return null;
            const tone = node.tone ?? "primary";
            const tm = TONE_META[tone];
            const r = node.r ?? NODE_R;
            const isSelected = selectedId === node.id;
            const isHovered = hoveredId === node.id;
            const isRelated = relatedSet.has(node.id);
            const dim = focusedId !== null && !isRelated;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer", opacity: dim ? 0.3 : 1, transition: "opacity 150ms" }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(node.id)}
              >
                {/* Halo / ring */}
                <circle
                  cx={p.x} cy={p.y}
                  r={r + (isHovered || isSelected ? 6 : 3)}
                  fill={tm.ring}
                  style={{ transition: "r 150ms" }}
                />
                {/* Selected outline */}
                {isSelected && (
                  <circle cx={p.x} cy={p.y} r={r + 8} fill="none" stroke={tm.fill} strokeWidth={1.5} opacity={0.45} />
                )}
                {/* Main */}
                <circle cx={p.x} cy={p.y} r={r} fill={tm.fill} />
                {/* Optional inner letter / score */}
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={tm.text}>
                  {firstChar(node.label)}
                </text>

                {/* Label below */}
                <text x={p.x} y={p.y + r + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f1334">
                  {node.label}
                </text>
                {node.sub && (
                  <text x={p.x} y={p.y + r + 30} textAnchor="middle" fontSize="10" fill="#5e6586">
                    {node.sub.length > 22 ? node.sub.slice(0, 20) + "…" : node.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail */}
      {selected ? (
        <NodeDetailPanel node={selected} onClose={() => setSelectedId(null)} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
          鼠标 hover 节点查看连接关系 · 点击节点查看详情
        </div>
      )}
    </div>
  );
}

function NodeDetailPanel({ node, onClose }: { node: NMNode; onClose: () => void }) {
  const tm = TONE_META[node.tone ?? "primary"];
  const d = node.detail || {};
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm animate-fade-up">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ background: tm.fill }}
          >
            <span className="text-base font-bold">{firstChar(node.label)}</span>
          </div>
          <div>
            <div className="text-sm font-semibold">{d.title || node.label}</div>
            {node.sub && <div className="text-[11px] text-muted-foreground">{node.sub}</div>}
            {d.badges && (
              <div className="mt-1 flex flex-wrap gap-1">
                {d.badges.map((b, i) => {
                  const t = TONE_META[b.tone ?? "primary"];
                  return (
                    <span key={i} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: t.ring, color: t.fill }}>
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

      {d.description && <p className="mb-3 text-xs text-foreground">{d.description}</p>}

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
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: tm.fill }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {(!d.description && !d.kv?.length && !d.bullets?.length) && (
        <div className="text-xs text-muted-foreground">点选节点暂无附加详情</div>
      )}
    </div>
  );
}

// =====================================================================
// Layout: place nodes in column slots by layer; auto-distribute y
// =====================================================================
const ROW_H = 95;
const TOP_PAD = 60;

function layout(nodes: NMNode[]) {
  const byLayer: Map<number, NMNode[]> = new Map();
  nodes.forEach((n) => {
    if (!byLayer.has(n.layer)) byLayer.set(n.layer, []);
    byLayer.get(n.layer)!.push(n);
  });
  const layerCount = Math.max(1, ...Array.from(byLayer.keys()).map((k) => k + 1));

  const positions: Record<string, { x: number; y: number }> = {};

  byLayer.forEach((arr, layer) => {
    const x = colX(layer, layerCount);
    arr.forEach((node, i) => {
      const y = node.y != null
        ? TOP_PAD + node.y * (arr.length * ROW_H)
        : TOP_PAD + i * ROW_H;
      positions[node.id] = { x, y };
    });
  });

  const maxRows = Math.max(0, ...Array.from(byLayer.values()).map((a) => a.length));
  const height = TOP_PAD + maxRows * ROW_H + 30;
  return { positions, height, layerCount };
}

function colX(layer: number, layerCount: number): number {
  if (layerCount === 1) return VB_W / 2;
  const padding = 110;
  const usable = VB_W - padding * 2;
  return padding + (layer / (layerCount - 1)) * usable;
}

function firstChar(s: string): string {
  const ch = (s || "?").trim()[0] || "?";
  return ch;
}
