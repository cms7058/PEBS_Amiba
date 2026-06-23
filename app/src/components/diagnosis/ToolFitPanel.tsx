"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plug, CheckCircle2, Loader2, ExternalLink, Wrench, Send, Package } from "lucide-react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { getTool, type ToolDef } from "../../lib/tools-registry";
import { FACTOR_LABELS } from "../../lib/factory-types";
import type { Diagnosis } from "../../lib/diagnosis";
import type { OtdNode, OtdTemplate } from "../../lib/otd-types";

interface Issue { type: string; text: string; tone: "danger" | "warning" | "muted" }
interface ConnState { registrations: { source: string }[]; ingested: string[] }
interface DispatchTask { id: string; source: string; nodeName: string; title: string; status: string; resultSummary?: string; resultUrl?: string; error?: string }

// 每个工具被下发时的动作语义
const TOOL_ACTION: Record<string, { action: string; label: string }> = {
  lean: { action: "run_8d", label: "下发 8D 根因分析" },
  aps: { action: "reschedule", label: "下发重排请求" },
  bom: { action: "review_bom", label: "下发 BOM 复核" },
  nesting: { action: "renest", label: "下发套料优化" },
  worktime: { action: "measure", label: "下发工时实测" },
};
const STATUS_TONE: Record<string, "success" | "primary" | "warning" | "muted"> = {
  done: "success", accepted: "primary", sent: "primary", pending: "muted", failed: "warning",
};
const STATUS_LABEL: Record<string, string> = {
  done: "已完成", accepted: "已受理", sent: "已下发", pending: "下发中", failed: "失败",
};

// 把诊断结论落到「对症工具」：每个有问题的 OTD 节点 → 该节点绑定的工具 + 接入入口。
// 取代独立的「工具接入」页，让用户在诊断结论里就知道哪个工具治哪个节点的问题，并就地选择是否接入。
export function ToolFitPanel({ enterpriseId, diagnosis }: { enterpriseId: string; diagnosis: Diagnosis }) {
  const [nodes, setNodes] = useState<OtdNode[]>([]);
  const [conn, setConn] = useState<ConnState>({ registrations: [], ingested: [] });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DispatchTask[]>([]);
  const [dispatching, setDispatching] = useState<string | null>(null);
  // 产品（订单/零件号）：APS/Lean 等按产品建项目的工具，接入时把所选产品一并带给工具
  const [products, setProducts] = useState<{ id: string; partNo: string; name: string }[]>([]);
  const [productSel, setProductSel] = useState<Record<string, string>>({});

  function loadTasks() {
    fetch(`/api/dispatch?enterpriseId=${enterpriseId}`).then((r) => r.json()).then((d) => setTasks(d.tasks || []));
  }

  useEffect(() => {
    fetch(`/api/otd?enterpriseId=${enterpriseId}`).then((r) => r.json()).then((d) => {
      const t: OtdTemplate | undefined = d.templates?.[0];
      setNodes(t?.nodes || []);
    });
    fetch(`/api/connectors?enterpriseId=${enterpriseId}`).then((r) => r.json()).then((d) =>
      setConn({ registrations: d.registrations || [], ingested: d.ingested || [] }),
    );
    fetch(`/api/products?enterpriseId=${enterpriseId}`).then((r) => r.json()).then((d) =>
      setProducts(d.products || []),
    ).catch(() => {});
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterpriseId]);

  async function dispatch(node: OtdNode, toolId: string, issues: Issue[]) {
    const act = TOOL_ACTION[toolId];
    if (!act) return;
    const key = node.id + ":" + toolId;
    setDispatching(key);
    try {
      const title = issues[0] ? `${node.name}·${issues[0].type}：${issues[0].text}` : `${node.name} 流程改进`;
      const detail = issues.map((i) => `${i.type}：${i.text}`).join("；") || "请针对该节点做改进。";
      const res = await fetch("/api/dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId, source: toolId, nodeKey: node.key, nodeName: node.name, action: act.action, title, detail }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "下发失败");
      loadTasks();
      // 工具异步回调后状态会更新，稍后再拉一次
      setTimeout(loadTasks, 2000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDispatching(null);
    }
  }

  function toolStatus(toolId: string): { label: string; tone: "success" | "primary" | "muted" } {
    if (conn.ingested.includes(toolId)) return { label: "已上报数据", tone: "success" };
    if (conn.registrations.some((r) => r.source === toolId)) return { label: "已注册", tone: "primary" };
    return { label: "未接入", tone: "muted" };
  }

  async function connect(tool: ToolDef) {
    const source = tool.id;
    // 按产品建项目的工具（BOM 除外，BOM 走产品页）：接入时必须选定一个产品一并带过去
    const needsProduct = !!tool.productWorkbench && tool.id !== "bom";
    const productId = productSel[source];
    if (needsProduct && !productId) {
      alert("请先在该工具上选择要作业的产品（订单/零件号）");
      return;
    }
    setConnecting(source);
    try {
      const res = await fetch("/api/connectors/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId, source, productId: needsProduct ? productId : undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "接入失败");
      window.location.href = d.redirectUrl;
    } catch (e) {
      alert((e as Error).message);
      setConnecting(null);
    }
  }

  function issuesFor(node: OtdNode): Issue[] {
    const match = (f: { nodeId: string; nodeName: string }) => f.nodeId === node.id || f.nodeName === node.name;
    const out: Issue[] = [];
    diagnosis.methodFindings.filter(match).forEach((f) => out.push({ type: "信息化差距", text: `${f.actual} → ${f.recommended}`, tone: "warning" }));
    diagnosis.costFindings.filter(match).forEach((f) => out.push({ type: "成本超支", text: `${f.factorLabel.replace(/（.*）/, "")} +¥${Math.round(f.diff).toLocaleString("zh-CN")}`, tone: "danger" }));
    diagnosis.qualityFindings.filter(match).forEach((f) => out.push({ type: "质量", text: `${f.metric} ${f.value}`, tone: "warning" }));
    diagnosis.riskFindings.filter(match).forEach((f) => out.push({ type: "三性风险", text: f.note || f.prop, tone: "muted" }));
    return out;
  }

  const rows = nodes
    .map((node) => ({
      node,
      tools: (node.tools || []).map((tb) => getTool(tb.tool)).filter((t): t is ToolDef => !!t),
      issues: issuesFor(node),
    }))
    .filter((r) => r.tools.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="对症工具接入建议（按节点）"
        desc="诊断结论里每个可优化节点对应的工具就在这里 —— 看清工具治哪个节点的问题，由你决定是否接入"
        action={<Wrench className="h-4 w-4 text-[color:var(--primary)]" />}
      />
      <CardBody className="space-y-3">
        {rows.map(({ node, tools, issues }) => (
          <div key={node.id} className="rounded-lg border border-border p-3">
            {/* 节点 + 该节点的诊断问题 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{node.name}</span>
              {node.factor && <Badge tone="muted">{FACTOR_LABELS[node.factor]}</Badge>}
              {issues.length === 0 && <span className="text-[11px] text-muted-foreground">可进一步优化</span>}
              {issues.map((is, i) => (
                <Badge key={i} tone={is.tone}>{is.type}：{is.text}</Badge>
              ))}
            </div>

            {/* 该节点对应的工具 + 接入入口 */}
            <div className="mt-2.5 grid gap-2 md:grid-cols-2">
              {tools.map((tool) => {
                const st = toolStatus(tool.id);
                const connected = st.tone !== "muted";
                return (
                  <div key={tool.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{tool.name}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{tool.tagline}</div>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tool.capabilities.slice(0, 3).map((c) => (
                        <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{c}</span>
                      ))}
                    </div>
                    {/* APS/Lean 等按产品建项目的工具：接入时选定产品，令牌+产品一并带给工具，
                        进入工具操作页后直接显示该产品并开始计时（BOM 仍走产品页，不在此选） */}
                    {tool.productWorkbench && tool.id !== "bom" && (
                      <select
                        value={productSel[tool.id] || ""}
                        onChange={(e) => setProductSel((s) => ({ ...s, [tool.id]: e.target.value }))}
                        className="rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-foreground"
                      >
                        <option value="">{products.length ? "选择作业产品（订单/零件号）…" : "暂无产品，请先建产品"}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}（{p.partNo}）</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => connect(tool)}
                      disabled={connecting === tool.id}
                      className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--primary)] transition hover:bg-[color:var(--primary)]/10 disabled:opacity-50"
                    >
                      {connecting === tool.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 生成令牌中…</>
                        : connected ? <><CheckCircle2 className="h-3.5 w-3.5" /> 重新接入 / 换令牌 <ExternalLink className="h-3 w-3" /></>
                        : <><Plug className="h-3.5 w-3.5" /> 接入此工具治理该节点 <ExternalLink className="h-3 w-3" /></>}
                    </button>
                    {/* BOM 仍走产品页选产品再进工作台（按用户要求 BOM 不动） */}
                    {connected && tool.id === "bom" && (
                      <Link href={`/e/${enterpriseId}/products?tool=bom`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--primary)]/30 bg-card px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--primary)] transition hover:bg-[color:var(--primary)]/5">
                        <Package className="h-3.5 w-3.5" /> 打开工作台（按产品）
                      </Link>
                    )}
                    {/* 反向下发：已接入的工具可就地下发改进任务 */}
                    {connected && TOOL_ACTION[tool.id] && (
                      <button
                        onClick={() => dispatch(node, tool.id, issues)}
                        disabled={dispatching === node.id + ":" + tool.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--accent)] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                      >
                        {dispatching === node.id + ":" + tool.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 下发中…</>
                          : <><Send className="h-3.5 w-3.5" /> {TOOL_ACTION[tool.id].label}</>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 已下发的改进任务 + 工具回执/完成状态 */}
        {tasks.length > 0 && (
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium"><Send className="h-3.5 w-3.5 text-[color:var(--accent)]" />已下发改进任务（工具治理回执）</div>
            <div className="space-y-1.5">
              {tasks.map((t) => {
                const tool = getTool(t.source);
                return (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[11px]">
                    <Badge tone={STATUS_TONE[t.status] || "muted"}>{STATUS_LABEL[t.status] || t.status}</Badge>
                    <span className="font-medium">{t.nodeName}</span>
                    <span className="text-muted-foreground">→ {tool?.name || t.source}</span>
                    <span className="truncate text-muted-foreground">{t.resultSummary || t.error || t.title}</span>
                    {t.resultUrl && <a href={t.resultUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-0.5 text-[color:var(--primary)] hover:underline">查看结果 <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">接入后工具会把现场/排产/诊断数据自动回填到该节点的 KPI 与浪费项，驱动杜邦树前后对比。</p>
      </CardBody>
    </Card>
  );
}
