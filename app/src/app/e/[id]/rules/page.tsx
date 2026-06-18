"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Workflow, ArrowRight, Loader2, Pencil } from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { EngineChat } from "../../../../components/agent/EngineChat";
import { getAmiba } from "../../../../lib/amibas";
import type { OtdTemplate } from "../../../../lib/otd-types";
import type { Subflow } from "../../../../lib/process-types";
import type { NodeRoll, Roll } from "../../../../lib/rollup";

const OtdFlow = dynamic(
  () => import("../../../../components/otd/OtdFlow").then((m) => m.OtdFlow),
  { ssr: false, loading: () => <div className="py-12 text-center text-sm text-muted-foreground">加载流程图…</div> },
);

const yuan = (n: number) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });

export default function RulesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const entId = params.id;
  const [tpl, setTpl] = useState<OtdTemplate | null>(null);
  const [subflows, setSubflows] = useState<Subflow[]>([]);
  const [roll, setRoll] = useState<{ nodes: NodeRoll[]; total: Roll } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!entId) return;
    fetch(`/api/otd?enterpriseId=${entId}`).then((r) => r.json()).then((d) => {
      const t: OtdTemplate | null = d.templates?.[0] || null;
      setTpl(t);
      if (t) fetch(`/api/cost-rollup?enterpriseId=${entId}&templateId=${t.id}`).then((r) => r.json()).then((x) => setRoll(x?.nodes ? x : null));
    });
    fetch(`/api/subflow?enterpriseId=${entId}`).then((r) => r.json()).then((d) => setSubflows(d.subflows || []));
  }, [entId]);

  const byOwner = new Map(subflows.map((s) => [s.ownerNodeId, s]));
  const rollByNode = new Map((roll?.nodes || []).map((n) => [n.nodeId, n]));
  const nodes = tpl ? tpl.nodes.slice().sort((a, b) => a.seq - b.seq) : [];
  const costByNode: Record<string, number> = {};
  (roll?.nodes || []).forEach((n) => { if (n.total) costByNode[n.nodeId] = n.total; });
  const built = nodes.filter((n) => byOwner.has(n.id) || (rollByNode.get(n.id)?.total || 0) > 0).length;
  const coverage = nodes.length ? Math.round((built / nodes.length) * 100) : 0;

  async function enter(nodeId: string, label: string, amibaId?: string) {
    const existing = byOwner.get(nodeId);
    if (existing) { router.push(`/e/${entId}/planning/subflow/${existing.id}`); return; }
    setBusy(nodeId);
    try {
      const res = await fetch("/api/subflow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId: entId, ownerNodeId: nodeId, ownerLabel: label }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "创建失败");
      router.push(`/e/${entId}/planning/subflow/${d.subflow.id}`);
    } catch (e) { alert((e as Error).message); setBusy(null); }
  }

  return (
    <PageShell title="规则引擎" subtitle="在 OTD 骨架上建子流程泳道 + 人机料费成本要素 + 部门转让价（覆盖率 ≥ 80% 解锁诊断）">
      <div className="space-y-4">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-4">
            <div className="text-sm">规则建设覆盖率：
              <span className={`ml-1 font-semibold ${coverage >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{coverage}%</span>
              <span className="ml-1 text-xs text-muted-foreground">（{built}/{nodes.length} 节点已建子流程或录入成本）</span>
            </div>
            {roll && <div className="ml-auto text-xs text-muted-foreground">全链成本合计 <b className="text-[color:var(--primary)]">{yuan(roll.total.total)}</b></div>}
          </CardBody>
        </Card>

        {/* OTD 流程图（点击节点进入其子流程建规则/录成本） */}
        <Card>
          <CardHeader title="OTD 价值流" desc="订单→交付全链 · 节点显示汇总成本 · 含 ⊞ 标记表示已建子流程 · 点击节点进入其子流程建规则/录成本"
            action={<Button size="sm" variant="outline" onClick={() => router.push(`/e/${entId}/planning`)}><Pencil className="h-3.5 w-3.5" /> 节点详细编辑</Button>} />
          <CardBody className="px-2 py-2">
            {!tpl && <div className="py-12 text-center text-sm text-muted-foreground">加载中…</div>}
            {tpl && (
              <OtdFlow nodes={tpl.nodes} selectedId={null} costByNode={costByNode}
                subflowIds={subflows.map((s) => s.ownerNodeId)}
                onSelect={(id) => { const n = nodes.find((x) => x.id === id); if (n) enter(n.id, n.name, n.amibaId); }} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="OTD 节点 · 规则与成本状态" desc="点击「进入」为节点建子流程并录入人机料费成本" />
          <CardBody className="px-0 py-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">节点</th>
                  <th className="px-5 py-2.5 text-left font-medium">归属阿米巴</th>
                  <th className="px-5 py-2.5 text-left font-medium">子流程</th>
                  <th className="px-5 py-2.5 text-right font-medium">汇总成本</th>
                  <th className="px-5 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((n) => {
                  const sf = byOwner.get(n.id);
                  const nr = rollByNode.get(n.id);
                  const amb = getAmiba(n.amibaId);
                  return (
                    <tr key={n.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3"><span className="font-mono text-xs text-muted-foreground">#{n.seq}</span> {n.name}</td>
                      <td className="px-5 py-3">{amb ? <span className="rounded px-1.5 py-0.5 text-[11px] text-white" style={{ background: amb.color }}>{amb.short}</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-5 py-3">{sf ? <Badge tone="success">{sf.activities.length} 活动</Badge> : <Badge tone="muted">未建</Badge>}</td>
                      <td className="px-5 py-3 text-right font-mono">{nr?.total ? yuan(nr.total) : "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => enter(n.id, n.name, n.amibaId)} disabled={busy === n.id}>
                          {busy === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Workflow className="h-3.5 w-3.5" />}
                          {sf ? "进入" : "建子流程"} <ArrowRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <EngineChat page="规则引擎" subject="规则与成本建设"
        facts={[{ label: "覆盖率", value: coverage + "%" }, ...(roll ? [{ label: "全链成本", value: yuan(roll.total.total) }] : [])]} />
    </PageShell>
  );
}
