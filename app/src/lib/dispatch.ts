// Phase 3c · 反向下发：把诊断出的改进任务下发给对应子工具（Lean 跑 8D / APS 重排 …），
// 工具受理后回调汇报状态/结果，形成「诊断 → 治理」的双向闭环。
import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import { getActiveToken, listRegistrations } from "./connectors";
import type { ConnectorSource } from "./factory-types";

const FILE = path.join(DATA_DIR, "dispatch-tasks.json");

export type DispatchStatus = "pending" | "sent" | "accepted" | "done" | "failed";

export interface DispatchTask {
  id: string;
  enterpriseId: string;
  source: ConnectorSource;     // 目标工具
  nodeKey: string;             // 关联 OTD 节点
  nodeName: string;
  action: string;              // 工具侧动作，如 run_8d / reschedule / review_bom
  title: string;
  detail: string;
  status: DispatchStatus;
  toolRef?: string;            // 工具侧创建的工单/会话 id
  resultSummary?: string;      // 工具回执 / 回调摘要
  resultUrl?: string;          // 工具侧结果链接
  error?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function listTasks(enterpriseId?: string): Promise<DispatchTask[]> {
  const all = await readJSON<DispatchTask[]>(FILE, []);
  const list = enterpriseId ? all.filter((t) => t.enterpriseId === enterpriseId) : all;
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function saveAll(tasks: DispatchTask[]): Promise<void> {
  await atomicWriteJSON(FILE, tasks);
}

async function upsert(task: DispatchTask): Promise<void> {
  const all = await readJSON<DispatchTask[]>(FILE, []);
  const i = all.findIndex((t) => t.id === task.id);
  if (i < 0) all.push(task);
  else all[i] = task;
  await saveAll(all);
}

/**
 * 创建一条改进任务并下发给目标工具：
 *  - 用该企业+工具的连接器令牌作为 Bearer，POST 到工具 hello 时上报的 inboundUrl；
 *  - 携带 callbackUrl，工具完成后回调更新状态。
 */
export async function createAndSend(input: {
  enterpriseId: string;
  source: ConnectorSource;
  nodeKey: string;
  nodeName: string;
  action: string;
  title: string;
  detail: string;
  createdBy: string;
  amibaEndpoint: string;
}): Promise<DispatchTask> {
  const now = new Date().toISOString();
  const task: DispatchTask = {
    id: newId("dt"),
    enterpriseId: input.enterpriseId,
    source: input.source,
    nodeKey: input.nodeKey,
    nodeName: input.nodeName,
    action: input.action,
    title: input.title,
    detail: input.detail,
    status: "pending",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const reg = (await listRegistrations(input.enterpriseId)).find((r) => r.source === input.source);
  const token = await getActiveToken(input.enterpriseId, input.source);

  if (!reg?.inboundUrl) {
    task.status = "failed";
    task.error = "该工具未上报回调地址（inboundUrl）。请在工具侧重新接入一次以登记。";
    task.updatedAt = new Date().toISOString();
    await upsert(task);
    return task;
  }
  if (!token) {
    task.status = "failed";
    task.error = "未找到该企业+工具的有效连接器令牌。";
    task.updatedAt = new Date().toISOString();
    await upsert(task);
    return task;
  }

  const url = reg.inboundUrl.replace(/\/+$/, "") + "/api/amiba/tasks";
  const callbackUrl = input.amibaEndpoint.replace(/\/+$/, "") + "/api/dispatch/callback";
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.token}` },
      body: JSON.stringify({
        taskId: task.id,
        enterpriseId: task.enterpriseId,
        nodeKey: task.nodeKey,
        nodeName: task.nodeName,
        action: task.action,
        title: task.title,
        detail: task.detail,
        callbackUrl,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await resp.json().catch(() => ({}))) as { accepted?: boolean; ref?: string; summary?: string; resultUrl?: string; error?: string };
    if (!resp.ok || body.accepted === false) {
      task.status = "failed";
      task.error = body.error || `工具拒绝或返回 HTTP ${resp.status}`;
    } else {
      task.status = "accepted";
      task.toolRef = body.ref;
      task.resultSummary = body.summary;
      task.resultUrl = body.resultUrl;
    }
  } catch (e) {
    task.status = "failed";
    task.error = `下发失败：${(e as Error).message}`;
  }
  task.updatedAt = new Date().toISOString();
  await upsert(task);
  return task;
}

/** 工具回调：更新任务状态/结果（由连接器令牌鉴权的路由调用） */
export async function applyCallback(input: {
  taskId: string;
  enterpriseId: string;
  source: ConnectorSource;
  status?: DispatchStatus;
  ref?: string;
  summary?: string;
  resultUrl?: string;
}): Promise<DispatchTask | null> {
  const all = await readJSON<DispatchTask[]>(FILE, []);
  const i = all.findIndex((t) => t.id === input.taskId);
  if (i < 0) return null;
  const t = all[i];
  // 令牌绑定即真相：回调只能改自己企业+来源的任务
  if (t.enterpriseId !== input.enterpriseId || t.source !== input.source) return null;
  if (input.status) t.status = input.status;
  if (input.ref) t.toolRef = input.ref;
  if (input.summary) t.resultSummary = input.summary;
  if (input.resultUrl) t.resultUrl = input.resultUrl;
  t.updatedAt = new Date().toISOString();
  all[i] = t;
  await saveAll(all);
  return t;
}
