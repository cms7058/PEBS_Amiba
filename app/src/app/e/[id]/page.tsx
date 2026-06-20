"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronRight } from "lucide-react";
import { PageShell } from "../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { EngineChat } from "../../../components/agent/EngineChat";
import { PdcaPanel } from "../../../components/overview/PdcaPanel";
import { QuickDiagnose } from "../../../components/overview/QuickDiagnose";
import { CostRollupTree } from "../../../components/overview/CostRollupTree";
import type { DupontNode } from "../../../lib/dupont";
import type { TreeNode } from "../../../lib/diagnosis";

const DUPONT_FACTOR: Record<string, "labor" | "equipment" | "material"> = { labor: "labor", material: "material", overhead: "equipment" };

function findDupont(n: DupontNode, id: string): DupontNode | null {
  if (n.id === id) return n;
  for (const c of n.children || []) { const r = findDupont(c, id); if (r) return r; }
  return null;
}

// X6 仅在浏览器加载，避免 SSR 触碰 document
const DupontGraph = dynamic(
  () => import("../../../components/dupont/DupontGraph").then((m) => m.DupontGraph),
  { ssr: false, loading: () => <div className="py-12 text-center text-sm text-muted-foreground">加载图形…</div> },
);

export default function OverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const entId = params.id;
  const [tree, setTree] = useState<DupontNode | null>(null);
  const [rollup, setRollup] = useState<{ labor: number; equipment: number; material: number; total: number } | null>(null);
  const [diagTree, setDiagTree] = useState<TreeNode[] | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    if (!entId) return;
    fetch(`/api/dupont?enterpriseId=${entId}`).then((r) => r.json()).then((d) => { setTree(d.tree || null); setRollup(d.rollup || null); });
    fetch(`/api/diagnosis?enterpriseId=${entId}`).then((r) => r.json()).then((d) => setDiagTree(d.tree || null));
  }, [entId]);

  const selFactor = selId ? DUPONT_FACTOR[selId] : undefined;

  const roe = tree?.values;
  const hasActual = !!rollup && rollup.total > 0;
  const selNode = tree && selId ? findDupont(tree, selId) : null;
  const pick = (id: string) => { setSelId(id); setClickCount((c) => c + 1); };

  return (
    <PageShell title="总览" subtitle="该企业阿米巴项目的杜邦成本树 · 现场浪费→财务结果贯穿 · 实施前后对比">
      <div className="space-y-4">
        <QuickDiagnose />
        <PdcaPanel enterpriseId={entId} />
        {roe && (
          <div className="grid grid-cols-3 gap-3">
            {([["baseline", "实施前 ROE"], ["current", "当前 ROE"], ["target", "目标 ROE"]] as const).map(([k, label]) => (
              <Card key={k}>
                <CardBody>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-2xl font-semibold text-[color:var(--primary)]">{fmt(roe[k])}<span className="ml-0.5 text-sm">%</span></div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
        {hasActual && (
          <div className="rounded-md border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 px-3 py-2 text-[11px] text-[color:var(--primary)]">
            现场→财务闭环已生效：OTD 各节点录入的人/机/料成本经 rollup 汇总，已注入杜邦树
            <b className="mx-1">人工/材料/制造费用</b>叶子的「当前」值（蓝色「现场实测」标注）。现场实测合计 ¥{rollup!.total.toLocaleString("zh-CN")}。
          </div>
        )}
        <Card>
          <CardHeader title="阿米巴杜邦成本树" desc="ROE = 净利率 × 总资产周转率 × 权益乘数 · 叶子=成本科目（蓝色=现场实测，接 rollup）· Ctrl/⌘+滚轮缩放，拖拽平移" />
          <CardBody>
            {!tree && <div className="py-12 text-center text-sm text-muted-foreground">加载中…</div>}
            {tree && <DupontGraph tree={tree} selectedId={selId} onSelect={pick} />}
          </CardBody>
        </Card>

        {/* 点击节点 → 成本归集/计算图例，层层下钻 */}
        {selNode && (
          <Card>
            <CardBody className="space-y-3">
              <DupontDetail node={selNode} onDrill={pick} onViewOtd={() => router.push(`/e/${entId}/planning`)} />
              {/* 成本科目叶子 → 与诊断引擎同源的 OTD 节点逐层归集树形表 */}
              {selFactor && diagTree && (
                <div className="border-t border-border pt-3">
                  <CostRollupTree tree={diagTree} factor={selFactor} />
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* 页内 AI 助手：点击杜邦节点自动弹出 + 节点归集卡片 */}
      <EngineChat
        page="总览 · 杜邦成本树"
        subject={selNode ? selNode.label : "杜邦成本树 / ROE"}
        openSignal={clickCount || undefined}
        cards={selNode ? (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs font-semibold">{selNode.label} 成本归集</div>
            {selNode.formula && <div className="mt-0.5 text-[11px] text-muted-foreground">{selNode.formula}</div>}
            <div className="mt-1.5 font-mono text-[11px]">
              {fmt(selNode.values.baseline)} → <b className="text-foreground">{fmt(selNode.values.current)}</b> ({fmt(selNode.values.target)}) {selNode.unit}
            </div>
            {selNode.actual && (
              <button onClick={() => router.push(`/e/${entId}/planning`)}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-[color:var(--primary)] px-2.5 py-1 text-[11px] text-primary-foreground hover:brightness-110">
                查看 OTD 现场成本归集 →
              </button>
            )}
          </div>
        ) : null}
        facts={[
          ...(roe ? [
            { label: "当前 ROE", value: fmt(roe.current) + "%" },
            { label: "目标 ROE", value: fmt(roe.target) + "%" },
          ] : []),
          ...(selNode ? [
            { label: "选中节点", value: selNode.label },
            { label: "数值(前→当前→目标)", value: `${fmt(selNode.values.baseline)} → ${fmt(selNode.values.current)} → ${fmt(selNode.values.target)} ${selNode.unit || ""}` },
            ...(selNode.actual ? [{ label: "来源", value: "现场 rollup 实测" }] : []),
          ] : []),
        ]}
      />
    </PageShell>
  );
}

// 杜邦节点成本归集/计算图例 + 层层下钻
function DupontDetail({ node, onDrill, onViewOtd }: { node: DupontNode; onDrill: (id: string) => void; onViewOtd: () => void }) {
  const v = node.values;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{node.label}</span>
        {node.costAccount && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{node.costAccount}</span>}
        {node.actual && <span className="rounded bg-[color:var(--primary)]/10 px-1.5 py-0.5 text-[10px] text-[color:var(--primary)]">现场实测</span>}
      </div>
      {node.formula && <div className="text-[11px] text-muted-foreground">计算口径：{node.formula}</div>}
      <div className="font-mono text-xs">
        实施前 {fmt(v.baseline)} → 当前 <b className="text-[color:var(--primary)]">{fmt(v.current)}</b> → 目标 {fmt(v.target)} <span className="text-muted-foreground">{node.unit}</span>
      </div>
      {node.actual && (
        <button onClick={onViewOtd} className="inline-flex items-center gap-1 rounded-md border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 px-2.5 py-1 text-[11px] text-[color:var(--primary)] hover:bg-[color:var(--primary)]/10">
          该值来自 OTD 现场成本 rollup · 查看归集 →
        </button>
      )}
      {node.children?.length ? (
        <div>
          <div className="mb-1 text-[11px] text-muted-foreground">展开下一层（点击下钻）：</div>
          <div className="flex flex-wrap gap-1.5">
            {node.children.map((c) => (
              <button key={c.id} onClick={() => onDrill(c.id)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-[color:var(--primary)]/40 hover:text-[color:var(--primary)]">
                {c.label} <span className="font-mono text-muted-foreground">{fmt(c.values.current)}{c.unit}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      ) : <div className="text-[11px] text-muted-foreground">最底层成本科目（叶子）</div>}
    </div>
  );
}

function fmt(v?: number) {
  if (v == null) return "—";
  return v.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}
