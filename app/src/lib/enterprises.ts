import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { DiagnosisSummary, Industry } from "./diagnosis-types";

export interface Enterprise {
  id: string;
  name: string;
  industry: Industry;
  scale?: string;       // e.g. "320 人 / 年营收 2.8 亿"
  contact?: string;
  ownerId: string;      // user id
  createdAt: string;
  updatedAt: string;
  /** LLM-generated long-term memory accumulated across conversations */
  memory?: string;
  /** Latest finalized diagnosis summary */
  latestSummary?: DiagnosisSummary | null;
  /** Conversation id of the most recent finalized run */
  latestConversationId?: string | null;
}

const FILE = path.join(DATA_DIR, "enterprises.json");

export async function listEnterprises(ownerId?: string): Promise<Enterprise[]> {
  const all = await readJSON<Enterprise[]>(FILE, []);
  return ownerId ? all.filter((e) => e.ownerId === ownerId) : all;
}

export async function getEnterprise(id: string): Promise<Enterprise | null> {
  const all = await readJSON<Enterprise[]>(FILE, []);
  return all.find((e) => e.id === id) || null;
}

export async function createEnterprise(input: {
  name: string;
  industry: Industry;
  scale?: string;
  contact?: string;
  ownerId: string;
}): Promise<Enterprise> {
  const all = await readJSON<Enterprise[]>(FILE, []);
  const now = new Date().toISOString();
  const e: Enterprise = {
    id: newId("ent"),
    name: input.name.trim(),
    industry: input.industry,
    scale: input.scale?.trim() || undefined,
    contact: input.contact?.trim() || undefined,
    ownerId: input.ownerId,
    createdAt: now,
    updatedAt: now,
  };
  await atomicWriteJSON(FILE, [...all, e]);
  return e;
}

export async function updateEnterprise(id: string, patch: Partial<Omit<Enterprise, "id" | "createdAt">>): Promise<Enterprise> {
  const all = await readJSON<Enterprise[]>(FILE, []);
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) throw new Error("企业不存在");
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  await atomicWriteJSON(FILE, all);
  return all[i];
}

export async function deleteEnterprise(id: string) {
  const all = await readJSON<Enterprise[]>(FILE, []);
  const next = all.filter((e) => e.id !== id);
  await atomicWriteJSON(FILE, next);
}
