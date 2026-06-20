"use client";

import { Cog, Gauge, TrendingUp } from "lucide-react";
import { CostGroupedBar } from "../diagnosis/CostGroupedBar";
import { QualityRose } from "../diagnosis/QualityRose";
import type { QuickResult } from "../../lib/quick-diagnose";

const LV_COLOR = ["#94a3b8", "#dc2626", "#d97706", "#4a90d9", "#2d2a8e", "#16a34a"];

// 对话式快速诊断结果卡片 —— 适配 AI 助手抽屉（窄屏，单列堆叠）
export function QuickDiagnoseCard({ result }: { result: QuickResult }) {
  return (
    <div className="space-y-2.5 rounded-lg border border-[color:var(--primary)]/30 bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--primary)]">
        <Gauge className="h-3.5 w-3.5" /> 快速诊断结果
      </div>

      {/* 综合评价 */}
      <div className="flex items-center gap-3 rounded-md border border-border p-2.5">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: LV_COLOR[result.maturity.level] }}>
          <span className="text-base font-bold leading-none" style={{ color: LV_COLOR[result.maturity.level] }}>{result.maturity.overall}</span>
          <span className="text-[8px] text-muted-foreground">/100</span>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold" style={{ color: LV_COLOR[result.maturity.level] }}>{result.maturity.levelLabel}</div>
          <div className="text-[10px] leading-tight text-muted-foreground">识别 {result.nodeCount} 个环节 · 超支 {result.summary.overspend > 0 ? "¥" + Math.round(result.summary.overspend).toLocaleString("zh-CN") : "无"} · 信息化差距 {result.summary.methodGaps} · 质量问题 {result.summary.qualityIssues}</div>
        </div>
      </div>

      {/* 维度评分 */}
      <div className="grid grid-cols-3 gap-2">
        {result.maturity.dims.map((d) => (
          <div key={d.label}>
            <div className="flex items-center justify-between text-[9px]"><span className="text-muted-foreground">{d.label}</span><span className="font-mono">{d.score}</span></div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${d.score}%`, background: LV_COLOR[Math.min(5, Math.max(1, Math.round(d.score / 20)))] }} /></div>
          </div>
        ))}
      </div>

      {/* 成本超支 */}
      <div className="rounded-md border border-border p-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium"><TrendingUp className="h-3 w-3 text-red-600" />成本超支（标准 vs 实际）</div>
        {result.costFindings.length === 0 ? <div className="text-[10px] text-muted-foreground">未发现明显成本超支</div> : <CostGroupedBar findings={result.costFindings} top={8} />}
      </div>

      {/* 质量玫瑰图 */}
      <div className="rounded-md border border-border p-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium"><Gauge className="h-3 w-3 text-[color:var(--primary)]" />各环节质量（玫瑰图）</div>
        <QualityRose nodes={result.qualityNodes} />
      </div>

      {/* 信息化差距 */}
      <div className="rounded-md border border-border p-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium"><Cog className="h-3 w-3 text-amber-600" />信息化差距（实际方式 ≠ 推荐）</div>
        {result.methodFindings.length === 0 ? <div className="text-[10px] text-muted-foreground">未发现明显信息化差距</div> : (
          <div className="space-y-1">
            {result.methodFindings.map((f, i) => (
              <div key={i} className="text-[10px]"><span className="font-medium">{f.nodeName}</span><span className="ml-1 text-muted-foreground">实际：<span className="text-amber-700">{f.actual}</span> → 建议：<span className="text-emerald-700">{f.recommended}</span></span></div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[9px] text-muted-foreground">快速诊断为基于标准规则的即时评估，仅供参考；正式落地请走 规则引擎 → 诊断引擎 全链建模。</div>
    </div>
  );
}
