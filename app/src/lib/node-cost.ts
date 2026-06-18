import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import type { NodeCost } from "./cost-types";

// 叶子节点成本录入的存储（按 enterpriseId + nodeId）。
const FILE = path.join(DATA_DIR, "node-costs.json");

async function readAll(): Promise<NodeCost[]> {
  return readJSON<NodeCost[]>(FILE, []);
}

export async function getNodeCost(enterpriseId: string, nodeId: string): Promise<NodeCost | null> {
  const all = await readAll();
  return all.find((c) => c.enterpriseId === enterpriseId && c.nodeId === nodeId) || null;
}

export async function listByEnterprise(enterpriseId: string): Promise<NodeCost[]> {
  const all = await readAll();
  return all.filter((c) => c.enterpriseId === enterpriseId);
}

export async function upsertNodeCost(input: NodeCost): Promise<NodeCost> {
  const all = await readAll();
  const i = all.findIndex((c) => c.enterpriseId === input.enterpriseId && c.nodeId === input.nodeId);
  const next: NodeCost = { ...input, updatedAt: new Date().toISOString() };
  if (i < 0) all.push(next); else all[i] = next;
  await atomicWriteJSON(FILE, all);
  return next;
}
