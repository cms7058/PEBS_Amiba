// 部署引擎改进计划生成器：基于诊断引擎逐节点的 人/工作方式/料 差值 + 质量 + 信息化模式，
// 生成细化到「节点·要素」的改进项，给出多版本目标方案（速赢/均衡/全面），并按先后秩序排成甘特任务。
import type { Diagnosis } from "./diagnosis";
import { addDays, todayStr, parseDate, fmtDate, dayMs, type DeployTask } from "./deploy-types";

export type ImproveFactor = "labor" | "material" | "method" | "quality";
const FACTOR_LABEL: Record<ImproveFactor, string> = { labor: "人 · 人工", material: "料 · 材料", method: "机 · 工作方式", quality: "测 · 质量" };
const yuan = (n: number) => "¥" + Math.round(n).toLocaleString("zh-CN");

export interface ImproveItem {
  id: string;
  nodeId: string; nodeName: string;
  factor: ImproveFactor; factorLabel: string;
  title: string;
  current: string; target: string;     // 现状 → 目标（展示）
  saving: number;                       // 预计可回收（元/期），方法/质量类为 0（定性）
  difficulty: 1 | 2 | 3;                // 难度
  phase: 1 | 2 | 3;                     // 实施阶段（决定先后秩序）
  days: number;
  measures: string[];                   // 具体改进意见
}

const uid = (p: string) => p + "_" + Math.random().toString(36).slice(2, 9);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

// 从诊断生成全部候选改进项
export function buildImproveItems(d: Diagnosis): ImproveItem[] {
  const items: ImproveItem[] = [];

  // 人 / 料：来自成本超支（实际 > 标准）
  for (const f of d.costFindings) {
    if (f.factor === "equipment") continue; // 工作方式不计金额
    const factor: ImproveFactor = f.factor === "labor" ? "labor" : "material";
    const days = clamp(7 + Math.round(f.diff / 80), 7, 28);
    const measures = factor === "labor"
      ? ["梳理标准作业(SOP)，压减无效工时与等待", "针对性技能培训，提升人均产出", "按节拍优化人员配置/多能工"]
      : ["建立材料定额，按 BOM 精算用量", "降低损耗与边角料、提高利用率", "替代料/集中采购议价"];
    items.push({
      id: uid("imp"), nodeId: f.nodeId, nodeName: f.nodeName, factor, factorLabel: FACTOR_LABEL[factor],
      title: `${f.nodeName} · ${factor === "labor" ? "人工" : "材料"}降本`,
      current: yuan(f.act), target: yuan(f.std), saving: Math.round(f.diff), difficulty: 2, phase: 2, days, measures,
    });
  }

  // 机 / 工作方式：来自信息化差距（实际模式 ≠ AI 推荐模式）
  for (const f of d.methodFindings) {
    items.push({
      id: uid("imp"), nodeId: f.nodeId, nodeName: f.nodeName, factor: "method", factorLabel: FACTOR_LABEL.method,
      title: `${f.nodeName} · 工作方式信息化`,
      current: f.actual || "手工/低效", target: f.recommended || "系统模块", saving: 0, difficulty: 3, phase: 1, days: 25,
      measures: [`引进并使用「${f.recommended}」替代「${f.actual}」`, "对相关岗位做系统操作培训并固化流程", "打通上下游数据接口，减少手工录入与差错"],
    });
  }

  // 测 / 质量：来自质量指标偏低（< 90%）
  for (const f of d.qualityFindings) {
    items.push({
      id: uid("imp"), nodeId: f.nodeId, nodeName: f.nodeName, factor: "quality", factorLabel: FACTOR_LABEL.quality,
      title: `${f.nodeName} · ${f.metric}提升`,
      current: f.value + "%", target: "≥ 90%", saving: 0, difficulty: 2, phase: 3, days: 14,
      measures: ["完善检验 SOP 与防错(Poka-Yoke)", "加强输入/输出物校验与首件确认", "对薄弱环节做质量专项培训"],
    });
  }

  return items;
}

export interface PlanVersion {
  key: string; name: string; goal: string;
  items: ImproveItem[];
  count: number; totalSaving: number; totalDays: number; avgDifficulty: number;
  hardpoints: string;
}

// 三个不同目标的版本（速赢 / 均衡 / 全面）
export function buildVersions(all: ImproveItem[]): PlanVersion[] {
  const byPhaseSaving = (a: ImproveItem, b: ImproveItem) => a.phase - b.phase || b.saving - a.saving;
  const cost = all.filter((i) => i.factor === "labor" || i.factor === "material").sort((a, b) => b.saving - a.saving);
  const method = all.filter((i) => i.factor === "method");
  const quality = all.filter((i) => i.factor === "quality");

  const make = (key: string, name: string, goal: string, items: ImproveItem[]): PlanVersion => {
    const sched = scheduleItems(items.slice().sort(byPhaseSaving));
    const totalSaving = items.reduce((s, i) => s + i.saving, 0);
    const totalDays = sched.totalDays;
    const avgDifficulty = items.length ? Math.round((items.reduce((s, i) => s + i.difficulty, 0) / items.length) * 10) / 10 : 0;
    const hp: string[] = [];
    if (method.some((m) => items.includes(m))) hp.push("信息系统引进需 IT/供应商配合，培训与流程固化是关键");
    if (items.filter((i) => i.factor === "labor").length >= 3) hp.push("人员技能培训与标准作业落地依赖现场配合");
    if (quality.some((q) => items.includes(q))) hp.push("质量改进见效较慢，需持续跟踪");
    return { key, name, goal, items, count: items.length, totalSaving, totalDays, avgDifficulty, hardpoints: hp.join("；") || "实施难度可控" };
  };

  // 质量项按节点去重（保留最差），避免每个指标都成一条任务
  const qByNode = new Map<string, ImproveItem>();
  for (const q of quality.slice().sort((a, b) => parseFloat(a.current) - parseFloat(b.current))) if (!qByNode.has(q.nodeId)) qByNode.set(q.nodeId, q);
  const qualityTop = [...qByNode.values()];

  return [
    make("quick", "速赢版", "优先回收高额超支，约 1–2 个月快速见效（人/料为主）", cost.slice(0, 8)),
    make("balanced", "均衡版", "成本回收 + 关键信息化升级 + 质量补强，兼顾速度与体系", [...cost.slice(0, 10), ...method.slice(0, 5), ...qualityTop.slice(0, 4)]),
    make("full", "全面版", "5M1E 全维度系统改进，奔向精益（周期最长、收益最全）", [...cost.slice(0, 20), ...method.slice(0, 12), ...qualityTop.slice(0, 10)]),
  ];
}

// 按阶段排期：阶段决定先后（机→人/料→测），同阶段内错峰并行；返回任务 + 总周期
export function scheduleItems(items: ImproveItem[]): { tasks: Omit<DeployTask, "enterpriseId">[]; totalDays: number } {
  const start0 = todayStr();
  let phaseStart = start0;
  let order = 0;
  const tasks: Omit<DeployTask, "enterpriseId">[] = [];
  let globalEnd = start0;
  for (const phase of [1, 2, 3] as const) {
    const its = items.filter((i) => i.phase === phase).sort((a, b) => b.saving - a.saving);
    if (!its.length) continue;
    let phaseEnd = phaseStart;
    its.forEach((it, idx) => {
      const start = addDays(phaseStart, idx * 4);   // 同阶段错峰并行
      const end = addDays(start, it.days);
      if (parseDate(end) > parseDate(phaseEnd)) phaseEnd = end;
      tasks.push({
        id: it.id, title: it.title, detail: it.measures[0], owner: "", dimension: it.factorLabel, nodeId: it.nodeId, nodeName: it.nodeName,
        start, end, status: "todo", impact: it.saving > 0 ? `预计回收 ${yuan(it.saving)}` : "信息化/质量提升", order: order++,
        factor: it.factor, current: it.current, target: it.target, saving: it.saving, difficulty: it.difficulty, measures: it.measures,
      });
    });
    if (parseDate(phaseEnd) > parseDate(globalEnd)) globalEnd = phaseEnd;
    phaseStart = addDays(phaseEnd, 2);              // 下一阶段在本阶段后启动
  }
  const totalDays = Math.round((parseDate(globalEnd) - parseDate(start0)) / dayMs);
  return { tasks, totalDays };
}

export function versionToTasks(version: PlanVersion, enterpriseId: string): DeployTask[] {
  const { tasks } = scheduleItems(version.items.slice().sort((a, b) => a.phase - b.phase || b.saving - a.saving));
  return tasks.map((t) => ({ ...t, enterpriseId }));
}

export function daysToCycle(days: number): string {
  if (days <= 0) return "—";
  const m = days / 30;
  return m < 1 ? `${days} 天` : `${m.toFixed(1)} 个月`;
}
export { fmtDate };
