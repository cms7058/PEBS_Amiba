"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, TrendingUp, Cog, Gauge, ListChecks, AlertTriangle, FileText } from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { EngineChat } from "../../../../components/agent/EngineChat";
import { DiagnosisViz } from "../../../../components/diagnosis/DiagnosisViz";
import { MaturityPanel } from "../../../../components/diagnosis/MaturityPanel";
import { Collapsible, MethodGapByNode } from "../../../../components/diagnosis/DiagnosisDetails";
import { QualityRose } from "../../../../components/diagnosis/QualityRose";
import { CostGroupedBar } from "../../../../components/diagnosis/CostGroupedBar";
import type { Diagnosis } from "../../../../lib/diagnosis";

const yuan = (n: number) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });

export default function DiagnosisPage() {
  const params = useParams<{ id: string }>();
  const entId = params.id;
  const [d, setD] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/diagnosis?enterpriseId=${entId}`).then((r) => r.json()).then((x) => { setD(x?.summary ? x : null); setLoading(false); });
  }, [entId]);

  const s = d?.summary;

  return (
    <PageShell title="诊断引擎" subtitle="基于规则引擎沉淀的数据，诊断人/设备信息系统/料的成本问题与改进方向">
      <div className="space-y-4">
        {loading && <div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />汇总诊断中…</div>}

        {!loading && s && s.totalNodes === 0 && (
          <Card><CardBody className="py-12 text-center text-sm text-muted-foreground">
            尚无 OTD 流程节点。请先在「规则引擎」生成 OTD 流程并下钻子流程。
          </CardBody></Card>
        )}

        {!loading && s && s.totalNodes > 0 && (
          <>
            {/* 摘要 */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {([
                ["总超支", yuan(s.overspend), "text-red-600"],
                ["信息化差距", String(s.methodGaps), "text-amber-600"],
                ["质量问题", String(s.qualityIssues), "text-amber-600"],
                ["待完成节点", String(s.incompleteNodes), "text-muted-foreground"],
                ["三性风险点", String(s.riskNodes), "text-muted-foreground"],
              ] as const).map(([k, v, c]) => (
                <Card key={k}><CardBody><div className="text-xs text-muted-foreground">{k}</div><div className={`mt-1 text-xl font-semibold ${c}`}>{v}</div></CardBody></Card>
              ))}
            </div>

            {/* 成熟度评价（管理 + 信息化体检评分） */}
            <Card>
              <CardHeader title="管理与信息化成熟度评价" desc="综合评分 + 五维分级 + 改进路线，基于规则引擎沉淀数据"
                action={<Link href={`/e/${entId}/diagnosis/report`}><Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5" /> 一键诊断报告</Button></Link>} />
              <CardBody><MaturityPanel maturity={d!.maturity} tree={d!.tree} /></CardBody>
            </Card>

            {/* 可视化：节点色点 + 维度杜邦归集树 */}
            <Card>
              <CardHeader title="诊断可视化（OTD 流程概览 · 三要素差值色点）" desc="顶层 OTD 节点一行，点节点展开其子流程；点色点或下方维度查看该维度全节点归集树" />
              <CardBody><DiagnosisViz tree={d!.tree} nodes={d!.nodes} /></CardBody>
            </Card>

            {/* 成本超支（直方图） */}
            <Card>
              <CardHeader title="成本超支（标准参考 vs 实际）" desc="分组柱状图对比每项的标准值与实际值 · 按超支金额排序" action={<Badge tone="danger">{d!.costFindings.length}</Badge>} />
              <CardBody><CostGroupedBar findings={d!.costFindings} /></CardBody>
            </Card>

            {/* 信息化差距：折叠 + 按 OTD 节点归类 */}
            <Collapsible title="信息化差距（工作方式：实际 ≠ 最优）" desc="按 OTD 节点归类，点节点展开其活动 · 手工/低效方式可升级为系统模块"
              count={d!.methodFindings.length} tone="warning" icon={<Cog className="h-4 w-4 text-muted-foreground" />}>
              <MethodGapByNode findings={d!.methodFindings} tree={d!.tree} />
            </Collapsible>

            {/* 质量指标：折叠 + 雷达图 */}
            <Collapsible title="质量指标（输入/输出 准确率·及时率）" desc={`各节点质量玫瑰图 · ${d!.qualityFindings.length} 项低于 90%`}
              count={d!.qualityFindings.length} tone="warning" icon={<Gauge className="h-4 w-4 text-muted-foreground" />}>
              <QualityRose nodes={d!.nodes} />
            </Collapsible>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* 待完成 */}
              <Card>
                <CardHeader title="完整性待补" desc="缺数据/缺标准参考值" action={<ListChecks className="h-4 w-4 text-muted-foreground" />} />
                <CardBody className="space-y-1.5">
                  {d!.incompleteFindings.length === 0 ? <Empty text="数据较完整" /> : d!.incompleteFindings.slice(0, 10).map((f, i) => (
                    <div key={i} className="rounded-md border border-border px-3 py-1.5 text-xs">
                      <span className="font-medium">{f.nodeName}</span>
                      <span className="ml-1 text-[11px] text-amber-700">{f.items.length} 项待补</span>
                    </div>
                  ))}
                </CardBody>
              </Card>

              {/* 三性风险 */}
              <Card>
                <CardHeader title="流程三性风险点" desc="合理性/完整性/正确性" action={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
                <CardBody className="space-y-1.5">
                  {d!.riskFindings.length === 0 ? <Empty text="暂无标注风险" /> : d!.riskFindings.slice(0, 10).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs">
                      <span className="font-medium">{f.nodeName}</span>
                      <Badge tone="warning">{f.prop}</Badge>
                      {f.note && <span className="truncate text-[11px] text-muted-foreground">{f.note}</span>}
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>

            <Card><CardBody className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-[color:var(--primary)]" />
              点右下角 AI 助手，让智能体据此给出**诊断结论 + 改进方向**（结果供企业画像、部署引擎引用）。
            </CardBody></Card>
          </>
        )}
      </div>

      {s && (
        <EngineChat
          page="诊断引擎 · 成本与流程诊断"
          subject="诊断结论与改进方向"
          facts={[
            { label: "总超支", value: yuan(s.overspend) },
            { label: "信息化差距/质量问题", value: `${s.methodGaps} / ${s.qualityIssues}` },
            { label: "待完成/三性风险", value: `${s.incompleteNodes} / ${s.riskNodes}` },
            { label: "Top 超支", value: (d!.costFindings.slice(0, 3).map((f) => `${f.nodeName}·${f.factorLabel.replace(/（.*）/, "")} +${yuan(f.diff)}`).join("；")) || "无" },
            { label: "信息化改进", value: (d!.methodFindings.slice(0, 3).map((f) => `${f.nodeName}: ${f.actual}→${f.recommended}`).join("；")) || "无" },
          ]}
        />
      )}
    </PageShell>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-6 text-center text-xs text-muted-foreground">{text}</div>;
}
