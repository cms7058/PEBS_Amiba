import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { ProcessActivity, ProcessEdge, Subflow } from "./process-types";

const FILE = path.join(DATA_DIR, "subflows.json");

async function readAll(): Promise<Subflow[]> {
  return readJSON<Subflow[]>(FILE, []);
}

export async function getSubflow(id: string): Promise<Subflow | null> {
  const all = await readAll();
  return all.find((s) => s.id === id) || null;
}

export async function getByOwner(enterpriseId: string, ownerNodeId: string): Promise<Subflow | null> {
  const all = await readAll();
  return all.find((s) => s.enterpriseId === enterpriseId && s.ownerNodeId === ownerNodeId) || null;
}

export async function listByEnterprise(enterpriseId: string): Promise<Subflow[]> {
  const all = await readAll();
  return all.filter((s) => s.enterpriseId === enterpriseId);
}

/** 取或建：同一 (enterpriseId, ownerNodeId) 只存一个子流程 */
export async function getOrCreate(input: {
  enterpriseId: string;
  ownerNodeId: string;
  ownerLabel?: string;
  defaultDepartmentId?: string;
}): Promise<Subflow> {
  const all = await readAll();
  const existing = all.find((s) => s.enterpriseId === input.enterpriseId && s.ownerNodeId === input.ownerNodeId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const laneId = newId("lane");
  const actId = newId("act");
  const sf: Subflow = {
    id: newId("sf"),
    enterpriseId: input.enterpriseId,
    ownerNodeId: input.ownerNodeId,
    ownerLabel: input.ownerLabel,
    lanes: input.defaultDepartmentId ? [{ id: laneId, departmentId: input.defaultDepartmentId }] : [],
    activities: input.defaultDepartmentId
      ? [{ id: actId, name: "子活动 1", laneId, seq: 0 }]
      : [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
  await atomicWriteJSON(FILE, [...all, sf]);
  return sf;
}

export async function updateSubflow(
  id: string,
  patch: Partial<Pick<Subflow, "lanes" | "activities" | "edges" | "ownerLabel">>,
): Promise<Subflow> {
  const all = await readAll();
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("子流程不存在");
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  await atomicWriteJSON(FILE, all);
  return all[i];
}

export type { ProcessActivity, ProcessEdge };
