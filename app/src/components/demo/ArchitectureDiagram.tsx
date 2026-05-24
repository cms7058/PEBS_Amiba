"use client";

import { useMemo, useState } from "react";
import {
  Network, Database, Server, Wrench, BarChart3, Bell, X,
  Cpu, FileSpreadsheet, Sparkles, type LucideIcon,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ArchNode, ArchEdge, DataArchitecture, ArchLayer } from "../../lib/demo-data";

const NODE_ICONS: Record<string, LucideIcon> = {
  iot: Cpu,
  mes: Server,
  erp: Database,
  manual: FileSpreadsheet,
  cost_eng: Network,
  transfer_calc: Wrench,
  waste_model: Sparkles,
  amiba_pl: BarChart3,
  waste_dash: BarChart3,
  alerts: Bell,
};

const LAYER_META: Record<ArchLayer, { label: string; color: string; subtle: string }> = {
  source: { label: "数据源层",          color: "#2d2a8e", subtle: "rgba(45,42,142,0.10)" },
  hub:    { label: "数据中台 / 引擎层", color: "#16a34a", subtle: "rgba(22,163,74,0.10)" },
  output: { label: "应用 / 看板层",     color: "#d97706", subtle: "rgba(217,119,6,0.10)" },
};

const STATUS_META: Record<ArchNode["status"], { label: string; color: string }> = {
  live:    { label: "已上线",   color: "#16a34a" },
  partial: { label: "部分上线", color: "#d97706" },
  planned: { label: "规划中",   color: "#94a3b8" },
};

// SVG viewBox is fixed 1000 × HEIGHT for crisp coords.
const VB_W = 1000;
const COL_X = { source: 130, hub: 500, output: 870 };
const NODE_R = 26;
const ROW_H = 90;
const TOP_PAD = 70;

function layout(nodes: ArchNode[]) {
  const byLayer: Record<ArchLayer, ArchNode[]> = { source: [], hub: [], output: [] };
  nodes.forEach((n) => byLayer[n.layer].push(n));

  const positions: Record<string, { x: number; y: number }> = {};
  (Object.keys(byLayer) as ArchLayer[]).forEach((layer) => {
    const arr = byLayer[layer];
    arr.forEach((node, i) => {
      positions[node.id] = {
        x: COL_X[layer],
        y: TOP_PAD + i * ROW_H,
      };
    });
  });
  const maxRows = Math.max(byLayer.source.length, byLayer.hub.length, byLayer.output.length);
  const height = TOP_PAD + maxRows * ROW_H + 40;

  return { positions, height };
}

export function ArchitectureDiagram({ data }: { data: DataArchitecture }) {
  const [selected, setSelected] = useState<ArchNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const { positions, height } = useMemo(() => layout(data.nodes), [data.nodes]);

  // Edges related to current selection / hover (for highlighting)
  const focusedNodeId = hovered || selected?.id;
  const relatedEdges = useMemo(
    () => data.edges.map((e) => ({
      ...e,
      related: focusedNodeId ? (e.from === focusedNodeId || e.to === focusedNodeId) : false,
    })),
    [data.edges, focusedNodeId]
  );
  const relatedNodeIds = useMemo(() => {
    if (!focusedNodeId) return new Set<string>();
    const set = new Set([focusedNodeId]);
    data.edges.forEach((e) => {
      if (e.from === focusedNodeId) set.add(e.to);
      if (e.to === focusedNodeId) set.add(e.from);
    });
    return set;
  }, [data.edges, focusedNodeId]);

  return (
    <div className="space-y-3">
      {/* Layer legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {(Object.keys(LAYER_META) as ArchLayer[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: LAYER_META[k].color }} />
            <span className="text-muted-foreground">{LAYER_META[k].label}</span>
          </div>
        ))}
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">点击节点查看字段、对接方式与该节点产出的图表</span>
      </div>

      {/* Diagram canvas */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <svg
          viewBox={`0 0 ${VB_W} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full"
          style={{ minHeight: 320, maxHeight: 480 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <defs>
            <linearGradient id="edge-default" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edge-active" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2d2a8e" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#4a90d9" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Column titles */}
          {(Object.keys(LAYER_META) as ArchLayer[]).map((k) => (
            <g key={k}>
              <rect
                x={COL_X[k] - 90}
                y={20}
                width={180}
                height={28}
                rx={14}
                fill={LAYER_META[k].subtle}
              />
              <text
                x={COL_X[k]}
                y={38}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill={LAYER_META[k].color}
              >
                {LAYER_META[k].label}
              </text>
            </g>
          ))}

          {/* Edges (drawn first so nodes overlay them) */}
          {relatedEdges.map((edge, i) => (
            <EdgeCurve
              key={i}
              edge={edge}
              positions={positions}
              dim={focusedNodeId !== null && !edge.related}
              highlight={edge.related}
            />
          ))}

          {/* Nodes */}
          {data.nodes.map((node) => {
            const p = positions[node.id];
            if (!p) return null;
            const Icon = NODE_ICONS[node.id] || Network;
            const layerColor = LAYER_META[node.layer].color;
            const statusColor = STATUS_META[node.status].color;
            const isSelected = selected?.id === node.id;
            const isFocused = focusedNodeId === node.id;
            const isRelated = relatedNodeIds.has(node.id);
            const dim = focusedNodeId !== null && !isRelated;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity 150ms" }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(node)}
              >
                {/* Pulse ring on selected */}
                {isSelected && (
                  <circle cx={p.x} cy={p.y} r={NODE_R + 6} fill="none" stroke={layerColor} strokeWidth={1.5} opacity={0.4} />
                )}
                {/* Outer halo on hover */}
                <circle
                  cx={p.x} cy={p.y} r={NODE_R + (isFocused || isSelected ? 4 : 0)}
                  fill={LAYER_META[node.layer].subtle}
                  style={{ transition: "r 150ms" }}
                />
                {/* Main circle */}
                <circle
                  cx={p.x} cy={p.y} r={NODE_R}
                  fill="#fff"
                  stroke={layerColor}
                  strokeWidth={isSelected ? 3 : 2}
                />
                {/* Icon foreign object */}
                <foreignObject x={p.x - 12} y={p.y - 12} width={24} height={24}>
                  <div style={{ color: layerColor }} className="flex h-full w-full items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                </foreignObject>
                {/* Status dot */}
                <circle cx={p.x + NODE_R - 6} cy={p.y - NODE_R + 6} r={4.5} fill={statusColor} stroke="#fff" strokeWidth={1.5} />

                {/* Label */}
                <text
                  x={p.x} y={p.y + NODE_R + 18}
                  textAnchor="middle" fontSize="12" fontWeight="600"
                  fill="#0f1334"
                >
                  {node.shortLabel || node.label}
                </text>
                {node.vendor && (
                  <text
                    x={p.x} y={p.y + NODE_R + 32}
                    textAnchor="middle" fontSize="10"
                    fill="#5e6586"
                  >
                    {node.vendor.length > 20 ? node.vendor.slice(0, 18) + "…" : node.vendor}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail card (rich, includes chart) */}
      {selected ? (
        <NodeDetail node={selected} onClose={() => setSelected(null)} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
          鼠标 hover 可看连接关系 · 点击节点查看其字段、集成方式与产出的实时图表
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Edge: bezier curve between two nodes
// =====================================================================
function EdgeCurve({
  edge, positions, dim, highlight,
}: {
  edge: ArchEdge & { related?: boolean };
  positions: Record<string, { x: number; y: number }>;
  dim: boolean;
  highlight: boolean;
}) {
  const from = positions[edge.from];
  const to = positions[edge.to];
  if (!from || !to) return null;

  // start: right edge of from; end: left edge of to
  const startX = from.x + NODE_R;
  const startY = from.y;
  const endX = to.x - NODE_R;
  const endY = to.y;
  const midX = (startX + endX) / 2;
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

  return (
    <g style={{ opacity: dim ? 0.15 : 1, transition: "opacity 150ms" }}>
      <path
        d={path}
        stroke={highlight ? "url(#edge-active)" : "url(#edge-default)"}
        strokeWidth={highlight ? 2.5 : 1.2}
        fill="none"
        strokeLinecap="round"
      />
      {highlight && edge.label && (
        <text
          x={midX} y={(startY + endY) / 2 - 6}
          textAnchor="middle" fontSize="10"
          fill="#2d2a8e" fontWeight="600"
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}

// =====================================================================
// Node detail card (with embedded chart)
// =====================================================================
function NodeDetail({ node, onClose }: { node: ArchNode; onClose: () => void }) {
  const layerColor = LAYER_META[node.layer].color;
  const statusColor = STATUS_META[node.status].color;
  const Icon = NODE_ICONS[node.id] || Network;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm animate-fade-up">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
            style={{ background: layerColor }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">{node.label}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-md px-1.5 py-0.5" style={{ background: LAYER_META[node.layer].subtle, color: layerColor }}>
                {LAYER_META[node.layer].label}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
                {STATUS_META[node.status].label}
              </span>
              {node.vendor && <span>· {node.vendor}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-3 text-xs text-foreground">{node.description}</p>

      <div className="grid gap-3 lg:grid-cols-5">
        {/* Left: fields + integration */}
        <div className="space-y-3 lg:col-span-2">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">关键数据字段</div>
            <div className="flex flex-wrap gap-1">
              {node.dataFields.map((f, i) => (
                <span key={i} className="rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px]">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">集成方式</div>
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs">{node.integration}</div>
          </div>
        </div>

        {/* Right: node-specific chart */}
        <div className="lg:col-span-3">
          {node.chart ? (
            <NodeChart chart={node.chart} layerColor={layerColor} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
              该节点暂无可视化样例
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NodeChart({ chart, layerColor }: { chart: NonNullable<ArchNode["chart"]>; layerColor: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-1">
        <div className="text-xs font-semibold">{chart.title}</div>
        {chart.subtitle && <div className="text-[10px] text-muted-foreground">{chart.subtitle}</div>}
      </div>

      {chart.kind === "line" && chart.series && (
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart.series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`area-${chart.title}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%"   stopColor={layerColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={layerColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#5e6586" }} />
              <YAxis tick={{ fontSize: 10, fill: "#5e6586" }} width={36} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}${chart.unit ? " " + chart.unit : ""}`, ""]} />
              <Area type="monotone" dataKey="y" stroke={layerColor} strokeWidth={2} fill={`url(#area-${chart.title})`} animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {chart.kind === "bar" && chart.series && (
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart.series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#5e6586" }} />
              <YAxis tick={{ fontSize: 10, fill: "#5e6586" }} width={36} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}${chart.unit ? " " + chart.unit : ""}`, ""]} cursor={{ fill: "rgba(45,42,142,0.05)" }} />
              <Bar dataKey="y" fill={layerColor} radius={[4, 4, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(chart.kind === "pie" || chart.kind === "donut") && chart.slices && (
        <div className="flex items-center gap-3">
          <div className="h-[140px] w-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chart.slices} dataKey="value" innerRadius={chart.kind === "donut" ? 38 : 0}
                  outerRadius={60} paddingAngle={1.5} stroke="#fff" strokeWidth={2}
                  animationDuration={900}
                >
                  {chart.slices.map((s, i) => <Cell key={i} fill={s.color || layerColor} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {chart.slices.map((s) => {
              const total = chart.slices!.reduce((a, b) => a + b.value, 0);
              return (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: s.color || layerColor }} />
                  <span className="flex-1 truncate text-muted-foreground">{s.name}</span>
                  <span className="font-mono text-foreground">{((s.value / total) * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chart.kind === "stat" && chart.stats && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {chart.stats.map((s, i) => {
            const tones = {
              primary: "bg-[color:var(--primary)]/8 text-[color:var(--primary)]",
              success: "bg-emerald-50 text-emerald-700",
              warning: "bg-amber-50 text-amber-700",
              danger:  "bg-red-50 text-red-700",
              muted:   "bg-muted text-foreground",
            } as const;
            const tone = s.tone || "muted";
            return (
              <div key={i} className={`rounded-md px-3 py-2 ${tones[tone]}`}>
                <div className="text-[10px] opacity-70">{s.label}</div>
                <div className="mt-0.5 font-mono text-sm font-semibold">{s.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {chart.kind === "kv" && chart.kv && (
        <ul className="space-y-1">
          {chart.kv.map((kv, i) => (
            <li key={i} className="flex items-center justify-between border-b border-border py-1 text-xs last:border-0">
              <span className="text-muted-foreground">{kv.k}</span>
              <span className="font-mono text-foreground">{kv.v}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Stats strip beneath the main chart (when line/bar/donut have extra stats) */}
      {chart.stats && (chart.kind === "line" || chart.kind === "bar") && (
        <div className="mt-2 flex flex-wrap gap-2">
          {chart.stats.map((s, i) => {
            const tones = {
              primary: "bg-[color:var(--primary)]/8 text-[color:var(--primary)]",
              success: "bg-emerald-50 text-emerald-700",
              warning: "bg-amber-50 text-amber-700",
              danger:  "bg-red-50 text-red-700",
              muted:   "bg-muted text-muted-foreground",
            } as const;
            const tone = s.tone || "muted";
            return (
              <span key={i} className={`rounded-md px-2 py-0.5 text-[10px] ${tones[tone]}`}>
                <span className="opacity-70">{s.label}</span> <span className="font-mono font-semibold">{s.value}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { ArchEdge };
