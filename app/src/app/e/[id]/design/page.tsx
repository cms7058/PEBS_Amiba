"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Sparkles, Upload, Plus, Trash2, Save, Loader2, Check, Users, Building2 } from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { EngineChat } from "../../../../components/agent/EngineChat";
import { extractText } from "../../../../lib/doc-parse";
import { parseOrgFromText, planAmiba } from "../../../../lib/org-ai";
import { AMIBA_TYPE_COLORS, type OrgDesign, type AmibaUnit, type DesignDepartment } from "../../../../lib/org-types";

const OrgTree = dynamic(() => import("../../../../components/org/OrgTree").then((m) => m.OrgTree),
  { ssr: false, loading: () => <div className="py-12 text-center text-sm text-muted-foreground">加载架构图…</div> });

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
const TYPES: AmibaUnit["type"][] = ["营销", "制造", "支持", "职能"];

export default function DesignPage() {
  const params = useParams<{ id: string }>();
  const entId = params.id;
  const [org, setOrg] = useState<OrgDesign>({ enterpriseId: entId, departments: [], amibaUnits: [] });
  const [entName, setEntName] = useState("");
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warn, setWarn] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/org-design?enterpriseId=${entId}`).then((r) => r.json()).then((d) => { if (d.org) setOrg(d.org); });
    fetch(`/api/enterprises/${entId}`).then((r) => r.json()).then((d) => setEntName(d.enterprise?.name || "企业"));
  }, [entId]);

  const set = (p: Partial<OrgDesign>) => { setOrg((o) => ({ ...o, ...p })); setDirty(true); };

  async function onFile(file: File) {
    setParsing(true); setWarn([]);
    try { const t = await extractText(file); setParseText(t.slice(0, 4000)); await runParse(t); }
    catch (e) { alert("读取失败：" + (e as Error).message); setParsing(false); }
  }
  async function runParse(text: string) {
    if (!text.trim()) return;
    setParsing(true); setWarn([]);
    try { const { departments, warnings } = await parseOrgFromText(text); set({ departments, amibaUnits: [] }); setWarn(warnings); }
    catch (e) { alert((e as Error).message); } finally { setParsing(false); }
  }
  async function autoPlan() {
    if (!org.departments.length) { alert("请先导入或添加部门。"); return; }
    setPlanning(true);
    try { const { amibaUnits, departments, note } = await planAmiba(org.departments); set({ amibaUnits, departments }); setWarn([note]); }
    catch (e) { alert((e as Error).message); } finally { setPlanning(false); }
  }
  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/org-design", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...org, enterpriseId: entId }) });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  }

  const setDepts = (departments: DesignDepartment[]) => set({ departments });
  const addDept = () => setDepts([...org.departments, { id: uid("dep"), name: "新部门", personnel: [] }]);
  const totalPeople = org.departments.reduce((s, d) => s + d.personnel.length, 0);

  return (
    <PageShell title="设计引擎 · 阿米巴单元构建" subtitle="导入组织架构 → 解析部门/人员 → AI 自主规划阿米巴单元 → 杜邦式架构图（对话迭代）">
      <div className="space-y-4">
        {/* 导入解析 */}
        <Card>
          <CardBody className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-[color:var(--primary)]" /> 导入组织架构（AI 解析）
              <span className="text-[11px] font-normal text-muted-foreground">上传 Word/PDF/文本或粘贴描述，抽取部门与人员</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">
                <Upload className="h-3.5 w-3.5" /> 上传文档
                <input type="file" accept=".txt,.md,.csv,.docx,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
              </label>
              <div className="ml-auto flex items-center gap-2">
                {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> 已保存</span>}
                <Button size="sm" onClick={save} disabled={!dirty || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存</Button>
              </div>
            </div>
            <textarea value={parseText} onChange={(e) => setParseText(e.target.value)} rows={3}
              placeholder="或粘贴：如『公司下设销售部(张三/经理)、采购部、冲压车间、焊接车间、质检部、财务部…』"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => runParse(parseText)} disabled={parsing || !parseText.trim()}>
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI 解析组织架构
              </Button>
              <Button size="sm" onClick={autoPlan} disabled={planning || !org.departments.length}>
                {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI 自动规划阿米巴单元
              </Button>
              <span className="text-[11px] text-amber-600">AI 仅提议方案，可在下方修改、或在右侧 AI 助手对话迭代。</span>
            </div>
            {warn.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-amber-600">{warn.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          </CardBody>
        </Card>

        {/* 杜邦式组织架构图 */}
        <Card>
          <CardHeader title="阿米巴组织架构图（杜邦式分层）" desc="企业 → 阿米巴单元 → 部门 · Ctrl/⌘+滚轮缩放，拖拽平移" />
          <CardBody className="px-2 py-2">
            {org.departments.length === 0
              ? <div className="py-12 text-center text-sm text-muted-foreground">尚无组织数据，请先导入解析或手工添加部门。</div>
              : <OrgTree org={org} enterpriseName={entName} />}
          </CardBody>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* 阿米巴单元 */}
          <Card>
            <CardHeader title="阿米巴单元" desc="AI 规划或手工调整 · 转让价/核算规则" action={
              <Button size="sm" variant="outline" onClick={() => set({ amibaUnits: [...org.amibaUnits, { id: uid("amb"), name: "新单元", type: "支持", departmentIds: [], color: AMIBA_TYPE_COLORS["支持"] }] })}><Plus className="h-3.5 w-3.5" /> 单元</Button>} />
            <CardBody className="space-y-2">
              {org.amibaUnits.length === 0 && <div className="text-xs text-muted-foreground">还没有阿米巴单元，点「AI 自动规划阿米巴单元」或手工添加。</div>}
              {org.amibaUnits.map((u) => (
                <div key={u.id} className="rounded-lg border border-border p-2" style={{ borderLeft: `4px solid ${u.color || "#94a3b8"}` }}>
                  <div className="flex items-center gap-1.5">
                    <input value={u.name} onChange={(e) => set({ amibaUnits: org.amibaUnits.map((x) => x.id === u.id ? { ...x, name: e.target.value } : x) })} className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-border focus:border-[color:var(--primary)] focus:outline-none" />
                    <select value={u.type} onChange={(e) => { const type = e.target.value as AmibaUnit["type"]; set({ amibaUnits: org.amibaUnits.map((x) => x.id === u.id ? { ...x, type, color: AMIBA_TYPE_COLORS[type] } : x) }); }} className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => set({ amibaUnits: org.amibaUnits.filter((x) => x.id !== u.id), departments: org.departments.map((d) => d.amibaId === u.id ? { ...d, amibaId: undefined } : d) })} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <input value={u.transferPrice || ""} onChange={(e) => set({ amibaUnits: org.amibaUnits.map((x) => x.id === u.id ? { ...x, transferPrice: e.target.value } : x) })} placeholder="内部转让价思路" className="mt-1 w-full rounded border border-border bg-background px-1.5 py-1 text-[11px]" />
                  <input value={u.costRule || ""} onChange={(e) => set({ amibaUnits: org.amibaUnits.map((x) => x.id === u.id ? { ...x, costRule: e.target.value } : x) })} placeholder="内部成本核算规则" className="mt-1 w-full rounded border border-border bg-background px-1.5 py-1 text-[11px]" />
                </div>
              ))}
            </CardBody>
          </Card>

          {/* 部门 / 人员 */}
          <Card>
            <CardHeader title={`部门与人员（${org.departments.length} 部门 / ${totalPeople} 人）`} desc="可改归属阿米巴单元" action={
              <Button size="sm" variant="outline" onClick={addDept}><Plus className="h-3.5 w-3.5" /> 部门</Button>} />
            <CardBody className="space-y-2">
              {org.departments.map((d) => (
                <div key={d.id} className="rounded-lg border border-border p-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input value={d.name} onChange={(e) => setDepts(org.departments.map((x) => x.id === d.id ? { ...x, name: e.target.value } : x))} className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-border focus:border-[color:var(--primary)] focus:outline-none" />
                    <select value={d.amibaId || ""} onChange={(e) => setDepts(org.departments.map((x) => x.id === d.id ? { ...x, amibaId: e.target.value || undefined } : x))} className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]">
                      <option value="">未归属</option>
                      {org.amibaUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button onClick={() => setDepts(org.departments.filter((x) => x.id !== d.id))} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-1 space-y-1 pl-5">
                    {d.personnel.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <input value={p.name} onChange={(e) => setDepts(org.departments.map((x) => x.id === d.id ? { ...x, personnel: x.personnel.map((y) => y.id === p.id ? { ...y, name: e.target.value } : y) } : x))} placeholder="姓名" className="w-20 rounded border border-border bg-background px-1 py-0.5 text-[11px]" />
                        <input value={p.role || ""} onChange={(e) => setDepts(org.departments.map((x) => x.id === d.id ? { ...x, personnel: x.personnel.map((y) => y.id === p.id ? { ...y, role: e.target.value } : y) } : x))} placeholder="岗位" className="w-20 rounded border border-border bg-background px-1 py-0.5 text-[11px]" />
                        <input type="number" value={p.monthlyIncome ?? ""} onChange={(e) => setDepts(org.departments.map((x) => x.id === d.id ? { ...x, personnel: x.personnel.map((y) => y.id === p.id ? { ...y, monthlyIncome: e.target.value ? +e.target.value : undefined } : y) } : x))} placeholder="月收入" className="w-20 rounded border border-border bg-background px-1 py-0.5 text-[11px]" />
                        <button onClick={() => setDepts(org.departments.map((x) => x.id === d.id ? { ...x, personnel: x.personnel.filter((y) => y.id !== p.id) } : x))} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => setDepts(org.departments.map((x) => x.id === d.id ? { ...x, personnel: [...x.personnel, { id: uid("emp"), name: "" }] } : x))} className="inline-flex items-center gap-1 text-[11px] text-[color:var(--primary)] hover:underline"><Plus className="h-3 w-3" /> 加人员</button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      <EngineChat page="设计引擎 · 阿米巴单元设计" subject="阿米巴单元/部门/转让价"
        facts={[
          { label: "部门数", value: String(org.departments.length) },
          { label: "人员数", value: String(totalPeople) },
          { label: "阿米巴单元", value: org.amibaUnits.map((u) => `${u.name}(${u.type})`).join("、") || "未规划" },
        ]} />
    </PageShell>
  );
}
