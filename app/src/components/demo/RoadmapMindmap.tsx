"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, LabelList,
} from "recharts";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { G6Mindmap, type MindNode } from "../g6/G6Mindmap";
import { TONE_COLOR, type G6Tone } from "../g6/G6Network";
import { getEnterpriseRoadmap, type RoadmapNode, type RoadmapChart } from "../../lib/demo-data";

/**
 * Master mindmap card for an enterprise — moved from planning into profile.
 * Optionally bubbles selected-node info up to a parent (so floating chat can
 * sync subject).
 */
export function RoadmapMindmapCard({
  slug, onNodeSelected, title, desc,
}: {
  slug: string;
  onNodeSelected?: (s: { label: string; meta?: Record<string, unknown> } | null) => void;
  title?: string;
  desc?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<MindNode | null>(null);
  const roadmap = getEnterpriseRoadmap(slug);
  const root = useRoadmapAsMind(roadmap);

  function pick(n: MindNode | null) {
    setSelected(n);
    onNodeSelected?.(n ? { label: n.label, meta: n.meta } : null);
  }

  return (
    <Card>
      <CardHeader
        title={title || "阿米巴落地全景思维导图"}
        desc={
          desc ?? (
            <div className="space-y-1">
              <div>一张图看清落地全貌 · 中心 = 企业 · 7 个分支 = 现状 / 去除 / 改造 / 新建 / 规则 / 步骤 / 风险 · 点击节点 AI 助手会同步该上下文</div>
              <ToneLegend />
            </div>
          )
        }
      />
      <CardBody className="px-0 py-0">
        <G6Mindmap root={root} height={560} onNodeClick={(n) => pick(n)} />
        {selected && (
          <div className="px-5 py-4">
            <RoadmapNodeCard node={selected} onClose={() => pick(null)} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function ToneLegend() {
  const items: Array<{ tone: G6Tone; label: string }> = [
    { tone: "keep",    label: "沿用" },
    { tone: "remove",  label: "去除" },
    { tone: "modify",  label: "改造" },
    { tone: "new",     label: "新建" },
    { tone: "rule",    label: "规则" },
    { tone: "ok",      label: "已完成" },
    { tone: "warn",    label: "中风险" },
    { tone: "bad",     label: "高风险" },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.tone} className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TONE_COLOR[it.tone] }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function useRoadmapAsMind(r: RoadmapNode): MindNode {
  return {
    id: r.id,
    label: r.label,
    tone: r.tone as G6Tone,
    meta: { ...(r.detail || {}), __chart: r.chart } as Record<string, unknown>,
    children: r.children?.map(useRoadmapAsMind),
  };
}

function RoadmapNodeCard({ node, onClose }: { node: MindNode; onClose: () => void }) {
  const tone = (node.tone as G6Tone) || "primary";
  const color = TONE_COLOR[tone];
  const meta = (node.meta || {}) as Record<string, unknown>;
  const detail = meta as {
    description?: string;
    owner?: string;
    dataSource?: string;
    method?: string;
    risk?: string;
    mitigation?: string;
    eta?: string;
    cost?: string;
  };
  const chart = meta.__chart as RoadmapChart | undefined;
  const hasText = !!(detail.description || detail.dataSource || detail.method || detail.owner || detail.eta || detail.cost || detail.risk || detail.mitigation);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm animate-fade-up">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ background: color }}>
            <span className="text-base font-bold">{(node.label || "?")[0]}</span>
          </div>
          <div>
            <div className="text-sm font-semibold">{node.label}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
              <span className="rounded-md px-1.5 py-0.5" style={{ background: color + "22", color }}>
                {toneLabel(tone)}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!hasText && !chart ? (
        <div className="text-xs text-muted-foreground">该节点为分类汇总，点击子节点查看详情。</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {hasText && (
            <ul className="space-y-1.5 text-xs">
              {detail.description && <DetailRow label="说明" value={detail.description} />}
              {detail.dataSource && <DetailRow label="数据源" value={detail.dataSource} mono />}
              {detail.method && <DetailRow label="采集 / 实施方式" value={detail.method} />}
              {detail.owner && <DetailRow label="责任人" value={detail.owner} />}
              {detail.eta && <DetailRow label="时间窗口" value={detail.eta} mono />}
              {detail.cost && <DetailRow label="预算 / 投入" value={detail.cost} mono />}
              {detail.risk && <DetailRow label="风险" value={detail.risk} tone="bad" />}
              {detail.mitigation && <DetailRow label="缓解措施" value={detail.mitigation} tone="ok" />}
            </ul>
          )}
          {chart && (
            <div className={`rounded-md border border-border bg-muted/20 p-3 ${!hasText ? "lg:col-span-2" : ""}`}>
              <RoadmapChartView chart={chart} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: "ok" | "bad" }) {
  return (
    <li className="flex gap-3">
      <div className="w-28 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`flex-1 ${mono ? "font-mono" : ""} ${tone === "bad" ? "text-red-700" : tone === "ok" ? "text-emerald-700" : "text-foreground"}`}>
        {value}
      </div>
    </li>
  );
}

function toneLabel(t: G6Tone): string {
  return ({
    keep: "沿用", remove: "去除", modify: "改造", new: "新建", rule: "规则",
    ok: "已完成", warn: "需关注", bad: "高风险", primary: "主节点", neutral: "中性",
  } as Record<G6Tone, string>)[t];
}

// =====================================================================
// Chart renderer
// =====================================================================
function RoadmapChartView({ chart }: { chart: RoadmapChart }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-foreground">{chart.title}</div>
      {chart.kind === "bars" && <BarsChart data={chart.data} unit={chart.unit} />}
      {chart.kind === "donut" && <DonutChart data={chart.data} />}
      {chart.kind === "progress" && <ProgressList items={chart.items} />}
      {chart.kind === "formula" && <FormulaView formula={chart.formula} example={chart.example} />}
      {chart.kind === "stat" && <StatGrid items={chart.items} />}
      {chart.kind === "table" && <SimpleTable columns={chart.columns} rows={chart.rows} />}
    </div>
  );
}

function BarsChart({ data, unit }: { data: { label: string; value: number; threshold?: number; tone?: G6Tone }[]; unit?: string }) {
  if (data.length === 0) return <div className="py-4 text-center text-xs text-muted-foreground">无数据</div>;
  const min = Math.min(0, ...data.map((d) => d.value));
  const threshold = data.find((d) => d.threshold !== undefined)?.threshold;
  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 80, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis type="number" domain={[Math.min(min, 0), "auto"]} tick={{ fontSize: 10, fill: "#5e6586" }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#0f1334" }} width={80} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}${unit ? " " + unit : ""}`, ""]} cursor={{ fill: "rgba(45,42,142,0.05)" }} />
          {threshold !== undefined && <ReferenceLine x={threshold} stroke="#94a3b8" strokeDasharray="3 3" />}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
            {data.map((d, i) => {
              const t: G6Tone = d.tone || "primary";
              return <Cell key={i} fill={TONE_COLOR[t]} />;
            })}
            <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#0f1334" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutChart({ data }: { data: { name: string; value: number; color?: string }[] }) {
  if (data.length === 0) return <div className="py-4 text-center text-xs text-muted-foreground">无数据</div>;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-3">
      <div className="h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={1.5} stroke="#fff" strokeWidth={2} animationDuration={900}>
              {data.map((s, i) => <Cell key={i} fill={s.color || TONE_COLOR.primary} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-1 text-[11px]">
        {data.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: s.color || TONE_COLOR.primary }} />
            <span className="flex-1 truncate text-muted-foreground">{s.name}</span>
            <span className="font-mono text-foreground">{s.value}</span>
            <span className="w-9 text-right font-mono text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressList({ items }: { items: { label: string; progress: number; note?: string }[] }) {
  if (items.length === 0) return <div className="py-2 text-center text-xs text-muted-foreground">无</div>;
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i}>
          <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
            <span className="font-medium">{it.label}</span>
            <span className="font-mono text-muted-foreground">{it.progress}% {it.note && <span className="ml-1">· {it.note}</span>}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                it.progress === 100 ? "bg-emerald-500" : it.progress > 0 ? "bg-[color:var(--primary)]" : "bg-muted-foreground/30"
              }`}
              style={{ width: `${it.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormulaView({ formula, example }: { formula: string; example?: string }) {
  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-md border border-border bg-[color:var(--primary)]/[0.04] px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
{formula}
      </pre>
      {example && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">应用示例</div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">{example}</pre>
        </div>
      )}
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string; tone?: G6Tone }[] }) {
  if (items.length === 0) return <div className="py-2 text-xs text-muted-foreground">无</div>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it, i) => {
        const t: G6Tone = it.tone || "neutral";
        const c = TONE_COLOR[t];
        return (
          <div key={i} className="rounded-md px-3 py-2" style={{ background: c + "12" }}>
            <div className="text-[10px] text-muted-foreground">{it.label}</div>
            <div className="mt-0.5 font-mono text-base font-semibold" style={{ color: c }}>{it.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead className="border-b border-border bg-muted/40 text-muted-foreground">
          <tr>
            {columns.map((c, i) => <th key={i} className="px-2 py-1 text-left font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((cell, j) => <td key={j} className="px-2 py-1 text-foreground">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
