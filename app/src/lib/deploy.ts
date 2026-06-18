import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import type { DeployTask } from "./deploy-types";

const FILE = path.join(DATA_DIR, "deploy-tasks.json");

async function readAll(): Promise<DeployTask[]> { return readJSON<DeployTask[]>(FILE, []); }

export async function listByEnterprise(enterpriseId: string): Promise<DeployTask[]> {
  const all = await readAll();
  return all.filter((t) => t.enterpriseId === enterpriseId).sort((a, b) => a.order - b.order);
}

export async function upsertTask(task: DeployTask): Promise<DeployTask> {
  const all = await readAll();
  const i = all.findIndex((t) => t.id === task.id);
  if (i >= 0) all[i] = task; else all.push(task);
  await atomicWriteJSON(FILE, all);
  return task;
}

export async function deleteTask(enterpriseId: string, id: string): Promise<void> {
  const all = await readAll();
  await atomicWriteJSON(FILE, all.filter((t) => !(t.enterpriseId === enterpriseId && t.id === id)));
}

// 批量替换某企业的任务（用于一键生成/重排）
export async function replaceTasks(enterpriseId: string, tasks: DeployTask[]): Promise<DeployTask[]> {
  const all = await readAll();
  const others = all.filter((t) => t.enterpriseId !== enterpriseId);
  await atomicWriteJSON(FILE, [...others, ...tasks]);
  return tasks;
}
