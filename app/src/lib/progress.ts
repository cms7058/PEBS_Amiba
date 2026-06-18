import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import { emptyProgress, STEP_KEYS, type Progress, type StepKey } from "./progress-types";

// 流水线进度存储（服务端）。纯逻辑/类型见 progress-types.ts。
export { STEP_KEYS, isUnlocked } from "./progress-types";
export type { StepKey, Progress } from "./progress-types";

const FILE = path.join(DATA_DIR, "progress.json");

export async function getProgress(enterpriseId: string): Promise<Progress> {
  const all = await readJSON<Progress[]>(FILE, []);
  return all.find((p) => p.enterpriseId === enterpriseId) || emptyProgress(enterpriseId);
}

export async function setStep(enterpriseId: string, step: StepKey, done: boolean): Promise<Progress> {
  const all = await readJSON<Progress[]>(FILE, []);
  const i = all.findIndex((p) => p.enterpriseId === enterpriseId);
  const cur = i >= 0 ? all[i] : emptyProgress(enterpriseId);
  const next: Progress = { ...cur, completed: { ...cur.completed, [step]: done }, updatedAt: new Date().toISOString() };
  if (i >= 0) all[i] = next; else all.push(next);
  await atomicWriteJSON(FILE, all);
  return next;
}
