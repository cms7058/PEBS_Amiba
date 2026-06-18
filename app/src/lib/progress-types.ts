// 流水线进度 — 纯类型与逻辑（无 fs，客户端/服务端共用）。

export const STEP_KEYS = ["design", "rules", "diagnosis", "profile", "deployment"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export interface Progress {
  enterpriseId: string;
  completed: Record<StepKey, boolean>;
  updatedAt?: string;
}

export function emptyProgress(enterpriseId: string): Progress {
  return { enterpriseId, completed: { design: false, rules: false, diagnosis: false, profile: false, deployment: false } };
}

/** 某步是否解锁：前序所有步骤都完成才解锁（第一步恒解锁） */
export function isUnlocked(step: StepKey, completed: Record<StepKey, boolean>): boolean {
  const idx = STEP_KEYS.indexOf(step);
  for (let i = 0; i < idx; i++) if (!completed[STEP_KEYS[i]]) return false;
  return true;
}
