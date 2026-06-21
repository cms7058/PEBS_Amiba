import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { ConnectorSource } from "./factory-types";

// 连接器令牌：区别于用户登录 session，专供子工具上报数据时鉴权。
// 一个令牌绑定一家企业 + 一个数据来源工具，防止 A 企业的工具往 B 企业灌数据。

export interface ConnectorToken {
  id: string;
  token: string;            // amk_xxx，明文存储（本地文件存储形态；生产可改为哈希）
  enterpriseId: string;
  source: ConnectorSource;
  label?: string;
  createdBy: string;        // user id
  createdAt: string;
  revokedAt?: string | null;
}

// 工具注册（hello）记录：工具启动时上报自己的能力，用于「能力发现」点亮诊断界面。
export interface ConnectorRegistration {
  source: ConnectorSource;
  enterpriseId: string;
  version?: string;
  capabilities?: string[];
  /** 工具对外回调地址，供阿米巴反向下发改进任务（Phase 3c） */
  inboundUrl?: string;
  lastSeenAt: string;
}

const TOKENS_FILE = path.join(DATA_DIR, "connector-tokens.json");
const REG_FILE = path.join(DATA_DIR, "connector-registrations.json");

function genToken(): string {
  return "amk_" + newId("").slice(1) + Math.random().toString(36).slice(2, 10);
}

export async function createToken(input: {
  enterpriseId: string;
  source: ConnectorSource;
  label?: string;
  createdBy: string;
}): Promise<ConnectorToken> {
  const all = await readJSON<ConnectorToken[]>(TOKENS_FILE, []);
  const now = new Date().toISOString();
  const t: ConnectorToken = {
    id: newId("ct"),
    token: genToken(),
    enterpriseId: input.enterpriseId,
    source: input.source,
    label: input.label,
    createdBy: input.createdBy,
    createdAt: now,
    revokedAt: null,
  };
  await atomicWriteJSON(TOKENS_FILE, [...all, t]);
  return t;
}

export async function listTokens(enterpriseId?: string): Promise<ConnectorToken[]> {
  const all = await readJSON<ConnectorToken[]>(TOKENS_FILE, []);
  return enterpriseId ? all.filter((t) => t.enterpriseId === enterpriseId) : all;
}

export async function revokeToken(id: string): Promise<void> {
  const all = await readJSON<ConnectorToken[]>(TOKENS_FILE, []);
  const i = all.findIndex((t) => t.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], revokedAt: new Date().toISOString() };
  await atomicWriteJSON(TOKENS_FILE, all);
}

/** 取某企业+某工具当前有效（未吊销）的连接器令牌，供阿米巴反向下发时鉴权到工具 */
export async function getActiveToken(enterpriseId: string, source: ConnectorSource): Promise<ConnectorToken | null> {
  const all = await readJSON<ConnectorToken[]>(TOKENS_FILE, []);
  return all.find((t) => t.enterpriseId === enterpriseId && t.source === source && !t.revokedAt) || null;
}

/** 校验 Bearer 令牌，返回其绑定的企业与来源；无效/已吊销返回 null */
export async function verifyToken(token: string | null): Promise<ConnectorToken | null> {
  if (!token) return null;
  const all = await readJSON<ConnectorToken[]>(TOKENS_FILE, []);
  const t = all.find((x) => x.token === token && !x.revokedAt);
  return t || null;
}

/** 从请求头解析并校验连接器令牌 */
export async function authConnector(req: Request): Promise<ConnectorToken | null> {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return verifyToken(m ? m[1].trim() : null);
}

// ---- 能力发现（hello）----

export async function recordRegistration(reg: Omit<ConnectorRegistration, "lastSeenAt">): Promise<void> {
  const all = await readJSON<ConnectorRegistration[]>(REG_FILE, []);
  const now = new Date().toISOString();
  const i = all.findIndex((r) => r.source === reg.source && r.enterpriseId === reg.enterpriseId);
  const next: ConnectorRegistration = { ...reg, lastSeenAt: now };
  if (i < 0) all.push(next);
  else all[i] = next;
  await atomicWriteJSON(REG_FILE, all);
}

export async function listRegistrations(enterpriseId?: string): Promise<ConnectorRegistration[]> {
  const all = await readJSON<ConnectorRegistration[]>(REG_FILE, []);
  return enterpriseId ? all.filter((r) => r.enterpriseId === enterpriseId) : all;
}
