"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Save, Plus, Trash2, Wrench, Loader2, Check, Workflow,
} from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody } from "../../../../components/ui/Card";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { AMIBAS, getAmiba } from "../../../../lib/amibas";
import { DEPARTMENTS } from "../../../../lib/departments";
import { EngineChat } from "../../../../components/agent/EngineChat";
import { SubflowHierarchyCard } from "../../../../components/otd/SubflowHierarchyCard";
import { loadFlowStyle, type FlowStyle } from "../../../../lib/flow-style";
import type { Subflow } from "../../../../lib/process-types";
import type { NodeRoll, Roll } from "../../../../lib/rollup";
import {
  kpiProgress,
  type OtdNode, type OtdTemplate, type NodeKPI, type ToolId, type ThreeProps,
} from "../../../../lib/otd-types";

// X6 流程图仅在浏览器加载
const OtdFlow = dynamic(
  () => import("../../../../components/otd/OtdFlow").then((m) => m.OtdFlow),
  { ssr: false, loading: () => <div className="py-12 text-center text-sm text-muted-foreground">加载流程图…</div> },
);
const SubflowSwimlane = dynamic(
  () => import("../../../../components/otd/SubflowSwimlane").then((m) => m.SubflowSwimlane),
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-muted-foreground">加载泳道图…</div> },
);

const yuan = (n: number) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });

const TOOL_LABEL: Record<ToolId, string> = {
  worktime: "Worktime 工时", aps: "APS 排产", bom: "BOM", lean: "LeanAI 精益", nesting: "Nesting 排料",
};

// 子流程默认泳道：取该节点所属阿米巴下的第一个部门
function defaultDeptForAmiba(amibaId?: string): string | undefined {
  return DEPARTMENTS.find((d) => d.amibaId === amibaId)?.id;
}

export default function OtdPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const entId = params.id;
  const [templates, setTemplates] = useState<OtdTemplate[]>([]);
  const [tpl, setTpl] = useState<OtdTemplate | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [connectedTools, setConnectedTools] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [roll, setRoll] = useState<{ nodes: NodeRoll[]; total: Roll } | null>(null);
  const [subSf, setSubSf] = useState<Subflow | null>(null);
  const [flowStyle, setFlowStyle] = useState<FlowStyle | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [openingNodeSf, setOpeningNodeSf] = useState(false);
  const [allSubflows, setAllSubflows] = useState<Subflow[]>([]);

  useEffect(() => {
    if (!entId) return;
    fetch(`/api/subflow?enterpriseId=${entId}`).then((r) => r.json()).then((d) => setAllSubflows(d.subflows || []));
  }, [entId]);

  // 创建/进入某 OTD 节点的子流程
  async function openNodeSubflow(n: OtdNode) {
    if (subSf && subSf.ownerNodeId === n.id) { router.push(`/e/${entId}/planning/subflow/${subSf.id}`); return; }
    setOpeningNodeSf(true);
    try {
      const res = await fetch("/api/subflow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId: entId, ownerNodeId: n.id, ownerLabel: n.name, defaultDepartmentId: defaultDeptForAmiba(n.amibaId) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "创建失败");
      router.push(`/e/${entId}/planning/subflow/${d.subflow.id}`);
    } catch (e) { alert((e as Error).message); setOpeningNodeSf(false); }
  }

  useEffect(() => {
    const q = entId ? `?enterpriseId=${entId}` : "";
    fetch(`/api/otd${q}`).then((r) => r.json()).then((d) => {
      const list: OtdTemplate[] = d.templates || [];
      setTemplates(list);
      setTpl(list[0] || null);
      setSelected(list[0]?.nodes[0]?.id || null);
      setDirty(false);
    });
    if (entId) {
      fetch(`/api/connectors?enterpriseId=${entId}`).then((r) => r.json()).then((d) => {
        const s = new Set<string>([...(d.ingested || []), ...((d.registrations || []) as { source: string }[]).map((x) => x.source)]);
        setConnectedTools(s);
      });
    }
    setFlowStyle(loadFlowStyle());
  }, [entId]);

  // 成本 rollup（自底向上汇总）
  useEffect(() => {
    if (!tpl || !entId) return;
    fetch(`/api/cost-rollup?enterpriseId=${entId}&templateId=${tpl.id}`)
      .then((r) => r.json()).then((d) => setRoll(d?.nodes ? d : null));
  }, [tpl, entId]);

  // 选中 OTD 节点 → 取其子流程，内嵌显示下一层泳道图
  useEffect(() => {
    if (!selected || !entId) { setSubSf(null); return; }
    fetch(`/api/subflow?enterpriseId=${entId}&ownerNodeId=${selected}`)
      .then((r) => r.json()).then((d) => setSubSf(d.subflow || null));
  }, [selected, entId]);

  const node = tpl?.nodes.find((n) => n.id === selected) || null;
  const costByNode: Record<string, number> = {};
  roll?.nodes.forEach((n) => { if (n.total) costByNode[n.nodeId] = n.total; });

  const patchNode = useCallback((id: string, patch: Partial<OtdNode>) => {
    setTpl((t) => t ? { ...t, nodes: t.nodes.map((n) => n.id === id ? { ...n, ...patch } : n) } : t);
    setDirty(true);
  }, []);

  async function save() {
    if (!tpl) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/otd/${tpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: tpl.nodes, name: tpl.name }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setDirty(false);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="规划引擎 · OTD 价值流"
      subtitle="订单→交付全链路（取代业务流程）· 节点与工具可点击查看编辑 · 实施前后对比"
    >
      <div className="space-y-4">
        {/* 控制条 */}
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">业务流程模板：</span>
            {templates.length > 1 && (
              <select
                value={tpl?.id || ""}
                onChange={(e) => { const t = templates.find((x) => x.id === e.target.value) || null; setTpl(t); setSelected(t?.nodes[0]?.id || null); setDirty(false); }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            {roll && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">全链成本：</span>
                <span>人工 <b>{yuan(roll.total.labor)}</b></span>
                <span>设备 <b>{yuan(roll.total.equipment)}</b></span>
                <span>材料 <b>{yuan(roll.total.material)}</b></span>
                <span className="rounded-md bg-[color:var(--primary)]/10 px-2 py-0.5 font-semibold text-[color:var(--primary)]">合计 {yuan(roll.total.total)}</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {savedAt && <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> 已保存</span>}
              <Button onClick={save} disabled={!dirty || saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* BPMN 风格流程图 */}
          <Card>
            <CardBody className="px-2 py-2">
              {!tpl && <div className="py-12 text-center text-sm text-muted-foreground">暂无 OTD 模板</div>}
              {tpl && (
                <OtdFlow
                  nodes={tpl.nodes}
                  selectedId={selected}
                  onSelect={(id) => { setSelected(id); setClickCount((c) => c + 1); }}
                  costByNode={costByNode}
                  subflowIds={allSubflows.map((s) => s.ownerNodeId)}
                />
              )}
              {/* 阿米巴图例 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border px-3 pt-3 text-[11px]">
                <span className="text-muted-foreground">阿米巴：</span>
                {AMIBAS.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: a.color }} />
                    {a.short}
                  </span>
                ))}
                <span className="ml-2 inline-flex items-center gap-1 text-[#b45309]">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[#d97706]" /> 交接点（转让价）
                </span>
              </div>
            </CardBody>
          </Card>

          {/* 编辑面板 */}
          <Card className="h-fit lg:sticky lg:top-4">
            {!node && <CardBody className="py-12 text-center text-sm text-muted-foreground">点击左侧节点查看/编辑</CardBody>}
            {node && tpl && (
              <NodeEditor
                node={node}
                enterpriseId={entId}
                connectedTools={connectedTools}
                onPatch={(patch) => patchNode(node.id, patch)}
              />
            )}
          </Card>
        </div>

        {/* 点击节点 → 下一层泳道图（子流程） */}
        {node && (
          <Card>
            <CardBody className="space-y-2 px-2 py-2">
              <div className="flex items-center gap-2 px-2 text-sm font-semibold">
                <Workflow className="h-4 w-4 text-[color:var(--primary)]" />
                下一层流程：{node.name}
                {subSf
                  ? <Badge tone="primary">{subSf.activities.length} 个活动</Badge>
                  : <Badge tone="muted">暂无子流程</Badge>}
                <Button size="sm" variant="outline" className="ml-auto"
                  onClick={() => router.push(`/e/${entId}/planning/subflow/${subSf?.id ?? ""}`)}
                  disabled={!subSf}>
                  进入编辑
                </Button>
              </div>
              {subSf && subSf.activities.length > 0
                ? <SubflowSwimlane lanes={subSf.lanes} activities={subSf.activities} style={flowStyle || undefined} height={300}
                    subflowIds={allSubflows.map((s) => s.ownerNodeId)}
                    onSelect={() => router.push(`/e/${entId}/planning/subflow/${subSf.id}`)} />
                : <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                    该节点还没有子流程。点击右侧编辑面板的「下钻子流程」创建。
                  </div>}
            </CardBody>
          </Card>
        )}

        {/* 跨阿米巴交接点：内部转让价 + 责任归属 */}
        {tpl && <HandoffSummary nodes={tpl.nodes} />}
      </div>

      {/* 页内 AI 助手：点击节点自动弹出，并显示成本/子流程卡片 */}
      <EngineChat
        page="规划引擎 · OTD价值流"
        subject={node?.name}
        openSignal={clickCount || undefined}
        cards={node ? (() => {
          const nr = roll?.nodes.find((x) => x.nodeId === node.id);
          return (
            <>
              {/* 成本卡片 */}
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                  <Wrench className="h-3.5 w-3.5 text-[color:var(--primary)]" /> 节点成本汇总
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {([["人工", nr?.labor], ["设备", nr?.equipment], ["材料", nr?.material], ["合计", nr?.total]] as const).map(([k, v], i) => (
                    <div key={k} className={`rounded-md border p-1.5 ${i === 3 ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5" : "border-border"}`}>
                      <div className="text-[10px] text-muted-foreground">{k}</div>
                      <div className={`text-[11px] font-semibold ${i === 3 ? "text-[color:var(--primary)]" : ""}`}>{yuan(v || 0)}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => openNodeSubflow(node)} disabled={openingNodeSf}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-[color:var(--primary)] hover:underline">
                  {openingNodeSf ? <Loader2 className="h-3 w-3 animate-spin" /> : null} 查看/录入成本明细（进子流程）→
                </button>
              </div>
              {/* 子流程卡片：神经网络图（多层可点击） */}
              <SubflowHierarchyCard
                ownerId={node.id}
                allSubflows={allSubflows}
                onEnter={(sid) => router.push(`/e/${entId}/planning/subflow/${sid}`)}
                onCreate={() => openNodeSubflow(node)}
                creating={openingNodeSf}
              />
            </>
          );
        })() : null}
        facts={[
          ...(node ? [{ label: "当前节点", value: node.name }, { label: "归属阿米巴", value: getAmiba(node.amibaId)?.name || "未归属" }] : []),
          ...(roll ? [{ label: "全链总成本", value: yuan(roll.total.total) }, { label: "人工/设备/材料", value: `${yuan(roll.total.labor)} / ${yuan(roll.total.equipment)} / ${yuan(roll.total.material)}` }] : []),
        ]}
      />
    </PageShell>
  );
}

// 相邻节点跨阿米巴处 = 交接点，需定内部转让价 + 责任归属
function HandoffSummary({ nodes }: { nodes: OtdNode[] }) {
  const sorted = nodes.slice().sort((a, b) => a.seq - b.seq);
  const handoffs: { from: OtdNode; to: OtdNode }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].amibaId !== sorted[i + 1].amibaId) handoffs.push({ from: sorted[i], to: sorted[i + 1] });
  }
  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <span>跨阿米巴交接点</span>
          <Badge tone="warning">{handoffs.length} 处</Badge>
          <span className="text-[11px] font-normal text-muted-foreground">价值流在此从一个阿米巴流向另一个，需约定内部转让价与责任归属</span>
        </div>
        <div className="space-y-1.5">
          {handoffs.map((h, i) => {
            const fa = getAmiba(h.from.amibaId);
            const ta = getAmiba(h.to.amibaId);
            return (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                <span className="font-mono text-muted-foreground">#{h.from.seq}→#{h.to.seq}</span>
                <span className="font-medium">{h.from.name}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{h.to.name}</span>
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <span className="rounded px-1.5 py-0.5 text-white" style={{ background: fa?.color }}>{fa?.short}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded px-1.5 py-0.5 text-white" style={{ background: ta?.color }}>{ta?.short}</span>
                </span>
                <span className="w-full text-[11px] text-[#b45309]">需定：内部转让价（{fa?.short}向{ta?.short}计价）· 质量/延期责任归属</span>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

// ---- 节点编辑器（右侧面板）----
function NodeEditor({ node, enterpriseId, connectedTools, onPatch }: {
  node: OtdNode; enterpriseId: string; connectedTools: Set<string>; onPatch: (patch: Partial<OtdNode>) => void;
}) {
  const router = useRouter();
  const [openingSub, setOpeningSub] = useState(false);
  const allTools: ToolId[] = ["worktime", "aps", "bom", "lean", "nesting"];

  async function openSubflow() {
    setOpeningSub(true);
    try {
      const res = await fetch("/api/subflow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enterpriseId, ownerNodeId: node.id, ownerLabel: node.name,
          defaultDepartmentId: defaultDeptForAmiba(node.amibaId),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "创建失败");
      router.push(`/e/${enterpriseId}/planning/subflow/${d.subflow.id}`);
    } catch (e) { alert((e as Error).message); setOpeningSub(false); }
  }

  function toggleTool(tool: ToolId) {
    const exists = node.tools.find((t) => t.tool === tool);
    let tools;
    if (!exists) tools = [...node.tools, { tool, enabled: true }];
    else tools = node.tools.map((t) => t.tool === tool ? { ...t, enabled: !t.enabled } : t);
    onPatch({ tools });
  }
  function setKpi(idx: number, field: keyof NodeKPI["values"], val: string) {
    const num = val === "" ? undefined : Number(val);
    const kpis = node.kpis.map((k, i) => i === idx ? { ...k, values: { ...k.values, [field]: num } } : k);
    onPatch({ kpis });
  }

  return (
    <CardBody className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <input value={node.name} onChange={(e) => onPatch({ name: e.target.value })}
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[15px] font-semibold hover:border-border focus:border-[color:var(--primary)] focus:outline-none" />
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={openSubflow} disabled={openingSub}>
        {openingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
        下钻子流程（BPMN 泳道图）
      </Button>

      <Field label="核心动作">
        <textarea value={node.action} onChange={(e) => onPatch({ action: e.target.value })}
          rows={2} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="责任岗位">
          <input value={node.role} onChange={(e) => onPatch({ role: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </Field>
        <Field label="三性高风险点">
          <select value={node.riskProp || ""} onChange={(e) => onPatch({ riskProp: (e.target.value || undefined) as ThreeProps | undefined })}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">无</option>
            <option value="rationality">合理性</option>
            <option value="completeness">完整性</option>
            <option value="correctness">正确性</option>
          </select>
        </Field>
      </div>

      <Field label="归属阿米巴">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: getAmiba(node.amibaId)?.color || "#cbd5e1" }} />
          <select value={node.amibaId || ""} onChange={(e) => onPatch({ amibaId: e.target.value || undefined })}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">未归属</option>
            {AMIBAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">改变归属后，与相邻节点不同阿米巴处会自动标记为交接点（内部转让价）。</p>
      </Field>

      <ListField label="输入交付物" items={node.inputs} onChange={(inputs) => onPatch({ inputs })} />
      <ListField label="输出交付物" items={node.outputs} onChange={(outputs) => onPatch({ outputs })} />

      {/* KPI 前后对比 */}
      <Field label="KPI（前 / 当前 / 目标）">
        <div className="space-y-2">
          {node.kpis.map((k, i) => {
            const prog = kpiProgress(k);
            return (
              <div key={k.key} className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{k.label} <span className="text-muted-foreground">({k.unit})</span></span>
                  {prog != null && <Badge tone={prog >= 100 ? "success" : prog >= 50 ? "primary" : "warning"}>达成 {prog}%</Badge>}
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(["baseline", "current", "target"] as const).map((f) => (
                    <input key={f} type="number" value={k.values[f] ?? ""} placeholder={f === "baseline" ? "前" : f === "current" ? "当前" : "目标"}
                      onChange={(e) => setKpi(i, f, e.target.value)}
                      className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs" />
                  ))}
                </div>
              </div>
            );
          })}
          {node.kpis.length === 0 && <div className="text-xs text-muted-foreground">该节点暂无 KPI</div>}
        </div>
      </Field>

      {/* 工具植入 */}
      <Field label="可植入工具（点击启用/停用）">
        <div className="flex flex-wrap gap-1.5">
          {allTools.map((t) => {
            const tb = node.tools.find((x) => x.tool === t);
            const enabled = tb?.enabled;
            const connected = connectedTools.has(t);
            return (
              <button key={t} onClick={() => toggleTool(t)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                  enabled && connected ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : enabled ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}>
                <Wrench className="h-3 w-3" />{TOOL_LABEL[t]}
                {enabled && !connected && <span className="text-[9px]">(需接入)</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">绿色=已启用且工具已接入；橙色=已启用但工具未接入（去「工具接入」页接入）。</p>
      </Field>
    </CardBody>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input value={it} onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs" />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--primary)] hover:underline">
          <Plus className="h-3 w-3" /> 添加
        </button>
      </div>
    </Field>
  );
}
