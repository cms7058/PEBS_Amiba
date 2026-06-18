"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import type { CostFinding, MethodFinding, PerNode, TreeNode } from "../../lib/diagnosis";

const yuan = (n: number) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });

// 折叠容器：标题 + 计数，点击展开
export function Collapsible({ title, desc, count, tone = "muted", icon, defaultOpen = false, children }: {
  title: string; desc?: string; count?: number; tone?: "danger" | "warning" | "muted"; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toneCls = tone === "danger" ? "bg-red-100 text-red-700" : tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-5 py-3 text-left">
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        {icon}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
        </div>
        {typeof count === "number" && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneCls}`}>{count}</span>}
      </button>
      {open && <div className="border-t border-border px-5 py-4">{children}</div>}
    </div>
  );
}

// 成本超支直方图（横向条形）
export function CostOverspendChart({ findings }: { findings: CostFinding[] }) {
  if (findings.length === 0) return <div className="py-6 text-center text-xs text-muted-foreground">暂无超支项</div>;
  const data = findings.slice(0, 12).map((f) => ({
    name: `${f.nodeName.length > 8 ? f.nodeName.slice(0, 7) + "…" : f.nodeName}·${f.factorLabel.replace(/（.*）/, "")}`,
    std: Math.round(f.std), act: Math.round(f.act), diff: Math.round(f.diff),
  }));
  return (
    <div style={{ width: "100%", height: Math.max(260, data.length * 44) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" barGap={2} margin={{ top: 4, right: 36, bottom: 4, left: 8 }}>
          <XAxis type="number" tickFormatter={(v) => "¥" + v} fontSize={10} stroke="var(--color-muted-foreground, #94a3b8)" />
          <YAxis type="category" dataKey="name" width={150} fontSize={10} stroke="var(--color-muted-foreground, #94a3b8)" />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip formatter={(v: any, n: any) => [yuan(v), n]} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="std" name="标准参考" fill="#94a3b8" radius={[0, 3, 3, 0]} />
          <Bar dataKey="act" name="实际" fill="#dc2626" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 质量指标雷达图（四维均值 + 达标线 90）
export function QualityRadar({ nodes }: { nodes: PerNode[] }) {
  const keys: [keyof PerNode, string][] = [["inputAccuracy", "输入准确率"], ["inputTimeliness", "输入及时率"], ["outputAccuracy", "输出准确率"], ["outputTimeliness", "输出及时率"]];
  const data = keys.map(([k, label]) => {
    const xs = nodes.map((n) => n[k]).filter((v): v is number => typeof v === "number");
    return { metric: label, value: xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0, 达标: 90 };
  });
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--color-border, #e1e4ef)" />
          <PolarAngleAxis dataKey="metric" fontSize={11} stroke="var(--color-muted-foreground, #5e6586)" />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="达标线 90" dataKey="达标" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.12} />
          <Radar name="实际均值" dataKey="value" stroke="#2d2a8e" fill="#4a90d9" fillOpacity={0.42} />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip formatter={(v: any, n: any) => [v + "%", n]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 信息化差距：按 OTD 顶层节点归类，点击节点展开其活动
export function MethodGapByNode({ findings, tree }: { findings: MethodFinding[]; tree: TreeNode[] }) {
  const [openTop, setOpenTop] = useState<string | null>(null);
  if (findings.length === 0) return <div className="py-6 text-center text-xs text-muted-foreground">暂无信息化差距</div>;

  const collectIds = (n: TreeNode): string[] => [n.nodeId, ...n.children.flatMap(collectIds)];
  const idToTop = new Map<string, string>();
  tree.forEach((t) => collectIds(t).forEach((id) => idToTop.set(id, t.nodeName)));

  const groups = new Map<string, MethodFinding[]>();
  findings.forEach((f) => { const top = idToTop.get(f.nodeId) || "其他"; const arr = groups.get(top) || []; arr.push(f); groups.set(top, arr); });
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-1.5">
      {ordered.map(([top, items]) => {
        const on = openTop === top;
        return (
          <div key={top} className="rounded-md border border-border">
            <button type="button" onClick={() => setOpenTop(on ? null : top)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs">
              {on ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="flex-1 font-medium">{top}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{items.length} 项</span>
            </button>
            {on && (
              <div className="space-y-1 border-t border-border px-3 py-2">
                {items.map((f, i) => (
                  <div key={i} className="text-[11px]">
                    <span className="font-medium">{f.nodeName}</span>
                    <span className="ml-1 text-muted-foreground">实际：<span className="text-amber-700">{f.actual}</span> → 建议：<span className="text-emerald-700">{f.recommended}</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
