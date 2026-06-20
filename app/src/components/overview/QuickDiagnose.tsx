"use client";

import { useState } from "react";
import { Zap, Upload, Loader2, Cog, Gauge, TrendingUp } from "lucide-react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { CostGroupedBar } from "../diagnosis/CostGroupedBar";
import { QualityRose } from "../diagnosis/QualityRose";
import { extractText } from "../../lib/doc-parse";
import { chatStream, loadSettings } from "../../lib/llm";
import { QUICK_SYS, stripJson, parseRawToNodes, quickDiagnose, QUICK_SAMPLE, type QuickResult } from "../../lib/quick-diagnose";

const LV_COLOR = ["#94a3b8", "#dc2626", "#d97706", "#4a90d9", "#2d2a8e", "#16a34a"];

export function QuickDiagnose() {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [streamN, setStreamN] = useState(0);

  async function onFile(file: File) {
    setParsing(true); setErr(null);
    try { const t = await extractText(file); setText((cur) => (cur ? cur + "\n" : "") + t); }
    catch (e) { setErr("文件解析失败：" + (e as Error).message); }
    finally { setParsing(false); }
  }

  async function run() {
    if (!text.trim()) { setErr("请先粘贴流程/成本描述，或上传文档。"); return; }
    setErr(null); setRunning(true); setResult(null); setStreamN(0);
    try {
      const s = loadSettings();
      const provider = s.providers[s.defaultProvider];
      if (!provider?.apiKey) throw new Error(`默认模型「${provider?.name || s.defaultProvider}」未配置 API Key，请到「模型与设置」配置。`);
      let raw = "";
      await chatStream({ provider, messages: [{ role: "system", content: QUICK_SYS }, { role: "user", content: text.slice(0, 6000) }], onChunk: (t) => { raw += t; setStreamN((n) => n + t.length); } });
      let parsed;
      try { parsed = JSON.parse(stripJson(raw)); } catch { throw new Error("AI 未返回有效结构，请重试或精简描述。"); }
      const nodes = parseRawToNodes(parsed);
      if (!nodes.length) throw new Error("未能从描述中识别出业务环节，请补充流程/成本信息。");
      setResult(quickDiagnose(nodes));
    } catch (e) { setErr((e as Error).message); }
    finally { setRunning(false); }
  }

  function sample() { setErr(null); setResult(quickDiagnose(QUICK_SAMPLE)); }

  return (
    <Card>
      <CardHeader title="⚡ 快速诊断（AI · 文字/文档 → 标准规则引擎）" desc="描述企业流程/成本/信息化现状，AI 解析后用内置标准规则即时诊断，结论以卡片呈现（不生成画像/部署）"
        action={<Zap className="h-4 w-4 text-[color:var(--primary)]" />} />
      <CardBody className="space-y-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="例：我们报价靠手工 Excel，人工成本约比同行高 50%；生产用 MES，但质量检验靠人工记录，准确率约 80%；BOM 用 Excel 传递…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">
            {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} 上传文档
            <input type="file" accept=".txt,.md,.csv,.docx,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          </label>
          <Button size="sm" onClick={run} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} 开始快速诊断</Button>
          <Button size="sm" variant="outline" onClick={sample} disabled={running}>加载样例</Button>
          {running && <span className="text-[11px] text-muted-foreground">AI 解析中… {streamN} 字</span>}
        </div>
        {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}

        {result && (
          <div className="space-y-3 border-t border-border pt-3">
            {/* 综合评价 */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-3">
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: LV_COLOR[result.maturity.level] }}>
                <span className="text-lg font-bold leading-none" style={{ color: LV_COLOR[result.maturity.level] }}>{result.maturity.overall}</span>
                <span className="text-[9px] text-muted-foreground">/100</span>
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: LV_COLOR[result.maturity.level] }}>{result.maturity.levelLabel}</div>
                <div className="text-[11px] text-muted-foreground">识别 {result.nodeCount} 个环节 · 超支 {result.summary.overspend > 0 ? "¥" + Math.round(result.summary.overspend).toLocaleString("zh-CN") : "无"} · 信息化差距 {result.summary.methodGaps} · 质量问题 {result.summary.qualityIssues}</div>
              </div>
              <div className="ml-auto flex gap-3">
                {result.maturity.dims.map((d) => (
                  <div key={d.label} className="w-24">
                    <div className="flex items-center justify-between text-[10px]"><span className="text-muted-foreground">{d.label}</span><span className="font-mono">{d.score}</span></div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${d.score}%`, background: LV_COLOR[Math.min(5, Math.max(1, Math.round(d.score / 20)))] }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {/* 成本超支 直方图 */}
              <div className="rounded-lg border border-border p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium"><TrendingUp className="h-3.5 w-3.5 text-red-600" />成本超支（标准 vs 实际）</div>
                <CostGroupedBar findings={result.costFindings} top={10} />
              </div>
              {/* 质量 玫瑰图 */}
              <div className="rounded-lg border border-border p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium"><Gauge className="h-3.5 w-3.5 text-[color:var(--primary)]" />各环节质量（玫瑰图）</div>
                <QualityRose nodes={result.qualityNodes} />
              </div>
            </div>

            {/* 信息化差距 */}
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium"><Cog className="h-3.5 w-3.5 text-amber-600" />信息化差距（实际方式 ≠ 推荐）</div>
              {result.methodFindings.length === 0 ? <div className="text-[11px] text-muted-foreground">未发现明显信息化差距</div> : (
                <div className="space-y-1">
                  {result.methodFindings.map((f, i) => (
                    <div key={i} className="text-[11px]"><span className="font-medium">{f.nodeName}</span><span className="ml-1 text-muted-foreground">实际：<span className="text-amber-700">{f.actual}</span> → 建议：<span className="text-emerald-700">{f.recommended}</span></span></div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">快速诊断为基于标准规则的即时评估，仅供参考；正式落地请走 规则引擎 → 诊断引擎 全链建模。</div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
