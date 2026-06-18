"use client";

import { useState } from "react";
import { Gauge, TrendingUp, Network } from "lucide-react";
import type { Maturity, TreeNode } from "../../lib/diagnosis";
import { DimSankey, type SankeyDim } from "./DimSankey";

const LV_COLOR = ["#94a3b8", "#dc2626", "#d97706", "#4a90d9", "#2d2a8e", "#16a34a"];
const SANKEY_UNIT: Record<string, string> = { cost: " 元", quality: "%", info: " 级", process: " 项", sound: " 项" };

export function MaturityPanel({ maturity: mt, tree }: { maturity: Maturity; tree?: TreeNode[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const selDim = mt.dims.find((d) => d.key === sel);
  return (
    <div className="space-y-4">
      {/* 综合得分 + 等级 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: LV_COLOR[mt.level] }}>
            <span className="text-xl font-bold leading-none" style={{ color: LV_COLOR[mt.level] }}>{mt.overall}</span>
            <span className="text-[9px] text-muted-foreground">/100</span>
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: LV_COLOR[mt.level] }}>{mt.levelLabel}</div>
            <div className="max-w-md text-xs text-muted-foreground">{mt.summary}</div>
          </div>
        </div>
      </div>

      {/* 维度评分条（点击查看该维度按节点/层级的桑基图） */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {mt.dims.map((d) => {
          const on = sel === d.key;
          return (
            <button key={d.key} type="button" onClick={() => tree && setSel(on ? null : d.key)}
              className={`rounded-lg border p-2.5 text-left transition-colors ${on ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]/30" : "border-border"} ${tree ? "cursor-pointer hover:border-[color:var(--primary)]/50" : ""}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-medium">{tree && <Network className="h-3 w-3 text-muted-foreground" />}{d.label}</span>
                <span className="font-mono text-sm font-semibold" style={{ color: LV_COLOR[d.level] }}>{d.score} · L{d.level}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: LV_COLOR[d.level] }} />
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground">{d.basis}</div>
              <div className="mt-0.5 text-[10px]"><span className="text-[color:var(--primary)]">建议：</span>{d.advice}</div>
            </button>
          );
        })}
      </div>

      {/* 选中维度 → 按 OTD 节点与层级的桑基图 */}
      {tree && selDim && (
        <div className="rounded-lg border border-[color:var(--primary)]/30 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
            <Network className="h-3.5 w-3.5 text-[color:var(--primary)]" />「{selDim.label}」按 OTD 节点与层级分布（桑基图）
            <span className="text-[10px] font-normal text-muted-foreground">链路宽度=该维度汇总 · 颜色=好/警/差 · 列=层级</span>
          </div>
          <DimSankey tree={tree} dim={selDim.key as SankeyDim} unit={SANKEY_UNIT[selDim.key]} />
        </div>
      )}

      {/* 自动化方式分布 + 改进路线 */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium"><Gauge className="h-3.5 w-3.5 text-[color:var(--primary)]" /> 工作方式自动化分布</div>
          {mt.modeDist.length === 0 ? <div className="text-[11px] text-muted-foreground">暂无工作方式数据</div> : (
            <div className="space-y-1.5">
              {mt.modeDist.map((d) => {
                const max = Math.max(...mt.modeDist.map((x) => x.count));
                return (
                  <div key={d.level} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 shrink-0 text-muted-foreground">{d.label}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                      <div className="h-full rounded" style={{ width: `${Math.round((d.count / max) * 100)}%`, background: LV_COLOR[d.level] }} />
                    </div>
                    <span className="w-7 shrink-0 text-right font-mono">{d.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium"><TrendingUp className="h-3.5 w-3.5 text-[color:var(--primary)]" /> 改进路线（按优先级）</div>
          <ol className="space-y-1.5">
            {mt.recommendations.map((r, i) => (
              <li key={i} className="text-[11px]">
                <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[9px] font-semibold text-[color:var(--primary)]">{i + 1}</span>
                <span className="font-medium">{r.title}</span>
                <div className="ml-5 text-muted-foreground">{r.detail}</div>
                <div className="ml-5 text-emerald-700">预期：{r.impact}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
