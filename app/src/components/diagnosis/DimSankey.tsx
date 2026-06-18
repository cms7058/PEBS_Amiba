"use client";

import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";
import type { TreeNode } from "../../lib/diagnosis";

export type SankeyDim = "process" | "info" | "cost" | "quality" | "sound";

const STATUS: Record<string, string> = { good: "#16a34a", warn: "#d97706", bad: "#dc2626", neutral: "#64748b" };

function metricAvg(n: TreeNode): number | undefined {
  const xs = [n.inputAccuracy, n.inputTimeliness, n.outputAccuracy, n.outputTimeliness].filter((v): v is number => typeof v === "number");
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}
// 叶子在该维度的权重（桑基链路宽度）+ 状态色
function leafVal(n: TreeNode, dim: SankeyDim): number {
  switch (dim) {
    case "cost": return Math.max(0, n.labor.act + n.material.act);
    case "quality": return metricAvg(n) ?? 0;
    case "info": return n.infoLevel ?? 0;
    case "process": return n.hasData ? 1 : 0;
    case "sound": return 1;
  }
}
function leafStatus(n: TreeNode, dim: SankeyDim): string {
  switch (dim) {
    case "cost": { const d = n.labor.diff + n.material.diff; return d > 1 ? "bad" : d < -1 ? "good" : "neutral"; }
    case "quality": { const q = metricAvg(n); return q == null ? "neutral" : q < 90 ? "bad" : q < 95 ? "warn" : "good"; }
    case "info": { const l = n.infoLevel ?? 0; return l >= 4 ? "good" : l >= 3 ? "warn" : l > 0 ? "bad" : "neutral"; }
    case "process": return n.hasData ? "good" : "warn";
    case "sound": return "neutral";
  }
}

interface SNode { name: string; status: string; disp: string; agg: boolean }
interface SLink { source: number; target: number; value: number }

const leavesOf = (n: TreeNode): TreeNode[] => n.children.length ? n.children.flatMap(leavesOf) : [n];
// 聚合节点显示的维度汇总值（成本=合计¥；质量/信息化=均值；规范/健全=项数）
function dispFor(leaves: TreeNode[], dim: SankeyDim): string {
  switch (dim) {
    case "cost": { const s = leaves.reduce((a, c) => a + Math.max(0, c.labor.act + c.material.act), 0); return "¥" + Math.round(s).toLocaleString("zh-CN"); }
    case "quality": { const qs = leaves.map(metricAvg).filter((x): x is number => x != null); return qs.length ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) + "%" : "—"; }
    case "info": { const is = leaves.map((c) => c.infoLevel).filter((x): x is number => typeof x === "number"); return is.length ? "Lv " + (is.reduce((a, b) => a + b, 0) / is.length).toFixed(1) : "—"; }
    case "process": return leaves.filter((c) => c.hasData).length + " 项";
    case "sound": return leaves.length + " 项";
  }
}

function buildData(tree: TreeNode[], dim: SankeyDim) {
  const nodes: SNode[] = []; const links: SLink[] = [];
  const add = (name: string, status: string, disp: string, agg: boolean) => { nodes.push({ name, status, disp, agg }); return nodes.length - 1; };
  const val = (n: TreeNode): number => n.children.length ? n.children.reduce((s, c) => s + val(c), 0) : Math.max(0, leafVal(n, dim));
  const rootLeaves = tree.flatMap(leavesOf);
  const root = add("全流程", "neutral", dispFor(rootLeaves, dim), true);
  const walk = (n: TreeNode, parent: number) => {
    const v = val(n);
    if (v <= 0) return;
    const agg = n.children.length > 0;
    const i = add(n.nodeName, agg ? "neutral" : leafStatus(n, dim), agg ? dispFor(leavesOf(n), dim) : "", agg);
    links.push({ source: parent, target: i, value: v });
    n.children.forEach((c) => walk(c, i));
  };
  tree.forEach((t) => walk(t, root));
  return { nodes, links };
}

export function DimSankey({ tree, dim, unit }: { tree: TreeNode[]; dim: SankeyDim; unit?: string }) {
  const data = buildData(tree, dim);
  if (data.links.length === 0) return <div className="py-8 text-center text-xs text-muted-foreground">该维度暂无可绘制的节点数据</div>;
  const height = Math.max(320, Math.min(1100, data.nodes.length * 16));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Node = ({ x, y, width, height: h, payload }: any) => {
    const c = STATUS[payload.status] || STATUS.neutral;
    const right = x < 360;
    const tx = right ? x + width + 5 : x - 5;
    const anchor = right ? "start" : "end";
    return (
      <Layer>
        <Rectangle x={x} y={y} width={width} height={h} fill={c} fillOpacity={0.95} radius={2} />
        {payload.agg ? (
          <>
            <text x={tx} y={y + h / 2 - 5} textAnchor={anchor} dominantBaseline="middle" fontSize={10} fontWeight={600} fill="var(--color-foreground, #0f1334)">{payload.name}</text>
            <text x={tx} y={y + h / 2 + 7} textAnchor={anchor} dominantBaseline="middle" fontSize={10} fill="#2d2a8e">{payload.disp}</text>
          </>
        ) : (
          <text x={tx} y={y + h / 2} textAnchor={anchor} dominantBaseline="middle" fontSize={10} fill="var(--color-foreground, #0f1334)">{payload.name}</text>
        )}
      </Layer>
    );
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = (p: any) => {
    const c = STATUS[p?.payload?.target?.status] || STATUS.neutral;
    const d = `M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`;
    return <path d={d} fill="none" stroke={c} strokeWidth={Math.max(1, p.linkWidth)} strokeOpacity={0.22} />;
  };

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey data={data} node={Node} link={Link} nodePadding={10} nodeWidth={10} margin={{ top: 8, right: 130, bottom: 8, left: 70 }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip formatter={(v: any) => [`${v}${unit || ""}`, "汇总"]} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
