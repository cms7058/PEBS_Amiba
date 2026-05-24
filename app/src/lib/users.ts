import { promises as fs } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Role, PublicUser } from "./users-types";

export type { Role, PublicUser };

export interface User extends PublicUser {
  passwordHash: string;
}

const DATA_DIR = process.env.AMIBA_DATA_DIR || path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await seedDefault();
  }
}

async function seedDefault() {
  const adminPwd = process.env.AMIBA_ADMIN_PASSWORD || "admin123";
  const now = new Date().toISOString();
  const seed: User = {
    id: "u_admin",
    username: "admin",
    displayName: "系统管理员",
    role: "admin",
    passwordHash: await bcrypt.hash(adminPwd, 10),
    createdAt: now,
    updatedAt: now,
  };
  await atomicWrite([seed]);
  // eslint-disable-next-line no-console
  console.log(`[users] seeded default admin (username=admin, password=${adminPwd}) — please change it after first login`);
}

async function atomicWrite(users: User[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = USERS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(users, null, 2), "utf-8");
  await fs.rename(tmp, USERS_FILE);
}

async function readAll(): Promise<User[]> {
  await ensureFile();
  const raw = await fs.readFile(USERS_FILE, "utf-8");
  return JSON.parse(raw) as User[];
}

export async function listUsers(): Promise<PublicUser[]> {
  const all = await readAll();
  return all.map(({ passwordHash: _h, ...rest }) => rest);
}

export async function findByUsername(username: string): Promise<User | null> {
  const all = await readAll();
  return all.find((u) => u.username === username) || null;
}

export async function findById(id: string): Promise<User | null> {
  const all = await readAll();
  return all.find((u) => u.id === id) || null;
}

export async function createUser(input: {
  username: string;
  displayName: string;
  role: Role;
  password: string;
}): Promise<PublicUser> {
  const all = await readAll();
  if (all.some((u) => u.username === input.username)) {
    throw new Error("用户名已存在");
  }
  const now = new Date().toISOString();
  const u: User = {
    id: "u_" + Math.random().toString(36).slice(2, 10),
    username: input.username.trim(),
    displayName: input.displayName.trim() || input.username,
    role: input.role,
    passwordHash: await bcrypt.hash(input.password, 10),
    createdAt: now,
    updatedAt: now,
  };
  await atomicWrite([...all, u]);
  const { passwordHash: _h, ...pub } = u;
  return pub;
}

export async function updateUser(
  id: string,
  patch: Partial<{ displayName: string; role: Role; password: string }>
): Promise<PublicUser> {
  const all = await readAll();
  const i = all.findIndex((u) => u.id === id);
  if (i < 0) throw new Error("用户不存在");
  const u = all[i];
  if (patch.displayName !== undefined) u.displayName = patch.displayName;
  if (patch.role !== undefined) u.role = patch.role;
  if (patch.password) u.passwordHash = await bcrypt.hash(patch.password, 10);
  u.updatedAt = new Date().toISOString();
  all[i] = u;
  await atomicWrite(all);
  const { passwordHash: _h, ...pub } = u;
  return pub;
}

export async function deleteUser(id: string) {
  const all = await readAll();
  const next = all.filter((u) => u.id !== id);
  if (next.length === all.length) throw new Error("用户不存在");
  if (next.filter((u) => u.role === "admin").length === 0) {
    throw new Error("至少保留 1 个管理员");
  }
  await atomicWrite(next);
}

export async function verifyPassword(username: string, password: string): Promise<User | null> {
  const u = await findByUsername(username);
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return null;
  return u;
}

export async function recordLogin(id: string) {
  const all = await readAll();
  const i = all.findIndex((u) => u.id === id);
  if (i < 0) return;
  all[i].lastLoginAt = new Date().toISOString();
  await atomicWrite(all);
}
