"use client";

import { useState } from "react";
import { Users, Cpu, Package, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import type { PerNode, NodeDim, TreeNode } from "../../lib/diagnosis";

// 诊断可视化：只读概览树（顶层 OTD 一行 → 点节点展开其子流程那一层）+ 维度杜邦归集树。
// 节点 dots = 本节点及其子树的汇总差值。色点：差值<0 结余=绿；差值>0 超支=红；容差内 持平=蓝；要素未录入=灰空心；节点未录入=黄 ⚠️。

type DotColor = "green" | "red" | "blue" | "none";

const DOT: Record<Exclude<DotColor, "none">, string> = {
  green: "var(--success)",
  red: "var(--danger)",
  blue: "var(--accent)",
};

function costColor(d: NodeDim): DotColor {
  if (d.std === 0 && d.act === 0) return "none";
  const tol = Math.max(1, d.std * 0.03);
  if (Math.abs(d.diff) <= tol) return "blue";
  return d.diff > 0 ? "red" : "green";
}

function qualityColor(v: number | undefined): DotColor {
  if (typeof v !== "number") return "none";
  if (v >= 95) return "green";
  if (v >= 90) return "blue";
  return "red";
}

function Dot({ color, size = 12 }: { color: DotColor; size?: number }) {
  if (color === "none")
    return <span style={{ width: size, height: size, borderRadius: "50%", border: "1.5px solid var(--border)", display: "inline-block" }} title="未录入" />;
  return <span style={{ width: size, height: size, borderRadius: "50%", background: DOT[color], display: "inline-block" }} />;
}

type Unit = "yuan" | "pct";
interface DimDef {
  key: string; label: string; unit: Unit;
  value: (n: PerNode) => number | undefined;
  color: (n: PerNode) => DotColor;
}

const yuan = (n: number) => (n > 0 ? "+" : "") + "¥" + Math.round(n).toLocaleString("zh-CN");
const fmt = (v: number, u: Unit) => (u === "pct" ? v + "%" : yuan(v));

const DIMS: DimDef[] = [
  { key: "labor", label: "人力成本差值", unit: "yuan", value: (n) => (n.hasData ? n.labor.diff : undefined), color: (n) => costColor(n.labor) },
  { key: "equipment", label: "工作方式成本差值", unit: "yuan", value: (n) => (n.hasData ? n.equipment.diff : undefined), color: (n) => costColor(n.equipment) },
  { key: "material", label: "材料成本差值", unit: "yuan", value: (n) => (n.hasData ? n.material.diff : undefined), color: (n) => costColor(n.material) },
  { key: "inputAccuracy", label: "输入准确率", unit: "pct", value: (n) => n.inputAccuracy, color: (n) => qualityColor(n.inputAccuracy) },
  { key: "inputTimeliness", label: "输入及时率", unit: "pct", value: (n) => n.inputTimeliness, color: (n) => qualityColor(n.inputTimeliness) },
  { key: "outputAccuracy", label: "输出准确率", unit: "pct", value: (n) => n.outputAccuracy, color: (n) => qualityColor(n.outputAccuracy) },
  { key: "outputTimeliness", label: "输出及时率", unit: "pct", value: (n) => n.outputTimeliness, color: (n) => qualityColor(n.outputTimeliness) },
];

export function DiagnosisViz({ tree, nodes }: { tree: TreeNode[]; nodes: PerNode[] }) {
  const [dimKey, setDimKey] = useState("outputAccuracy");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const dim = DIMS.find((x) => x.key === dimKey)!;

  const toggle = (id: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // 维度归集树：纳入该维度有值的叶子数据节点
  const rows = nodes
    .map((n) => ({ name: n.nodeName, v: dim.value(n), c: dim.color(n) }))
    .filter((r) => typeof r.v === "number") as { name: string; v: number; c: DotColor }[];

  const agg = dim.unit === "pct"
    ? (rows.length ? "均值 " + Math.round(rows.reduce((s, r) => s + r.v, 0) / rows.length) + "%" : "暂无数据")
    : "差值合计 " + yuan(rows.reduce((s, r) => s + r.v, 0));

  // 统计：三色点数量（全部数据节点 × 三要素）+ 未录入节点（树中无数据的叶子活动）
  const tally = { green: 0, red: 0, blue: 0, none: 0 };
  nodes.forEach((n) => [n.labor, n.equipment, n.material].forEach((d) => { tally[costColor(d)] += 1; }));
  const countEmptyLeaves = (items: TreeNode[]): number =>
    items.reduce((s, t) => s + (t.children.length ? countEmptyLeaves(t.children) : (t.hasData ? 0 : 1)), 0);
  const emptyNodes = countEmptyLeaves(tree);

  function Card({ n }: { n: TreeNode }) {
    const expandable = n.children.length > 0;
    const open = expanded.has(n.nodeId);
    return (
      <div
        onClick={() => expandable && toggle(n.nodeId)}
        className={`w-[150px] rounded-lg border px-3 py-2.5 ${expandable ? "cursor-pointer" : ""} ${n.hasData ? "border-border bg-card hover:border-[color:var(--primary)]/40" : "border-[color:var(--warning)]/50 bg-[color:var(--warning)]/5"}`}
      >
        <div className="mb-2 flex items-center gap-1">
          {expandable && (open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />)}
          <span className="truncate text-xs font-medium" title={n.nodeName}>{n.nodeName}</span>
        </div>
        {n.hasData ? (
          <div className="flex items-center justify-between">
            {([["labor", Users, costColor(n.labor)], ["equipment", Cpu, costColor(n.equipment)], ["material", Package, costColor(n.material)]] as const).map(([k, Icon, c]) => (
              <button
                key={k}
                onClick={(e) => { e.stopPropagation(); setDimKey(k); }}
                title={`查看「${DIMS.find((d) => d.key === k)!.label}」全节点归集`}
                className="flex flex-col items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted/60"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <Dot color={c} />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--warning)" }}>
            <AlertTriangle className="h-3.5 w-3.5" />未录入数据
          </div>
        )}
      </div>
    );
  }

  function Level({ items }: { items: TreeNode[] }) {
    return (
      <>
        <div className="flex flex-wrap gap-2.5">{items.map((n) => <Card key={n.nodeId} n={n} />)}</div>
        {items.filter((n) => expanded.has(n.nodeId) && n.children.length > 0).map((n) => (
          <div key={n.nodeId} className="ml-3 mt-2 border-l-2 border-border pl-3">
            <div className="mb-1.5 text-[11px] text-muted-foreground">{n.nodeName} · 子流程</div>
            <Level items={n.children} />
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计：三色点数量 + 未录入节点 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {([
          ["结余", tally.green, "green"],
          ["超支", tally.red, "red"],
          ["持平", tally.blue, "blue"],
          ["要素未录入", tally.none, "none"],
        ] as const).map(([label, n, c]) => (
          <div key={label} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Dot color={c} />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="ml-auto text-base font-semibold tabular-nums">{n}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--warning)]/50 bg-[color:var(--warning)]/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: "var(--warning)" }} />
          <span className="text-xs text-muted-foreground">未录入节点</span>
          <span className="ml-auto text-base font-semibold tabular-nums" style={{ color: "var(--warning)" }}>{emptyNodes}</span>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Dot color="green" />结余 (差值&lt;0)</span>
        <span className="flex items-center gap-1.5"><Dot color="red" />超支 (差值&gt;0)</span>
        <span className="flex items-center gap-1.5"><Dot color="blue" />持平 / 达标</span>
        <span className="flex items-center gap-1.5"><Dot color="none" />要素未录入</span>
        <span className="flex items-center gap-1.5" style={{ color: "var(--warning)" }}><AlertTriangle className="h-3.5 w-3.5" />节点未录入</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />人力</span>
          <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" />工作方式</span>
          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />材料</span>
        </span>
      </div>

      {/* 概览树：顶层一行，点击展开下一层（dots = 子树汇总差值） */}
      <div className="space-y-1">
        <Level items={tree} />
      </div>

      {/* 维度选择 */}
      <div className="flex flex-wrap gap-1.5">
        {DIMS.map((x) => {
          const on = x.key === dimKey;
          return (
            <button
              key={x.key}
              onClick={() => setDimKey(x.key)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 font-medium text-[color:var(--primary)]" : "border-border text-muted-foreground hover:border-[color:var(--primary)]/40"}`}
            >
              {x.label}
            </button>
          );
        })}
      </div>

      {/* 杜邦结构归集树（全部叶子数据节点） */}
      <div className="rounded-lg border border-border p-4">
        {rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">该维度暂无录入数据</div>
        ) : (
          <div>
            <div className="flex justify-center">
              <div className="rounded-lg border-[1.5px] border-[color:var(--primary)] px-4 py-2 text-center">
                <div className="text-sm font-medium">{dim.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{agg}</div>
              </div>
            </div>
            <div className="mx-auto h-4 w-px bg-border" />
            <div className="flex flex-wrap justify-center gap-2.5">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="min-w-[92px] rounded-b-lg border border-border px-3 py-2 text-center"
                  style={{ borderTop: `3px solid ${r.c === "none" ? "var(--border)" : DOT[r.c]}` }}
                >
                  <div className="truncate text-xs" title={r.name}>{r.name}</div>
                  <div className="mt-0.5 font-mono text-sm font-medium">{fmt(r.v, dim.unit)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
