// 产品（订单/零件号当产品，需求1 的锚点）：阿米巴诊断按产品组织，子工具按产品建项目。
// 每个产品归属一家企业，承载 BOM 编制工时回传等产品级数据。
import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { ToolId } from "./otd-types";

const FILE = path.join(DATA_DIR, "products.json");

/** 某工具对某产品的回填摘要（工具侧建项目后把产品级结果回传到这里） */
export interface ProductToolData {
  manHours?: number;        // 累计工时（小时），如 BOM 编制工时 / 实测工时
  laborCost?: number;       // 折算人工成本
  summary?: string;         // 一句话摘要，工具自定义
  metrics?: { label: string; value: number; unit?: string }[]; // 任意补充指标（如工时负荷率）
  reportedAt: string;
}

export interface Product {
  id: string;
  enterpriseId: string;
  partNo: string;          // 零件号 / 订单号
  name: string;
  status: "active" | "archived";
  note?: string;
  /** 各工具按产品建项目后的回填摘要：tool -> 数据。供产品级跨工具展示 */
  toolData?: Partial<Record<ToolId, ProductToolData>>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function listProducts(enterpriseId?: string): Promise<Product[]> {
  const all = await readJSON<Product[]>(FILE, []);
  const list = enterpriseId ? all.filter((p) => p.enterpriseId === enterpriseId) : all;
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProduct(id: string): Promise<Product | null> {
  const all = await readJSON<Product[]>(FILE, []);
  return all.find((p) => p.id === id) || null;
}

export async function createProduct(input: {
  enterpriseId: string; partNo: string; name?: string; note?: string; createdBy: string;
}): Promise<Product> {
  const all = await readJSON<Product[]>(FILE, []);
  const now = new Date().toISOString();
  const p: Product = {
    id: newId("prod"),
    enterpriseId: input.enterpriseId,
    partNo: input.partNo.trim(),
    name: input.name?.trim() || input.partNo.trim(),
    status: "active",
    note: input.note,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await atomicWriteJSON(FILE, [...all, p]);
  return p;
}

export async function updateProduct(id: string, patch: Partial<Omit<Product, "id" | "enterpriseId" | "createdAt">>): Promise<Product> {
  const all = await readJSON<Product[]>(FILE, []);
  const i = all.findIndex((p) => p.id === id);
  if (i < 0) throw new Error("产品不存在");
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  await atomicWriteJSON(FILE, all);
  return all[i];
}

/** 记录某工具对某产品的回填摘要（由 /api/ingest/manhours 等回填通道调用） */
export async function recordToolData(
  id: string,
  tool: ToolId,
  data: Omit<ProductToolData, "reportedAt">,
): Promise<Product | null> {
  const all = await readJSON<Product[]>(FILE, []);
  const i = all.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const now = new Date().toISOString();
  all[i] = {
    ...all[i],
    toolData: { ...all[i].toolData, [tool]: { ...data, reportedAt: now } },
    updatedAt: now,
  };
  await atomicWriteJSON(FILE, all);
  return all[i];
}
