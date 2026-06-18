"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Check, AlertTriangle, Users, Cpu, Boxes } from "lucide-react";
import { Button } from "../ui/Button";
import { EngineChat } from "../agent/EngineChat";
import { ioName, ioInherited, type IORef } from "../../lib/process-types";
import {
  costVariance, pendingQuestions, asItemized,
  type NodeCost, type IOCost,
} from "../../lib/cost-types";

const yuan = (n: number) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
type FactorKey = "labor" | "equipment" | "material";
type Which = "standard" | "actual";
type Side = "inputs" | "outputs";

// 三要素：图标 + 配色（人=蓝 / 工作方式=紫 / 料=琥珀）
const FACTORS: { k: FactorKey; label: string; Icon: typeof Users; box: string; chip: string }[] = [
  { k: "labor", label: "人", Icon: Users, box: "border-blue-300 bg-blue-50 text-blue-900", chip: "text-blue-700" },
  { k: "equipment", label: "工作方式", Icon: Cpu, box: "border-purple-300 bg-purple-50 text-purple-900", chip: "text-purple-700" },
  { k: "material", label: "料", Icon: Boxes, box: "border-amber-300 bg-amber-50 text-amber-900", chip: "text-amber-700" },
];
const DEFAULT_MODES = ["ERP系统模块", "MES系统模块", "PLM/PDM系统模块", "APS排产系统", "WMS系统模块", "OA审批流", "半自动化采集统计", "手工采集统计"];
// 金额只统计 人 + 料（工作方式仅作模式选择，不再单列金额）
const AMT_FACTORS = FACTORS.filter((f) => f.k !== "equipment");

export function NodeCostPanel({ enterpriseId, nodeId, label, inputs, outputs, cards, openSignal }: {
  enterpriseId: string; nodeId: string; label?: string;
  inputs?: IORef[]; outputs?: IORef[];
  cards?: React.ReactNode; openSignal?: string | number;
}) {
  const [nc, setNc] = useState<NodeCost>({ enterpriseId, nodeId, label });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/node-cost?enterpriseId=${enterpriseId}&nodeId=${nodeId}`)
      .then((r) => r.json())
      .then((d) => { setNc(d.cost || { enterpriseId, nodeId, label }); setDirty(false); });
  }, [enterpriseId, nodeId, label]);

  const patch = (p: Partial<NodeCost>) => { setNc((c) => ({ ...c, ...p })); setDirty(true); };
  const variance = costVariance(nc);
  const pending = pendingQuestions(nc);
  const stdIt = asItemized(nc.standard);
  const actIt = asItemized(nc.actual);
  const wm = nc.workMethod;
  const modeOptions = Array.from(new Set([...(wm?.options || []), ...DEFAULT_MODES])).filter(Boolean);

  const inNames = (inputs && inputs.length) ? inputs.map(ioName) : stdIt.inputs.map((c, i) => c.name || `输入物${i + 1}`);
  const inInherited = inputs ? inputs.map(ioInherited) : inNames.map(() => false);
  const outNames = (outputs && outputs.length) ? outputs.map(ioName) : stdIt.outputs.map((c, i) => c.name || `输出物${i + 1}`);

  const updateArr = (which: Which, side: Side, idx: number, mut: (item: IOCost) => IOCost) => {
    const cur = asItemized(which === "standard" ? nc.standard : nc.actual);
    const arr = (cur[side] || []).slice();
    while (arr.length <= idx) arr.push({});
    const nm = side === "inputs" ? inNames[idx] : outNames[idx];
    arr[idx] = mut({ ...arr[idx], name: nm });
    patch({ [which]: { inputs: cur.inputs || [], outputs: cur.outputs || [], [side]: arr } });
  };
  const setAmt = (which: Which, side: Side, idx: number, k: FactorKey, val: string) =>
    updateArr(which, side, idx, (it) => ({ ...it, [k]: val === "" ? undefined : Number(val) }));
  const setMode = (which: Which, side: Side, idx: number, val: string) =>
    updateArr(which, side, idx, (it) => ({ ...it, method: val || undefined }));
  const setMetric = (key: keyof NonNullable<NodeCost["metrics"]>, val: string) =>
    patch({ metrics: { ...nc.metrics, [key]: val === "" ? undefined : Number(val) } });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/node-cost", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nc, enterpriseId, nodeId, label }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  }

  const m = nc.metrics || {};
  const sectionProps = {
    modeOptions, setAmt, setMode,
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 p-2">
        <div className="mb-1.5 text-[11px] font-medium">输入/输出指标（%）<span className="ml-1 text-[10px] font-normal text-muted-foreground">用于后期与成本耦合分析，自动修正标准参考值</span></div>
        <div className="grid grid-cols-4 gap-1.5">
          {([["inputAccuracy", "输入准确率"], ["inputTimeliness", "输入及时率"], ["outputAccuracy", "输出准确率"], ["outputTimeliness", "输出及时率"]] as const).map(([k, lab]) => (
            <div key={k}>
              <div className="mb-0.5 text-[10px] text-muted-foreground">{lab}</div>
              <input type="number" value={m[k] ?? ""} placeholder="%" onChange={(e) => setMetric(k, e.target.value)} className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs" />
            </div>
          ))}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> 待完成清单（{pending.length}）</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-amber-700">{pending.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">每个输入物/输出物分别承载人/工作方式/料（左=标准、右=实际）；工作方式选模式（标准=AI推荐、实际=用户选）。逐项累加为阶段小计与因素合计。</p>

      <ItemSection title="输入物获取成本" phase="acquire" names={inNames} inherited={inInherited}
        stdArr={stdIt.inputs} actArr={actIt.inputs} subtotal={variance} side="inputs" recommended={wm?.recommended} {...sectionProps} />
      <ItemSection title="输出物生成成本" phase="generate" names={outNames} inherited={null}
        stdArr={stdIt.outputs} actArr={actIt.outputs} subtotal={variance} side="outputs" recommended={wm?.recommended} {...sectionProps} />

      {/* 因素合计（获取+生成 累加） */}
      <div className="rounded-lg border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 p-2.5">
        <div className="mb-1.5 text-[11px] font-semibold text-[color:var(--primary)]">因素合计（输入物获取 + 输出物生成）</div>
        <div className="grid grid-cols-[88px_1fr_1fr_1fr] items-center gap-x-2 gap-y-1 text-[11px]">
          <div />
          <div className="text-center text-[10px] text-muted-foreground">标准</div>
          <div className="text-center text-[10px] text-muted-foreground">实际</div>
          <div className="text-center text-[10px] text-muted-foreground">差值</div>
          {AMT_FACTORS.map(({ k, label: lab, Icon, chip }) => {
            const v = variance[k];
            return (
              <Frag key={k}>
                <div className={`flex items-center gap-1 text-[10px] ${chip}`}><Icon className="h-3 w-3" />{lab}</div>
                <div className="text-right font-mono">{yuan(v.std)}</div>
                <div className="text-right font-mono">{yuan(v.act)}</div>
                <div className={`text-right font-mono ${v.diff > 0 ? "text-red-600" : v.diff < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{v.diff > 0 ? "+" : ""}{yuan(v.diff)}</div>
              </Frag>
            );
          })}
          <div className="border-t border-border pt-1 text-[10px] font-semibold">总计</div>
          <div className="border-t border-border pt-1 text-right font-mono">{yuan(variance.total.std)}</div>
          <div className="border-t border-border pt-1 text-right font-mono text-[color:var(--primary)]">{yuan(variance.total.act)}</div>
          <div className={`border-t border-border pt-1 text-right font-mono ${variance.total.diff > 0 ? "text-red-600" : variance.total.diff < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{variance.total.diff > 0 ? "+" : ""}{yuan(variance.total.diff)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存</Button>
        {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> 已保存</span>}
      </div>

      <EngineChat
        page="规则引擎 · 成本录入" subject={label || nodeId} cards={cards} openSignal={openSignal}
        facts={[
          { label: "节点", value: label || nodeId },
          { label: "人(标/实/差)", value: `${yuan(variance.labor.std)} / ${yuan(variance.labor.act)} / ${variance.labor.diff > 0 ? "+" : ""}${yuan(variance.labor.diff)}` },
          { label: "工作方式成本(标/实/差)", value: `${yuan(variance.equipment.std)} / ${yuan(variance.equipment.act)} / ${variance.equipment.diff > 0 ? "+" : ""}${yuan(variance.equipment.diff)}` },
          { label: "料(标/实/差)", value: `${yuan(variance.material.std)} / ${yuan(variance.material.act)} / ${variance.material.diff > 0 ? "+" : ""}${yuan(variance.material.diff)}` },
          { label: "获取/生成(实际)", value: `获取 ${yuan(variance.labor.acquire.act + variance.equipment.acquire.act + variance.material.acquire.act)} · 生成 ${yuan(variance.labor.generate.act + variance.equipment.generate.act + variance.material.generate.act)}` },
          { label: "输入/输出指标", value: `输入 准${m.inputAccuracy ?? "—"}%/时${m.inputTimeliness ?? "—"}% · 输出 准${m.outputAccuracy ?? "—"}%/时${m.outputTimeliness ?? "—"}%` },
          { label: "待完成项", value: pending.length ? pending.join("；") : "无" },
        ]}
      />
    </div>
  );
}

function Frag({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function ItemSection({ title, phase, names, inherited, stdArr, actArr, subtotal, side, recommended, modeOptions, setAmt, setMode }: {
  title: string; phase: "acquire" | "generate"; names: string[]; inherited: boolean[] | null;
  stdArr: IOCost[]; actArr: IOCost[];
  subtotal: ReturnType<typeof costVariance>; side: Side; recommended?: string; modeOptions: string[];
  setAmt: (which: Which, side: Side, idx: number, k: FactorKey, val: string) => void;
  setMode: (which: Which, side: Side, idx: number, val: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[10px] text-muted-foreground">{names.length} 项 · 每要素 左标准 / 右实际</span>
      </div>
      {names.length === 0 ? (
        <div className="rounded border border-dashed border-border px-2 py-3 text-center text-[11px] text-muted-foreground">请先在上方添加{side === "inputs" ? "输入物" : "输出物"}</div>
      ) : (
        <div className="space-y-2">
          {names.map((nm, i) => {
            const std = stdArr[i] || {}; const act = actArr[i] || {};
            const opts = Array.from(new Set([...modeOptions, std.method, act.method, recommended].filter(Boolean) as string[]));
            return (
              <div key={i} className="rounded border border-border p-1.5">
                <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium">
                  {inherited && (inherited[i]
                    ? <span className="rounded bg-[color:var(--accent)]/15 px-1 text-[9px] text-[color:var(--accent)]">继承</span>
                    : <span className="rounded bg-emerald-100 px-1 text-[9px] text-emerald-700">新增</span>)}
                  <span className="truncate">{nm || `物料${i + 1}`}</span>
                </div>
                {/* 工作方式模式：标准=AI推荐 / 实际=用户选 */}
                <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                  <label className="flex items-center gap-1 rounded border border-purple-300 bg-purple-50 px-1 py-0.5 text-[10px] text-purple-900">
                    <Cpu className="h-3 w-3 shrink-0 text-purple-700" />
                    <span className="shrink-0 text-purple-700">标准</span>
                    <select value={std.method ?? recommended ?? ""} onChange={(e) => setMode("standard", side, i, e.target.value)} className="w-full bg-transparent text-[10px] focus:outline-none">
                      <option value="">未定</option>
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1 rounded border border-purple-300 bg-purple-50 px-1 py-0.5 text-[10px] text-purple-900">
                    <span className="shrink-0 text-purple-700">实际</span>
                    <select value={act.method ?? ""} onChange={(e) => setMode("actual", side, i, e.target.value)} className="w-full bg-transparent text-[10px] focus:outline-none">
                      <option value="">未选</option>
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                </div>
                {/* 人 / 料 金额（配色+图标；工作方式只选模式不计金额） */}
                <div className="grid grid-cols-2 gap-1.5">
                  {AMT_FACTORS.map(({ k, label: lab, Icon, box, chip }) => (
                    <div key={k}>
                      <div className={`mb-0.5 flex items-center justify-center gap-0.5 text-[9px] ${chip}`}><Icon className="h-3 w-3" />{lab}</div>
                      <div className="flex gap-1">
                        <input type="number" title="标准" value={std[k] ?? ""} placeholder="标" onChange={(e) => setAmt("standard", side, i, k, e.target.value)} className={`w-full rounded border px-1 py-1 text-right text-[11px] ${box}`} />
                        <input type="number" title="实际" value={act[k] ?? ""} placeholder="实" onChange={(e) => setAmt("actual", side, i, k, e.target.value)} className={`w-full rounded border px-1 py-1 text-right text-[11px] ${box}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-border pt-1.5 text-[10px]">
        <span className="font-medium text-muted-foreground">小计</span>
        {AMT_FACTORS.map(({ k, label: lab, Icon, chip }) => {
          const v = subtotal[k][phase];
          return <span key={k} className={`flex items-center gap-0.5 font-mono ${chip}`}><Icon className="h-3 w-3" />{lab} {yuan(v.std)}/{yuan(v.act)}</span>;
        })}
      </div>
    </div>
  );
}
