"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Printer, ChevronLeft } from "lucide-react";
import { Button } from "../../../../../components/ui/Button";
import { MaturityPanel } from "../../../../../components/diagnosis/MaturityPanel";
import type { Diagnosis } from "../../../../../lib/diagnosis";

const yuan = (n: number) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });

export default function DiagnosisReportPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Diagnosis | null>(null);
  const [entName, setEntName] = useState("企业");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/diagnosis?enterpriseId=${id}`).then((r) => r.json()),
      fetch(`/api/enterprises/${id}`).then((r) => r.json()).catch(() => null),
    ]).then(([diag, ent]) => { setD(diag?.summary ? diag : null); if (ent?.enterprise?.name) setEntName(ent.enterprise.name); setLoading(false); });
  }, [id]);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />生成报告中…</div>;
  if (!d) return <div className="py-20 text-center text-sm text-muted-foreground">暂无可生成报告的数据。</div>;

  const today = new Date().toLocaleDateString("zh-CN");
  return (
    <div className="mx-auto max-w-4xl p-6">
      <style>{`@media print {
        body * { visibility: hidden; }
        #diag-report, #diag-report * { visibility: visible; }
        #diag-report { position: absolute; left: 0; top: 0; width: 100%; padding: 0 8mm; }
        .no-print { display: none !important; }
        @page { margin: 14mm; }
      }`}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/e/${id}/diagnosis`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> 返回诊断引擎</Link>
        <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> 打印 / 导出 PDF</Button>
      </div>

      <div id="diag-report" className="space-y-6 rounded-lg border border-border bg-card p-8 text-foreground">
        {/* 封面 */}
        <header className="border-b border-border pb-4 text-center">
          <div className="text-xs text-muted-foreground">PEBS Amoeba Copilot · 管理与信息化体检</div>
          <h1 className="mt-1 text-2xl font-bold">{entName} · 管理与信息化成熟度诊断报告</h1>
          <div className="mt-1 text-xs text-muted-foreground">基于 OTD 全流程 {d.summary.nodesWithData} 个末端活动的规则与成本数据 · 生成日期 {today}</div>
        </header>

        {/* 一、综合结论 */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">一、综合结论</h2>
          <MaturityPanel maturity={d.maturity} />
        </section>

        {/* 二、关键发现（漏洞清单） */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">二、关键发现</h2>
          <ReportTable title="成本超支 Top（实际 > 标准）" head={["环节", "要素", "标准", "实际", "超支"]}
            rows={d.costFindings.slice(0, 8).map((f) => [f.nodeName, f.factorLabel.replace(/（.*）/, ""), yuan(f.std), yuan(f.act), "+" + yuan(f.diff)])}
            empty="无超支项" />
          <div className="grid gap-3 sm:grid-cols-2">
            <ReportTable title={`质量指标偏低（< 90%，${d.qualityFindings.length}）`} head={["环节", "指标", "值"]}
              rows={d.qualityFindings.slice(0, 8).map((f) => [f.nodeName, f.metric, f.value + "%"])} empty="质量达标" />
            <ReportTable title={`流程三性风险（${d.riskFindings.length}）`} head={["环节", "类型", "说明"]}
              rows={d.riskFindings.slice(0, 8).map((f) => [f.nodeName, f.prop, f.note || "—"])} empty="暂无标注风险" />
          </div>
        </section>

        {/* 三、改进建议与路线 */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">三、改进建议与预期</h2>
          <ol className="space-y-2">
            {d.maturity.recommendations.map((r, i) => (
              <li key={i} className="rounded-md border border-border p-2.5 text-sm">
                <div className="font-medium">{i + 1}. {r.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.detail}</div>
                <div className="mt-0.5 text-xs text-emerald-700">预期收益：{r.impact}</div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-border pt-3 text-center text-[10px] text-muted-foreground">
          本报告由 PEBS Amoeba Copilot 依据规则引擎沉淀数据自动生成，标准参考值随产品阿米巴持续迭代修正。
        </footer>
      </div>
    </div>
  );
}

function ReportTable({ title, head, rows, empty }: { title: string; head: string[]; rows: string[][]; empty: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium">{title}</div>
      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-border px-3 py-2 text-center text-[11px] text-muted-foreground">{empty}</div>
      ) : (
        <table className="w-full border-collapse text-[11px]">
          <thead><tr className="border-b border-border text-muted-foreground">{head.map((h, i) => <th key={i} className={`py-1 font-medium ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => <td key={j} className={`py-1 ${j === 0 ? "text-left" : "text-right font-mono"}`}>{c}</td>)}
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
