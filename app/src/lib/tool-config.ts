// 工具运行时配置（超管在「用户管理 · 工具管理」里改 名称/注册网址）。
// 覆盖项存 data/tool-config.json；未覆盖的回落到 tools-registry 的默认（含 NEXT_PUBLIC_TOOL_*_URL）。
// 关键收益：工具网址变成运行时可改，改完即生效，不必重新 docker build。
import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import { TOOLS, getTool, type ToolDef } from "./tools-registry";

const FILE = path.join(DATA_DIR, "tool-config.json");

export interface ToolOverride { name?: string; registerUrl?: string }
export type ToolConfig = Record<string, ToolOverride>;

export async function getToolConfig(): Promise<ToolConfig> {
  return readJSON<ToolConfig>(FILE, {});
}

export async function setToolOverride(id: string, patch: ToolOverride): Promise<ToolConfig> {
  if (!getTool(id)) throw new Error("未知工具");
  const cfg = await getToolConfig();
  const next: ToolOverride = { ...cfg[id] };
  if (patch.name !== undefined) next.name = patch.name.trim() || undefined;
  if (patch.registerUrl !== undefined) next.registerUrl = patch.registerUrl.trim() || undefined;
  if (!next.name && !next.registerUrl) delete cfg[id];
  else cfg[id] = next;
  await atomicWriteJSON(FILE, cfg);
  return cfg;
}

/** 合并默认 + 覆盖后的工具清单（名称/网址按覆盖生效）。 */
export async function effectiveTools(): Promise<ToolDef[]> {
  const cfg = await getToolConfig();
  return TOOLS.map((t) => ({
    ...t,
    name: cfg[t.id]?.name || t.name,
    registerUrl: cfg[t.id]?.registerUrl || t.registerUrl,
  }));
}

/** 某工具生效的注册页地址（覆盖优先，否则默认）。 */
export async function effectiveRegisterUrl(id: string): Promise<string | null> {
  const t = getTool(id);
  if (!t) return null;
  const cfg = await getToolConfig();
  return cfg[id]?.registerUrl || t.registerUrl;
}
