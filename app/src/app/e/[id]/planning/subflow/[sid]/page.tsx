"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft, Plus, Trash2, Save, Loader2, Check, Sparkles, Upload } from "lucide-react";
import { PageShell } from "../../../../../../components/layout/PageShell";
import { Card, CardBody } from "../../../../../../components/ui/Card";
import { Badge } from "../../../../../../components/ui/Badge";
import { Button } from "../../../../../../components/ui/Button";
import { DEPARTMENTS, getDepartment, amibaOfDepartment, handoffLevel } from "../../../../../../lib/departments";
import type { OrgDesign, DesignDepartment } from "../../../../../../lib/org-types";
import { extractText, parseTextToSubflow } from "../../../../../../lib/doc-parse";
import { autoBuildSubflowTree } from "../../../../../../lib/subflow-ai";
import { suggestNodeStandards } from "../../../../../../lib/cost-ai";
import { FlowStylePanel } from "../../../../../../components/otd/FlowStylePanel";
import { ResizableThree } from "../../../../../../components/layout/ResizableThree";
import { NodeCostPanel } from "../../../../../../components/cost/NodeCostPanel";
import { SubflowHierarchyCard } from "../../../../../../components/otd/SubflowHierarchyCard";
import { loadFlowStyle, saveFlowStyle, type FlowStyle } from "../../../../../../lib/flow-style";
import type { Subflow, ProcessActivity, Lane, IORef } from "../../../../../../lib/process-types";
import { ioName, ioInherited } from "../../../../../../lib/process-types";

const SubflowSwimlane = dynamic(
  () => import("../../../../../../components/otd/SubflowSwimlane").then((m) => m.SubflowSwimlane),
  { ssr: false, loading: () => <div className="py-12 text-center text-sm text-muted-foreground">加载泳道图…</div> },
);

let actSeq = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(actSeq++).toString(36)}`;

export default function SubflowPage() {
  const params = useParams<{ id: string; sid: string }>();
  const router = useRouter();
  const [sf, setSf] = useState<Subflow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [newAct, setNewAct] = useState<{ name: string; laneId: string }>({ name: "", laneId: "" });
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [parseWarn, setParseWarn] = useState<string[]>([]);
  const [style, setStyle] = useState<FlowStyle | null>(null);
  const [selActId, setSelActId] = useState<string | null>(null);
  const [drilling, setDrilling] = useState(false);
  const [allSubflows, setAllSubflows] = useState<Subflow[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [org, setOrg] = useState<OrgDesign>({ enterpriseId: "", departments: [], amibaUnits: [] });
  const [costVersion, setCostVersion] = useState(0);   // 自动生成标准后，触发 NodeCostPanel 重载
  const autoGenTried = useRef<Set<string>>(new Set());

  // 点击节点即自动生成：标准输入物/输出物 + 标准参考值 + 工作方式（仅当该活动尚未设置时）
  useEffect(() => {
    if (!selActId || !sf) return;
    const act = sf.activities.find((a) => a.id === selActId);
    if (!act || autoGenTried.current.has(act.id)) return;
    if ((act.inputs?.length || 0) > 0 || (act.outputs?.length || 0) > 0) return; // 已有则不重复生成
    autoGenTried.current.add(act.id);
    (async () => {
      try {
        const sd = await suggestNodeStandards(act.name);
        patch({ activities: sf.activities.map((a) => a.id === act.id ? { ...a, inputs: sd.inputs, outputs: sd.outputs } : a) });
        await fetch("/api/node-cost", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enterpriseId: params.id, nodeId: act.id, label: act.name, standard: sd.standard, workMethod: sd.workMethod }),
        });
        setCostVersion((v) => v + 1);
      } catch { /* 无 Key / 失败：静默，用户可手工填或配置模型 */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selActId, sf]);

  useEffect(() => {
    fetch(`/api/subflow/${params.sid}`).then((r) => r.json()).then((d) => setSf(d.subflow || null));
    setStyle(loadFlowStyle());
  }, [params.sid]);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/subflow?enterpriseId=${params.id}`).then((r) => r.json()).then((d) => setAllSubflows(d.subflows || []));
    fetch(`/api/org-design?enterpriseId=${params.id}`).then((r) => r.json()).then((d) => { if (d.org) setOrg(d.org); });
  }, [params.id, params.sid]);

  // 部门来自设计引擎组织架构（回退静态目录）
  const unitColor = (amibaId?: string) => org.amibaUnits.find((u) => u.id === amibaId)?.color;
  const laneLabel = (lane: { departmentId: string; name?: string }) => lane.name || getDepartment(lane.departmentId)?.name || "未指定部门";

  function changeStyle(s: FlowStyle) { setStyle(s); saveFlowStyle(s); }

  // 在活动上继续下钻生成子流程（递归泳道图）
  async function drillActivity(act: ProcessActivity) {
    setDrilling(true);
    try {
      const res = await fetch("/api/subflow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enterpriseId: params.id, ownerNodeId: act.id, ownerLabel: act.name,
          defaultDepartmentId: sf?.lanes.find((l) => l.id === act.laneId)?.departmentId,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "创建失败");
      router.push(`/e/${params.id}/planning/subflow/${d.subflow.id}`);
    } catch (e) { alert((e as Error).message); setDrilling(false); }
  }

  async function runParse(text: string) {
    if (!sf || !text.trim()) return;
    setParsing(true); setParseWarn([]);
    try {
      const draft = await parseTextToSubflow(text);
      if (draft.activities.length === 0) { setParseWarn(draft.warnings); return; }
      patch({ lanes: draft.lanes, activities: draft.activities, edges: draft.edges });
      setParseWarn(draft.warnings);
    } catch (e) { alert((e as Error).message); } finally { setParsing(false); }
  }

  async function onFile(file: File) {
    setParsing(true); setParseWarn([]);
    try {
      const text = await extractText(file);
      setParseText(text.slice(0, 4000));
      await runParse(text);
    } catch (e) { alert("读取文档失败：" + (e as Error).message); setParsing(false); }
  }

  // 智能体自主生成多层级子流程（基于上层环节 + 设计部门，递归拆解并持久化）
  async function aiGenerate() {
    if (!sf) return;
    setGenerating(true); setParseWarn([]);
    try {
      const res = await autoBuildSubflowTree({
        enterpriseId: params.id, rootSubflowId: sf.id, rootOwnerLabel: sf.ownerLabel || "本环节",
        departments: org.departments, unitColor, maxDepth: 3, maxSubflows: 8,
      });
      // 重新加载（已持久化）
      const cur = await (await fetch(`/api/subflow/${sf.id}`)).json();
      if (cur.subflow) { setSf(cur.subflow); setDirty(false); }
      const all = await (await fetch(`/api/subflow?enterpriseId=${params.id}`)).json();
      setAllSubflows(all.subflows || []);
      setParseWarn([`已自动生成 ${res.created} 个层级子流程（含递归拆解）`, ...res.warnings]);
    } catch (e) { alert((e as Error).message); } finally { setGenerating(false); }
  }

  function patch(p: Partial<Pick<Subflow, "lanes" | "activities" | "edges">>) {
    setSf((s) => s ? { ...s, ...p } : s);
    setDirty(true);
  }

  function addLane(d: DesignDepartment) {
    if (!sf || sf.lanes.some((l) => l.departmentId === d.id)) return;
    patch({ lanes: [...sf.lanes, { id: uid("lane"), departmentId: d.id, name: d.name, color: unitColor(d.amibaId), amibaUnitId: d.amibaId }] });
  }
  function removeLane(laneId: string) {
    if (!sf) return;
    if (sf.activities.some((a) => a.laneId === laneId)) { alert("请先移除该泳道内的活动"); return; }
    patch({ lanes: sf.lanes.filter((l) => l.id !== laneId) });
  }
  function addActivity() {
    if (!sf || !newAct.name.trim() || !newAct.laneId) return;
    const seq = sf.activities.length ? Math.max(...sf.activities.map((a) => a.seq)) + 1 : 0;
    patch({ activities: [...sf.activities, { id: uid("act"), name: newAct.name.trim(), laneId: newAct.laneId, seq }] });
    setNewAct({ name: "", laneId: newAct.laneId });
  }
  function updateActivity(id: string, p: Partial<ProcessActivity>) {
    if (!sf) return;
    patch({ activities: sf.activities.map((a) => a.id === id ? { ...a, ...p } : a) });
  }
  function removeActivity(id: string) {
    if (!sf) return;
    patch({ activities: sf.activities.filter((a) => a.id !== id) });
  }

  async function save() {
    if (!sf) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/subflow/${sf.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lanes: sf.lanes, activities: sf.activities, edges: sf.edges }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setDirty(false); setSavedAt(true); setTimeout(() => setSavedAt(false), 2000);
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  }

  const laneOfAct = (laneId: string) => sf?.lanes.find((l) => l.id === laneId);
  const ordered = sf ? sf.activities.slice().sort((a, b) => a.seq - b.seq) : [];
  const handoffs = ordered.slice(0, -1).map((a, i) => {
    const b = ordered[i + 1];
    const la = laneOfAct(a.laneId), lb = laneOfAct(b.laneId);
    let level: "none" | "collab" | "transfer" = "none";
    if (la && lb && la.id !== lb.id) {
      const ua = la.amibaUnitId, ub = lb.amibaUnitId;
      level = ua && ub ? (ua !== ub ? "transfer" : "collab")
        : handoffLevel(getDepartment(la.departmentId)?.id, getDepartment(lb.departmentId)?.id) === "transfer" ? "transfer" : "collab";
    }
    return { a, b, da: { short: laneLabel(la || { departmentId: "" }) }, db: { short: laneLabel(lb || { departmentId: "" }) }, level };
  }).filter((h) => h.level !== "none");

  // 设计引擎部门优先；无设计数据时回退静态目录
  const sourceDepts: DesignDepartment[] = org.departments.length
    ? org.departments
    : DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, personnel: [], amibaId: d.amibaId }));
  const availableDepts = sourceDepts.filter((d) => !sf?.lanes.some((l) => l.departmentId === d.id));

  return (
    <PageShell
      title={`子流程 · ${sf?.ownerLabel || ""}`}
      subtitle="BPMN 泳道（泳道=部门）· 跨部门交接生成转让价/协作价 · 叶子活动承载成本归因"
    >
      <div className="space-y-4">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <button onClick={() => router.push(`/e/${params.id}/planning`)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> 返回 OTD 流程
            </button>
            <div className="ml-auto flex items-center gap-2">
              {savedAt && <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> 已保存</span>}
              <Button size="sm" onClick={save} disabled={!dirty || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存
              </Button>
            </div>
          </CardBody>
        </Card>

        {!sf && <div className="py-12 text-center text-sm text-muted-foreground">加载中…</div>}

        {sf && (
          <>
            {/* 三栏可调宽：左=泳道部门编辑 · 中=泳道图 · 右=节点样式配置（拖动栏间分隔条调宽） */}
            <ResizableThree storageKey="amiba.subflow.cols" leftDefault={300} rightDefault={300}
              left={(
              <Card>
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">泳道（部门）编辑</div>
                  {sf.lanes.length === 0 && <div className="text-xs text-muted-foreground">还没有泳道，请在下方添加部门泳道。</div>}
                  {sf.lanes.map((lane) => {
                    const color = lane.color || amibaOfDepartment(lane.departmentId)?.color || "#cbd5e1";
                    const acts = ordered.filter((a) => a.laneId === lane.id);
                    return (
                      <div key={lane.id} className="rounded-lg border border-border">
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2" style={{ borderLeft: `4px solid ${color}` }}>
                          <span className="text-sm font-medium">{laneLabel(lane)}</span>
                          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                          <button onClick={() => removeLane(lane.id)} className="ml-auto text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="flex flex-wrap gap-2 px-3 py-2">
                          {acts.length === 0 && <span className="text-[11px] text-muted-foreground">（无活动）</span>}
                          {acts.map((a) => (
                            <span key={a.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs">
                              <span className="font-mono text-[10px] text-muted-foreground">{a.seq}</span>
                              <input value={a.name} onChange={(e) => updateActivity(a.id, { name: e.target.value })} className="w-24 bg-transparent focus:outline-none" />
                              <select value={a.laneId} onChange={(e) => updateActivity(a.id, { laneId: e.target.value })} className="bg-transparent text-[10px] text-muted-foreground">
                                {sf.lanes.map((l) => <option key={l.id} value={l.id}>{laneLabel(l)}</option>)}
                              </select>
                              <button onClick={() => removeActivity(a.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="space-y-2 border-t border-border pt-3">
                    {availableDepts.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <select id="addlane" className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs" defaultValue="">
                          <option value="" disabled>添加部门泳道…</option>
                          {availableDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <Button size="sm" variant="outline" onClick={() => {
                          const el = document.getElementById("addlane") as HTMLSelectElement;
                          const d = availableDepts.find((x) => x.id === el?.value);
                          if (d) { addLane(d); el.value = ""; }
                        }}><Plus className="h-3.5 w-3.5" /> 泳道</Button>
                      </div>
                    )}
                    {sf.lanes.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <input value={newAct.name} onChange={(e) => setNewAct({ ...newAct, name: e.target.value })} placeholder="新活动名称" className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                        <select value={newAct.laneId} onChange={(e) => setNewAct({ ...newAct, laneId: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                          <option value="">选泳道…</option>
                          {sf.lanes.map((l) => <option key={l.id} value={l.id}>{laneLabel(l)}</option>)}
                        </select>
                        <Button size="sm" variant="outline" onClick={addActivity}><Plus className="h-3.5 w-3.5" /> 活动</Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              )}
              center={(
              <Card>
                <CardBody className="px-2 py-2">
                  <SubflowSwimlane lanes={sf.lanes} activities={sf.activities} style={style || undefined}
                    subflowIds={allSubflows.map((s) => s.ownerNodeId)}
                    selectedId={selActId} onSelect={(id) => { setSelActId(id); setClickCount((c) => c + 1); }} />
                </CardBody>
              </Card>
              )}
              right={style ? <FlowStylePanel style={style} onChange={changeStyle} /> : null}
            />

            {/* 选中活动：成本录入 + 继续下钻 */}
            {selActId && (() => {
              const act = sf.activities.find((a) => a.id === selActId);
              if (!act) return null;
              return (
                <Card>
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="primary">#{act.seq}</Badge>
                      <span className="text-sm font-semibold">{act.name}</span>
                      <span className="text-[11px] text-muted-foreground">{laneLabel(sf.lanes.find((l) => l.id === act.laneId) || { departmentId: "" })}</span>
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => drillActivity(act)} disabled={drilling}>
                        {drilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 继续下钻子流程
                      </Button>
                    </div>
                    {/* 输入物 / 输出物（可多个；输入物可标识 继承上节点输出 / 本节点新增） */}
                    {(() => {
                      const ins: IORef[] = act.inputs || [];
                      const outs: IORef[] = act.outputs || [];
                      const setIns = (next: IORef[]) => updateActivity(act.id, { inputs: next });
                      const setOuts = (next: IORef[]) => updateActivity(act.id, { outputs: next });
                      return (
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div className="space-y-1.5">
                            <div className="text-muted-foreground">输入物 <span className="text-[10px]">（点标签切换 继承/新增）</span></div>
                            {ins.map((x, i) => {
                              const inh = ioInherited(x);
                              return (
                                <div key={i} className="flex items-center gap-1">
                                  <button type="button" title="切换：继承上节点输出 / 本节点新增"
                                    onClick={() => setIns(ins.map((y, j) => j === i ? { name: ioName(y), inherited: !inh } : y))}
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${inh ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]" : "bg-emerald-100 text-emerald-700"}`}>
                                    {inh ? "继承" : "新增"}
                                  </button>
                                  <input value={ioName(x)} placeholder="如：客户订单"
                                    onChange={(e) => setIns(ins.map((y, j) => j === i ? { name: e.target.value, inherited: ioInherited(y) } : y))}
                                    className="w-full rounded border border-border bg-background px-2 py-1" />
                                  <button type="button" onClick={() => setIns(ins.filter((_, j) => j !== i))} className="shrink-0 text-muted-foreground hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                                </div>
                              );
                            })}
                            <button type="button" onClick={() => setIns([...ins, { name: "", inherited: false }])} className="inline-flex items-center gap-1 text-[color:var(--primary)] hover:underline"><Plus className="h-3 w-3" /> 加输入物</button>
                          </div>
                          <div className="space-y-1.5">
                            <div className="text-muted-foreground">输出物 <span className="text-[10px]">（本节点产出，下节点可继承）</span></div>
                            {outs.map((x, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <input value={ioName(x)} placeholder="如：技术可行性分析"
                                  onChange={(e) => setOuts(outs.map((y, j) => j === i ? e.target.value : y))}
                                  className="w-full rounded border border-border bg-background px-2 py-1" />
                                <button type="button" onClick={() => setOuts(outs.filter((_, j) => j !== i))} className="shrink-0 text-muted-foreground hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setOuts([...outs, ""])} className="inline-flex items-center gap-1 text-[color:var(--primary)] hover:underline"><Plus className="h-3 w-3" /> 加输出物</button>
                          </div>
                        </div>
                      );
                    })()}
                    <NodeCostPanel key={`${act.id}-${costVersion}`} enterpriseId={params.id} nodeId={act.id} label={act.name}
                      inputs={act.inputs} outputs={act.outputs}
                      openSignal={clickCount || undefined}
                      cards={
                        <SubflowHierarchyCard
                          ownerId={act.id}
                          allSubflows={allSubflows}
                          onEnter={(sid) => router.push(`/e/${params.id}/planning/subflow/${sid}`)}
                          onCreate={() => drillActivity(act)}
                          creating={drilling}
                        />
                      }
                    />
                  </CardBody>
                </Card>
              );
            })()}

            {/* 解析文档生成泳道图 */}
            <Card>
              <CardBody className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-[color:var(--primary)]" /> 解析文档生成泳道图
                  <span className="text-[11px] font-normal text-muted-foreground">上传 Word/PDF/文本，或粘贴流程描述，AI 抽取活动并按部门归入泳道</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">
                    <Upload className="h-3.5 w-3.5" /> 上传文档
                    <input type="file" accept=".txt,.md,.csv,.bpmn,.xml,.json,.docx,.pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
                  </label>
                  <span className="text-[11px] text-muted-foreground">支持 .docx / .pdf / .txt / .csv / .bpmn</span>
                </div>
                <textarea value={parseText} onChange={(e) => setParseText(e.target.value)} rows={3}
                  placeholder="或在此粘贴流程描述文本，例如：销售接单后转工艺出工艺路线，再到冲压、焊接、总装，最后质检入库…"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => runParse(parseText)} disabled={parsing || generating || !parseText.trim()}>
                    {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 解析文档生成
                  </Button>
                  <Button size="sm" onClick={aiGenerate} disabled={parsing || generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI 自动生成子流程（多层级）
                  </Button>
                  <span className="text-[11px] text-amber-600">AI 基于本环节+设计部门提议并自动递归拆解多层；结果已保存，可继续修改。</span>
                </div>
                {parseWarn.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-amber-600">
                    {parseWarn.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* 跨部门交接 */}
            <Card>
              <CardBody>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  跨部门交接<Badge tone="warning">{handoffs.length} 处</Badge>
                  <span className="text-[11px] font-normal text-muted-foreground">跨阿米巴=正式转让价；同阿米巴内跨部门=轻量协作价</span>
                </div>
                {handoffs.length === 0 && <div className="text-xs text-muted-foreground">暂无跨部门交接。</div>}
                <div className="space-y-1.5">
                  {handoffs.map((h, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs">
                      <span className="font-medium">{h.a.name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{h.b.name}</span>
                      <span className="text-muted-foreground">（{h.da?.short} → {h.db?.short}）</span>
                      <Badge tone={h.level === "transfer" ? "warning" : "muted"} className="ml-auto">
                        {h.level === "transfer" ? "正式转让价（跨阿米巴）" : "协作价（同阿米巴）"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
