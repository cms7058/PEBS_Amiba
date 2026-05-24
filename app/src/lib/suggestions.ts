import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { CardType, DimensionKey } from "./diagnosis-types";

export type SuggestionStatus = "pending" | "approved" | "rejected";

export interface Suggestion {
  id: string;
  dimension: DimensionKey;
  level: "L1" | "L2" | "L3";
  type: CardType;
  question: string;
  options?: string[];
  reason: string;
  /** Where the suggestion came from */
  conversationId: string;
  enterpriseId?: string;
  proposedBy?: string;     // user id who triggered the conversation
  status: SuggestionStatus;
  reviewedBy?: string;     // admin user id
  reviewedAt?: string;
  /** When approved → the resulting question id */
  resultingQuestionId?: string;
  createdAt: string;
}

const FILE = path.join(DATA_DIR, "suggestions.json");

export async function listSuggestions(filter?: { status?: SuggestionStatus }): Promise<Suggestion[]> {
  const all = await readJSON<Suggestion[]>(FILE, []);
  const out = filter?.status ? all.filter((s) => s.status === filter.status) : all;
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSuggestion(id: string): Promise<Suggestion | null> {
  const all = await readJSON<Suggestion[]>(FILE, []);
  return all.find((s) => s.id === id) || null;
}

export async function createSuggestion(input: Omit<Suggestion, "id" | "status" | "createdAt">): Promise<Suggestion> {
  const all = await readJSON<Suggestion[]>(FILE, []);
  // Dedup: if same conversation already proposed the same question, skip
  const dup = all.find(
    (s) =>
      s.conversationId === input.conversationId &&
      s.question.trim().toLowerCase() === input.question.trim().toLowerCase()
  );
  if (dup) return dup;
  const s: Suggestion = {
    ...input,
    id: newId("sg"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await atomicWriteJSON(FILE, [...all, s]);
  return s;
}

export async function updateSuggestion(id: string, patch: Partial<Omit<Suggestion, "id" | "createdAt">>): Promise<Suggestion> {
  const all = await readJSON<Suggestion[]>(FILE, []);
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("建议不存在");
  all[i] = { ...all[i], ...patch };
  await atomicWriteJSON(FILE, all);
  return all[i];
}
