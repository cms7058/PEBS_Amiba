import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { ConversationTurn, DiagnosisSummary, DimensionKey } from "./diagnosis-types";
import { DIMENSION_KEYS } from "./diagnosis-types";

export type ConversationStatus = "in_progress" | "completed" | "abandoned";

export interface Conversation {
  id: string;
  enterpriseId: string;
  ownerId: string;
  status: ConversationStatus;
  turns: ConversationTurn[];
  progress: Record<DimensionKey, number>;
  currentDimension: DimensionKey;
  summary?: DiagnosisSummary | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const FILE = path.join(DATA_DIR, "conversations.json");

function emptyProgress(): Record<DimensionKey, number> {
  return Object.fromEntries(DIMENSION_KEYS.map((k) => [k, 0])) as Record<DimensionKey, number>;
}

export async function listConversations(filter?: { ownerId?: string; enterpriseId?: string }): Promise<Conversation[]> {
  const all = await readJSON<Conversation[]>(FILE, []);
  return all
    .filter((c) => (filter?.ownerId ? c.ownerId === filter.ownerId : true))
    .filter((c) => (filter?.enterpriseId ? c.enterpriseId === filter.enterpriseId : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const all = await readJSON<Conversation[]>(FILE, []);
  return all.find((c) => c.id === id) || null;
}

export async function createConversation(input: {
  enterpriseId: string;
  ownerId: string;
  initialTurn: ConversationTurn;
}): Promise<Conversation> {
  const all = await readJSON<Conversation[]>(FILE, []);
  const now = new Date().toISOString();
  const c: Conversation = {
    id: newId("cv"),
    enterpriseId: input.enterpriseId,
    ownerId: input.ownerId,
    status: "in_progress",
    turns: [input.initialTurn],
    progress: emptyProgress(),
    currentDimension: "organization",
    createdAt: now,
    updatedAt: now,
  };
  await atomicWriteJSON(FILE, [...all, c]);
  return c;
}

export async function updateConversation(id: string, patch: Partial<Omit<Conversation, "id" | "createdAt">>): Promise<Conversation> {
  const all = await readJSON<Conversation[]>(FILE, []);
  const i = all.findIndex((c) => c.id === id);
  if (i < 0) throw new Error("会话不存在");
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  await atomicWriteJSON(FILE, all);
  return all[i];
}

export async function deleteConversation(id: string) {
  const all = await readJSON<Conversation[]>(FILE, []);
  await atomicWriteJSON(FILE, all.filter((c) => c.id !== id));
}
