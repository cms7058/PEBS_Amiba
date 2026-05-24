import { promises as fs } from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.AMIBA_DATA_DIR || path.join(process.cwd(), "data");

export async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function atomicWriteJSON(file: string, data: unknown) {
  await ensureDir();
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

export async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function newId(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
