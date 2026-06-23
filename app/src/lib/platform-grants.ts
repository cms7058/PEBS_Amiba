// 平台账户 + 权限令牌（需求4）：超级管理员在「用户管理」里按用户付费情况，逐工具激活
// 平台登录令牌——每个用户的每个工具对应一枚独立令牌。用户用「阿米巴用户名 + 该工具令牌」
// 登入对应子工具。与「连接器令牌」（企业+工具的数据通道）是两套东西。
import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { ToolId } from "./otd-types";

const FILE = path.join(DATA_DIR, "platform-grants.json");

export interface PlatformGrant {
  id: string;
  userId: string;
  username: string;
  tool: ToolId;              // 单个工具，一枚令牌对应一个工具
  token: string;             // apk_xxx
  status: "active" | "revoked";
  paidPlan?: string;
  enterpriseIds: string[];   // 可作业企业（空 = 全部）
  expiresAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function genToken(): string {
  return "apk_" + newId("").slice(1) + Math.random().toString(36).slice(2, 10);
}

export async function listGrants(): Promise<PlatformGrant[]> {
  return readJSON<PlatformGrant[]>(FILE, []);
}

export async function listGrantsForUser(userId: string): Promise<PlatformGrant[]> {
  const all = await listGrants();
  return all.filter((g) => g.userId === userId);
}

/**
 * 调和某用户开通的工具集合：列表里的工具确保有「有效」令牌（无则新发、被停用的重新激活），
 * 不在列表里的工具一律停用。支持多选激活。返回该用户全部令牌。
 */
export async function setUserTools(input: {
  userId: string; username: string; tools: ToolId[]; createdBy: string; paidPlan?: string;
}): Promise<PlatformGrant[]> {
  const all = await readJSON<PlatformGrant[]>(FILE, []);
  const now = new Date().toISOString();
  const want = new Set(input.tools);

  for (const g of all) {
    if (g.userId !== input.userId) continue;
    if (want.has(g.tool)) {
      if (g.status !== "active") { g.status = "active"; g.updatedAt = now; }
      if (input.paidPlan !== undefined) g.paidPlan = input.paidPlan;
      want.delete(g.tool); // 已存在
    } else if (g.status === "active") {
      g.status = "revoked"; g.updatedAt = now;
    }
  }
  // 剩余 want 为需新发令牌的工具
  for (const tool of want) {
    all.push({
      id: newId("pg"), userId: input.userId, username: input.username, tool,
      token: genToken(), status: "active", paidPlan: input.paidPlan, enterpriseIds: [],
      expiresAt: null, createdBy: input.createdBy, createdAt: now, updatedAt: now,
    });
  }
  await atomicWriteJSON(FILE, all);
  return all.filter((g) => g.userId === input.userId);
}

export async function rotateToken(id: string): Promise<PlatformGrant> {
  const all = await readJSON<PlatformGrant[]>(FILE, []);
  const i = all.findIndex((g) => g.id === id);
  if (i < 0) throw new Error("令牌不存在");
  all[i] = { ...all[i], token: genToken(), status: "active", updatedAt: new Date().toISOString() };
  await atomicWriteJSON(FILE, all);
  return all[i];
}

export interface VerifyResult {
  valid: boolean; reason?: string;
  userId?: string; username?: string; tool?: ToolId; enterpriseIds?: string[]; paidPlan?: string;
}

/** 工具登录核验：用户名 + 该工具令牌 + 目标工具 */
export async function verifyGrant(username: string, token: string, tool: ToolId): Promise<VerifyResult> {
  const all = await readJSON<PlatformGrant[]>(FILE, []);
  const g = all.find((x) => x.token === token);
  if (!g) return { valid: false, reason: "令牌无效" };
  if (g.status !== "active") return { valid: false, reason: "令牌已停用" };
  if (g.tool !== tool) return { valid: false, reason: `该令牌对应「${g.tool}」，与登录工具不符` };
  if (g.username.toLowerCase() !== username.trim().toLowerCase()) return { valid: false, reason: "用户名与令牌不匹配" };
  if (g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()) return { valid: false, reason: "令牌已过期" };
  return { valid: true, userId: g.userId, username: g.username, tool, enterpriseIds: g.enterpriseIds, paidPlan: g.paidPlan };
}
