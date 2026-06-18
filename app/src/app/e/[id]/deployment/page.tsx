"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Sparkles, Plus, Trash2, CheckCircle2, RotateCcw, Users, Cpu, Boxes, Gauge, ArrowRight } from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { EngineChat } from "../../../../components/agent/EngineChat";
import { GanttChart } from "../../../../components/deploy/GanttChart";
import { STATUS_LABEL, STATUS_COLOR, addDays, todayStr, type DeployTask, type TaskStatus } from "../../../../lib/deploy-types";
import { buildImproveItems, buildVersions, versionToTasks, daysToCycle, type PlanVersion } from "../../../../lib/improve-plan";
import type { Diagnosis } from "../../../../lib/diagnosis";

const uid = () => "tk_" + Math.random().toString(36).slice(2, 10);
const NEXT: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };
const inputCls = "rounded border border-border bg-background px-1.5 py-1 text-xs";
const DIFF_LABEL = ["", "易", "中", "难"];
const yuan = (n: number) => "¥" + Math.round(n).toLocaleString("zh-CN");
const factorIcon = (f?: string) => f === "labor" ? Users : f === "method" ? Cpu : f === "material" ? Boxes : Gauge;

export default function DeploymentPage() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<DeployTask[]>([]);
  const [diag, setDiag] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/deploy?enterpriseId=${id}`).then((r) => r.json()),
      fetch(`/api/diagnosis?enterpriseId=${id}`).then((r) => r.json()).catch(() => null),
    ]).then(([dep, dg]) => { const t = dep.tasks || []; setTasks(t); setDiag(dg?.summary ? dg : null); setChoosing(t.length === 0); setLoading(false); });
  }, [id]);

  const versions = useMemo<PlanVersion[]>(() => (diag ? buildVersions(buildImproveItems(diag)) : []), [diag]);

  async function putTask(t: DeployTask) {
    setTasks((cur) => (cur.some((x) => x.id === t.id) ? cur.map((x) => (x.id === t.id ? t : x)) : [...cur, t]));
    await fetch("/api/deploy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
  }
  async function removeTask(t: DeployTask) {
    setTasks((cur) => cur.filter((x) => x.id !== t.id));
    await fetch(`/api/deploy?enterpriseId=${id}&id=${t.id}`, { method: "DELETE" });
  }
  function addTask() {
    const start = tasks.length ? tasks[tasks.length - 1].end : todayStr();
    putTask({ id: uid(), enterpriseId: id, title: "新任务", start: addDays(start, 1), end: addDays(start, 15), status: "todo", order: tasks.length });
  }
  async function adopt(v: PlanVersion) {
    setBusy(true);
    try {
      const gen = versionToTasks(v, id);
      const res = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enterpriseId: id, tasks: gen }) });
      const d = await res.json();
      setTasks(d.tasks || gen); setChoosing(false); setSel(null);
    } finally { setBusy(false); }
  }

  const done = tasks.filter((t) => t.status === "done").length;
  const doing = tasks.filter((t) => t.status === "doing").length;
  const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const selTask = tasks.find((t) => t.id === sel) || null;

  return (
    <PageShell title="部署引擎" subtitle="基于逐节点 人/工作方式/料 差值的细化改进计划 · 多版本目标 · 甘特排程（落地后回写实际、重算差值=PDCA）">
      {loading ? <div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />加载中…</div> : !diag ? (
        <Card><CardBody className="py-12 text-center text-sm text-muted-foreground">请先完成「诊断引擎」，部署引擎将据此生成改进计划。</CardBody></Card>
      ) : choosing ? (
        /* ── 版本选择 ── */
        <div className="space-y-4">
          <Card><CardBody className="text-sm">
            <div className="font-semibold">选择改进计划目标版本</div>
            <div className="mt-1 text-xs text-muted-foreground">基于诊断引擎逐节点差值生成 · 就绪度 {diag.maturity.overall} 分 · 候选改进项 {buildImproveItems(diag).length} 个。选一个版本即生成细化到节点的甘特计划。</div>
          </CardBody></Card>
          <div className="grid gap-4 lg:grid-cols-3">
            {versions.map((v) => (
              <Card key={v.key} className="flex flex-col">
                <CardHeader title={v.name} desc={v.goal} />
                <CardBody className="flex flex-1 flex-col gap-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <KV k="改进项" v={`${v.count} 项`} />
                    <KV k="总周期" v={daysToCycle(v.totalDays)} />
                    <KV k="预计回收" v={v.totalSaving > 0 ? yuan(v.totalSaving) : "定性提升"} tone="emerald" />
                    <KV k="平均难度" v={`${v.avgDifficulty} / 3`} />
                  </div>
                  <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground"><span className="font-medium text-amber-700">难点：</span>{v.hardpoints}</div>
                  <Button size="sm" className="mt-auto" onClick={() => adopt(v)} disabled={busy || v.count === 0}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 采用此方案并生成
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
          {tasks.length > 0 && <Button size="sm" variant="outline" onClick={() => setChoosing(false)}>取消 · 返回现有计划</Button>}
        </div>
      ) : (
        /* ── 计划 + 甘特 + 明细 ── */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([["任务总数", String(tasks.length), ""], ["进行中", String(doing), "text-[color:var(--accent)]"], ["已完成", String(done), "text-emerald-600"], ["完成率", rate + "%", rate >= 100 ? "text-emerald-600" : "text-[color:var(--primary)]"]] as const).map(([k, v, c]) => (
              <Card key={k}><CardBody><div className="text-xs text-muted-foreground">{k}</div><div className={`mt-1 text-xl font-semibold ${c}`}>{v}</div></CardBody></Card>
            ))}
          </div>

          <Card>
            <CardHeader title="实施计划（甘特图 · 细化到节点改进点）" desc="阶段先后：机(信息化)→人/料(降本)→测(质量)；点任务查看改进意见"
              action={<div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addTask}><Plus className="h-3.5 w-3.5" /> 新增</Button>
                <Button size="sm" variant="outline" onClick={() => setChoosing(true)}><RotateCcw className="h-3.5 w-3.5" /> 重新规划</Button>
              </div>} />
            <CardBody><GanttChart tasks={tasks} selectedId={sel} onSelect={setSel} /></CardBody>
          </Card>

          {/* 选中任务 → 改进意见 */}
          {selTask && (
            <Card>
              <CardHeader title={`改进意见 · ${selTask.title}`} desc={`${selTask.nodeName || ""}${selTask.dimension ? " · " + selTask.dimension : ""}`}
                action={(() => { const Icon = factorIcon(selTask.factor); return <Icon className="h-4 w-4 text-[color:var(--primary)]" />; })()} />
              <CardBody className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {(selTask.current || selTask.target) && <span className="flex items-center gap-1.5">现状 <b className="text-amber-700">{selTask.current || "—"}</b> <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> 目标 <b className="text-emerald-700">{selTask.target || "—"}</b></span>}
                  {!!selTask.saving && <span>预计回收 <b className="text-emerald-700">{yuan(selTask.saving)}</b></span>}
                  {selTask.difficulty && <span>难度 <b>{DIFF_LABEL[selTask.difficulty]}</b></span>}
                  <span>工期 {selTask.start} ~ {selTask.end}</span>
                </div>
                {selTask.measures?.length ? (
                  <ul className="space-y-1.5">
                    {selTask.measures.map((m, i) => <li key={i} className="flex gap-2 text-xs"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--primary)]" />{m}</li>)}
                  </ul>
                ) : <div className="text-xs text-muted-foreground">该任务为手动添加，暂无细化改进意见。</div>}
              </CardBody>
            </Card>
          )}

          {/* 任务明细（可操作） */}
          <Card>
            <CardHeader title="任务明细" desc="编辑责任人/工期 · 点状态切换 待开始→进行中→已完成" />
            <CardBody className="px-0 py-0">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/40 text-[11px] text-muted-foreground"><tr>
                  <th className="px-3 py-2 text-left font-medium">改进点</th><th className="px-3 py-2 text-left font-medium">要素</th><th className="px-3 py-2 text-left font-medium">责任人</th>
                  <th className="px-3 py-2 text-left font-medium">起</th><th className="px-3 py-2 text-left font-medium">止</th>
                  <th className="px-3 py-2 text-left font-medium">状态</th><th className="px-3 py-2 text-left font-medium">预期</th><th className="px-3 py-2" />
                </tr></thead>
                <tbody>{tasks.map((t) => (
                  <tr key={t.id} className={`cursor-pointer border-b border-border last:border-0 ${sel === t.id ? "bg-[color:var(--primary)]/5" : "hover:bg-muted/30"}`} onClick={() => setSel(t.id)}>
                    <td className="px-3 py-2"><input value={t.title} onClick={(e) => e.stopPropagation()} onChange={(e) => putTask({ ...t, title: e.target.value })} className={`${inputCls} w-48`} /></td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{t.dimension || "—"}</td>
                    <td className="px-3 py-2"><input value={t.owner || ""} placeholder="指派…" onClick={(e) => e.stopPropagation()} onChange={(e) => putTask({ ...t, owner: e.target.value })} className={`${inputCls} w-20`} /></td>
                    <td className="px-3 py-2"><input type="date" value={t.start} onClick={(e) => e.stopPropagation()} onChange={(e) => putTask({ ...t, start: e.target.value })} className={inputCls} /></td>
                    <td className="px-3 py-2"><input type="date" value={t.end} onClick={(e) => e.stopPropagation()} onChange={(e) => putTask({ ...t, end: e.target.value })} className={inputCls} /></td>
                    <td className="px-3 py-2"><button onClick={(e) => { e.stopPropagation(); putTask({ ...t, status: NEXT[t.status] }); }} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: STATUS_COLOR[t.status] }}>{t.status === "done" && <CheckCircle2 className="h-3 w-3" />}{STATUS_LABEL[t.status]}</button></td>
                    <td className="px-3 py-2 text-[11px] text-emerald-700">{t.impact || "—"}</td>
                    <td className="px-3 py-2 text-right"><button onClick={(e) => { e.stopPropagation(); removeTask(t); }} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {diag && (
        <EngineChat
          page="部署引擎 · 实施计划" subject="阿米巴落地实施"
          facts={[
            { label: "就绪度", value: `${diag.maturity.overall} 分（${diag.maturity.levelLabel}）` },
            { label: "任务总数/完成率", value: `${tasks.length} / ${rate}%` },
            { label: "候选改进项", value: `${buildImproveItems(diag).length} 个（人/料降本 + 工作方式信息化 + 质量提升）` },
            { label: "Top 超支", value: diag.costFindings.slice(0, 3).map((f) => `${f.nodeName}·${f.factorLabel.replace(/（.*）/, "")} +${yuan(f.diff)}`).join("；") || "无" },
          ]}
        />
      )}
    </PageShell>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: "emerald" }) {
  return <div className="rounded-md border border-border px-2 py-1.5"><div className="text-[10px] text-muted-foreground">{k}</div><div className={`mt-0.5 font-mono text-sm font-semibold ${tone === "emerald" ? "text-emerald-700" : ""}`}>{v}</div></div>;
}
