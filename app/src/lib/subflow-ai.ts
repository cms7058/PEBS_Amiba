"use client";

import { chatStream, loadSettings } from "./llm";
import type { DesignDepartment } from "./org-types";
import type { Lane, ProcessActivity, ProcessEdge } from "./process-types";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 7)}${Date.now().toString(36).slice(-3)}`;
function stripJson(s: string) { const m = s.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/); return m ? m[0] : s; }

export interface NodeCostSeed {
  standard: { labor?: number; equipment?: number; material?: number };
  workMethod: { recommended?: string; options?: string[] };
}
export interface GenSubflow {
  lanes: Lane[]; activities: ProcessActivity[]; edges: ProcessEdge[];
  warnings: string[]; decomposeIds: string[];
  seeds: Record<string, NodeCostSeed>;   // activityId → 标准参考值 + 工作方式
}

// 智能体自主生成单层子流程：给定上层环节名 + 设计部门清单 → LLM 提议活动序列并归入部门泳道，
// 并标记哪些活动本身是多步骤、需要继续往下拆一层（decompose）。
export async function generateSubflow(
  parentLabel: string,
  departments: DesignDepartment[],
  unitColor: (amibaId?: string) => string | undefined,
): Promise<GenSubflow> {
  const s = loadSettings();
  const provider = s.providers[s.defaultProvider];
  if (!provider?.apiKey) throw new Error(`默认模型「${provider?.name || s.defaultProvider}」未配置 API Key。请到「模型与设置」为它配置，或把测试通过的模型设为默认。`);

  const deptList = departments.map((d) => d.name).join("、") || "（无设计部门，可自由命名）";
  const sys =
    `你是制造业流程顾问。为业务环节「${parentLabel}」设计一个 BPMN 子流程：列出 4-8 个活动的先后顺序。每个活动给出：` +
    `name(活动名)、department(负责部门，尽量从清单选：${deptList})、seq(从0递增)、` +
    `inputs(输入物数组，如客户订单)、outputs(输出物数组，如订单转换/技术可行性分析)、` +
    `recommendedMethod(完成输出物的最优工作方式，如"ERP核算模块"/"MES订单模块")、methodOptions(候选工作方式数组，含手工/Excel电子传递/系统等)、` +
    `stdLabor/stdEquipment/stdMaterial(该活动人工/设备信息系统/材料的标准参考成本，元，按行业通用水平，未知给0)、` +
    `decompose(该活动是否本身多步骤需再拆子流程，true/false)。` +
    `这是基于行业通用做法的参考建议。输出严格 JSON：{"activities":[{"name":"","department":"","seq":0,"inputs":[],"outputs":[],"recommendedMethod":"","methodOptions":[],"stdLabor":0,"stdEquipment":0,"stdMaterial":0,"decompose":false}]}。只输出 JSON。`;

  let raw = "";
  try {
    await chatStream({ provider, messages: [{ role: "system", content: sys }, { role: "user", content: `环节：${parentLabel}` }], onChunk: (t) => { raw += t; } });
  } catch (e) {
    throw new Error(`默认模型「${provider.name} / ${provider.model}」调用失败：${(e as Error).message}。若该模型未测试通过，请在「模型与设置」切换默认模型。`);
  }

  let parsed: { activities?: { name: string; department?: string; seq?: number; decompose?: boolean; inputs?: string[]; outputs?: string[]; recommendedMethod?: string; methodOptions?: string[]; stdLabor?: number; stdEquipment?: number; stdMaterial?: number }[] };
  try { parsed = JSON.parse(stripJson(raw)); } catch { throw new Error("生成失败：模型未返回有效 JSON，可重试。"); }

  const matchDept = (name?: string): DesignDepartment | undefined => {
    if (!name) return undefined;
    return departments.find((d) => d.name === name) || departments.find((d) => name.includes(d.name) || d.name.includes(name));
  };

  const warnings: string[] = [];
  const laneByDept = new Map<string, Lane>();
  const activities: ProcessActivity[] = [];
  const decomposeIds: string[] = [];
  const seeds: Record<string, NodeCostSeed> = {};
  let seq = 0;
  for (const a of parsed.activities || []) {
    const dep = matchDept(a.department);
    let lane: Lane;
    if (dep) {
      lane = laneByDept.get(dep.id) || { id: uid("lane"), departmentId: dep.id, name: dep.name, color: unitColor(dep.amibaId), amibaUnitId: dep.amibaId };
      laneByDept.set(dep.id, lane);
    } else {
      const key = a.department || "未指定";
      lane = laneByDept.get(key) || { id: uid("lane"), departmentId: uid("dep"), name: key };
      laneByDept.set(key, lane);
      if (a.department) warnings.push(`部门「${a.department}」不在设计清单中，已新建临时泳道`);
    }
    const actId = uid("act");
    activities.push({
      id: actId, name: a.name || `活动${seq}`, laneId: lane.id, seq: a.seq ?? seq,
      inputs: Array.isArray(a.inputs) ? a.inputs.filter(Boolean) : [],
      outputs: Array.isArray(a.outputs) ? a.outputs.filter(Boolean) : [],
    });
    seeds[actId] = {
      standard: { labor: a.stdLabor || undefined, equipment: a.stdEquipment || undefined, material: a.stdMaterial || undefined },
      workMethod: { recommended: a.recommendedMethod || undefined, options: Array.isArray(a.methodOptions) ? a.methodOptions.filter(Boolean) : [] },
    };
    if (a.decompose) decomposeIds.push(actId);
    seq++;
  }
  const sorted = activities.slice().sort((x, y) => x.seq - y.seq);
  const edges: ProcessEdge[] = [];
  for (let i = 0; i < sorted.length - 1; i++) edges.push({ id: uid("e"), from: sorted[i].id, to: sorted[i + 1].id });
  if (!activities.length) warnings.push("未生成活动，请重试或改用文档解析。");
  return { lanes: [...laneByDept.values()], activities, edges, warnings, decomposeIds, seeds };
}

// 多层级自动生成：对当前子流程生成内容并持久化；对标记 decompose 的活动递归建子流程。
// 用预算上限（subflow 数 / 深度）防止 LLM 调用爆炸。
export async function autoBuildSubflowTree(opts: {
  enterpriseId: string;
  rootSubflowId: string;
  rootOwnerLabel: string;
  departments: DesignDepartment[];
  unitColor: (amibaId?: string) => string | undefined;
  maxDepth?: number;
  maxSubflows?: number;
}): Promise<{ created: number; warnings: string[] }> {
  const maxDepth = opts.maxDepth ?? 3;
  const maxSubflows = opts.maxSubflows ?? 8;
  const warnings: string[] = [];
  let created = 0;

  async function build(subflowId: string, ownerLabel: string, depth: number) {
    const draft = await generateSubflow(ownerLabel, opts.departments, opts.unitColor);
    warnings.push(...draft.warnings);
    // 持久化本层（含输入物/输出物）
    await fetch(`/api/subflow/${subflowId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lanes: draft.lanes, activities: draft.activities, edges: draft.edges }),
    });
    // AI 预置每个活动的标准参考值 + 工作方式（不再为 0）
    for (const act of draft.activities) {
      const seed = draft.seeds[act.id];
      if (!seed) continue;
      await fetch("/api/node-cost", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId: opts.enterpriseId, nodeId: act.id, label: act.name, standard: seed.standard, workMethod: seed.workMethod }),
      });
    }
    created++;
    if (depth >= maxDepth) return;
    for (const actId of draft.decomposeIds) {
      if (created >= maxSubflows) { warnings.push("已达自动生成上限，更深层级可手工继续。"); return; }
      const act = draft.activities.find((a) => a.id === actId);
      if (!act) continue;
      // 为该活动取/建子流程
      const res = await fetch("/api/subflow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterpriseId: opts.enterpriseId, ownerNodeId: act.id, ownerLabel: act.name }),
      });
      const d = await res.json();
      if (res.ok && d.subflow) await build(d.subflow.id, act.name, depth + 1);
    }
  }

  await build(opts.rootSubflowId, opts.rootOwnerLabel, 0);
  return { created, warnings };
}
