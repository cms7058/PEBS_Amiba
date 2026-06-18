"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, TrendingUp, Gauge } from "lucide-react";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from "recharts";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { EngineChat } from "../../../../components/agent/EngineChat";
import type { Diagnosis, PerNode } from "../../../../lib/diagnosis";

const LV_COLOR = ["#94a3b8", "#dc2626", "#d97706", "#4a90d9", "#2d2a8e", "#16a34a"];
const levelOf = (s: number) => (s >= 90 ? 5 : s >= 78 ? 4 : s >= 65 ? 3 : s >= 50 ? 2 : 1);

function controlScore(nodes: PerNode[], key: "labor" | "material"): number {
  let good = 0, tot = 0;
  for (const n of nodes) { const f = n[key]; if (f.std === 0 && f.act === 0) continue; tot++; if (f.diff <= Math.max(1, f.std * 0.03)) good++; }
  return tot ? Math.round((good / tot) * 100) : 0;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Diagnosis | null>(null);
  const [entName, setEntName] = useState("企业");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/diagnosis?enterpriseId=${id}`).then((r) => r.json()),
      fetch(`/api/enterprises/${id}`).then((r) => r.json()).catch(() => null),
    ]).then(([diag, ent]) => { setD(diag?.summary ? diag : null); if (ent?.enterprise?.name) setEntName(ent.enterprise.name); setLoading(false); });
  }, [id]);

  if (loading) return <PageShell title="企业画像"><div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />生成画像中…</div></PageShell>;
  if (!d || d.summary.nodesWithData === 0) {
    return <PageShell title="企业画像" subtitle="基于规则引擎+诊断引擎沉淀的数据生成 5M1E·成本 六维就绪度画像">
      <Card><CardBody className="py-12 text-center text-sm text-muted-foreground">尚无可生成画像的数据。请先完成「规则引擎」建模与「诊断引擎」。</CardBody></Card>
    </PageShell>;
  }

  const mt = d.maturity;
  const dimScore = (k: string) => mt.dims.find((x) => x.key === k)?.score ?? 0;
  const dims = [
    { key: "labor", label: "人 · 人力", score: controlScore(d.nodes, "labor"), hint: "人工成本受控度" },
    { key: "machine", label: "机 · 设备信息化", score: dimScore("info"), hint: "工作方式自动化成熟度" },
    { key: "material", label: "料 · 物料", score: controlScore(d.nodes, "material"), hint: "材料成本受控度" },
    { key: "method", label: "法 · 流程", score: Math.round((dimScore("process") + dimScore("sound")) / 2), hint: "流程规范度 + 三性健全" },
    { key: "measure", label: "测 · 质量", score: dimScore("quality"), hint: "输入/输出 准确率·及时率" },
    { key: "cost", label: "成本 · 综合", score: dimScore("cost"), hint: "人+料要素整体受控度" },
  ];
  const overall = mt.overall;
  const lvl = mt.level;
  const tier = overall >= 78 ? { label: "精益就绪 · L3", cycle: "6–9 个月" } : overall >= 60 ? { label: "规范就绪 · L2", cycle: "9–12 个月" } : { label: "基础就绪 · L1", cycle: "12–18 个月" };
  const radar = dims.map((x) => ({ dim: x.label, score: x.score, 达标: 80 }));
  const sorted = [...dims].sort((a, b) => b.score - a.score);
  const advantages = sorted.filter((x) => x.score >= 75);
  const risks = [...sorted].reverse().filter((x) => x.score < 60);
  const topOver = d.costFindings[0];

  return (
    <PageShell title="企业画像" subtitle="基于规则引擎+诊断引擎数据生成的 5M1E·成本 六维落地就绪度画像">
      <div className="space-y-4">
        {/* 就绪度概览 */}
        <Card><CardBody className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: LV_COLOR[lvl] }}>
              <span className="text-xl font-bold leading-none" style={{ color: LV_COLOR[lvl] }}>{overall}</span>
              <span className="text-[9px] text-muted-foreground">/100</span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{entName} · 综合就绪度</div>
              <div className="text-lg font-semibold" style={{ color: LV_COLOR[lvl] }}>{mt.levelLabel}</div>
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <Stat label="推荐实施档次" value={tier.label} />
          <Stat label="预计落地周期" value={tier.cycle} />
          <Stat label="信息化差距 / 质量问题" value={`${d.summary.methodGaps} / ${d.summary.qualityIssues}`} />
        </CardBody></Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* 六维雷达 */}
          <Card className="lg:col-span-2">
            <CardHeader title="5M1E · 成本 六维画像" desc="人 / 机 / 料 / 法 / 测 / 成本 —— 越靠外越成熟（达标线 80）" />
            <CardBody>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke="var(--color-border, #e1e4ef)" />
                    <PolarAngleAxis dataKey="dim" fontSize={11} stroke="var(--color-muted-foreground, #5e6586)" />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="达标线 80" dataKey="达标" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.1} />
                    <Radar name="本企业" dataKey="score" stroke="#2d2a8e" fill="#4a90d9" fillOpacity={0.42} />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={(v: any, n: any) => [v + (n === "本企业" ? " 分" : ""), n]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dims.map((x) => { const l = levelOf(x.score); return (
                  <div key={x.key} className="rounded-lg border border-border p-2">
                    <div className="flex items-center justify-between"><span className="text-xs font-medium">{x.label}</span><span className="font-mono text-sm font-semibold" style={{ color: LV_COLOR[l] }}>{x.score}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${x.score}%`, background: LV_COLOR[l] }} /></div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{x.hint}</div>
                  </div>
                ); })}
              </div>
            </CardBody>
          </Card>

          {/* 优势 / 短板 */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="优势项" desc="可优先复用、巩固" action={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
              <CardBody className="space-y-1.5">
                {advantages.length === 0 ? <Empty text="暂无明显优势（各维度待提升）" /> : advantages.map((x) => (
                  <div key={x.key} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs"><span className="font-medium">{x.label}</span><span className="ml-auto font-mono text-emerald-700">{x.score}</span></div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="短板项" desc="落地需重点补强" action={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
              <CardBody className="space-y-1.5">
                {risks.length === 0 ? <Empty text="各维度均达基本水平" /> : risks.map((x) => (
                  <div key={x.key} className="rounded-md border border-border px-3 py-1.5 text-xs"><div className="flex items-center gap-2"><span className="font-medium">{x.label}</span><span className="ml-auto font-mono text-amber-700">{x.score}</span></div><div className="mt-0.5 text-[10px] text-muted-foreground">{x.hint}</div></div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* 改进路线（承接诊断 → 供部署引擎排任务） */}
        <Card>
          <CardHeader title="落地改进路线（供部署引擎排任务）" desc="由诊断引擎成熟度模型生成，按优先级" action={<TrendingUp className="h-4 w-4 text-[color:var(--primary)]" />} />
          <CardBody>
            <ol className="space-y-2">
              {mt.recommendations.map((r, i) => (
                <li key={i} className="rounded-md border border-border p-2.5 text-xs">
                  <div className="font-medium"><span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[9px] font-semibold text-[color:var(--primary)]">{i + 1}</span>{r.title}</div>
                  <div className="ml-5 mt-0.5 text-muted-foreground">{r.detail}</div>
                  <div className="ml-5 text-emerald-700">预期：{r.impact}</div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card><CardBody className="flex items-center gap-2 text-xs text-muted-foreground">
          <Gauge className="h-4 w-4 text-[color:var(--primary)]" />
          点右下角 AI 助手，让智能体据此生成**企业画像结论 + 阿米巴落地建议**（结果供部署引擎引用）。
        </CardBody></Card>
      </div>

      <EngineChat
        page="企业画像 · 5M1E六维就绪度" subject={`${entName} 画像`}
        facts={[
          { label: "综合就绪度", value: `${overall} 分（${mt.levelLabel}）` },
          { label: "推荐档次/周期", value: `${tier.label} · ${tier.cycle}` },
          { label: "六维", value: dims.map((x) => `${x.label.split(" ")[0]}${x.score}`).join(" / ") },
          { label: "优势/短板", value: `${advantages.map((x) => x.label.split(" · ")[1]).join("、") || "无"}；短板 ${risks.map((x) => x.label.split(" · ")[1]).join("、") || "无"}` },
          { label: "信息化差距/质量问题", value: `${d.summary.methodGaps} / ${d.summary.qualityIssues}` },
          { label: "最大超支", value: topOver ? `${topOver.nodeName}·${topOver.factorLabel.replace(/（.*）/, "")} +¥${Math.round(topOver.diff)}` : "无" },
        ]}
      />
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-0.5 text-sm font-semibold">{value}</div></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="px-2 py-4 text-center text-xs text-muted-foreground">{text}</div>;
}
