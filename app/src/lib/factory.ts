import path from "node:path";
import { DATA_DIR, atomicWriteJSON, readJSON } from "./storage";
import { promises as fs } from "node:fs";
import type {
  ConnectorSource,
  FactorMetric,
  IngestEnvelope,
  WasteItem,
} from "./factory-types";

// 现场要素数据按企业分目录存储：data/factory/<enterpriseId>/...
function enterpriseDir(enterpriseId: string) {
  return path.join(DATA_DIR, "factory", enterpriseId);
}
function metricsFile(enterpriseId: string) {
  return path.join(enterpriseDir(enterpriseId), "metrics.json");
}
function wasteFile(enterpriseId: string) {
  return path.join(enterpriseDir(enterpriseId), "waste.json");
}

/** 带 batch 元信息的存储记录，用于按 source+batchId 幂等合并 */
interface StoredMetric extends FactorMetric {
  _batchId: string;
  _ingestedAt: string;
}
interface StoredWaste extends WasteItem {
  _batchId: string;
  _ingestedAt: string;
}

async function ensureEnterpriseDir(enterpriseId: string) {
  await fs.mkdir(enterpriseDir(enterpriseId), { recursive: true });
}

/**
 * 接收一批上报数据，按 (source, batchId) 幂等合并：
 * 同一来源+同一批次重复上传 → 先剔除旧批次记录再写入新的，避免重复累积。
 */
export async function ingestBatch(env: IngestEnvelope): Promise<{
  metrics: number;
  wasteItems: number;
}> {
  await ensureEnterpriseDir(env.enterpriseId);
  const now = new Date().toISOString();
  const source = env.source;
  const batchId = env.batchId;

  const existingMetrics = await readJSON<StoredMetric[]>(metricsFile(env.enterpriseId), []);
  const keptMetrics = existingMetrics.filter(
    (m) => !(m.source === source && m._batchId === batchId),
  );
  const newMetrics: StoredMetric[] = (env.metrics || []).map((m) => ({
    ...m,
    source,
    _batchId: batchId,
    _ingestedAt: now,
  }));
  await atomicWriteJSON(metricsFile(env.enterpriseId), [...keptMetrics, ...newMetrics]);

  const existingWaste = await readJSON<StoredWaste[]>(wasteFile(env.enterpriseId), []);
  const keptWaste = existingWaste.filter(
    (w) => !(w.source === source && w._batchId === batchId),
  );
  const newWaste: StoredWaste[] = (env.wasteItems || []).map((w) => ({
    ...w,
    source,
    _batchId: batchId,
    _ingestedAt: now,
  }));
  await atomicWriteJSON(wasteFile(env.enterpriseId), [...keptWaste, ...newWaste]);

  return { metrics: newMetrics.length, wasteItems: newWaste.length };
}

export async function listMetrics(enterpriseId: string): Promise<FactorMetric[]> {
  return readJSON<FactorMetric[]>(metricsFile(enterpriseId), []);
}

export async function listWaste(enterpriseId: string): Promise<WasteItem[]> {
  return readJSON<WasteItem[]>(wasteFile(enterpriseId), []);
}

/** 哪些来源给某企业上报过数据（用于接入状态展示） */
export async function sourcesForEnterprise(enterpriseId: string): Promise<ConnectorSource[]> {
  const metrics = await readJSON<StoredMetric[]>(metricsFile(enterpriseId), []);
  const waste = await readJSON<StoredWaste[]>(wasteFile(enterpriseId), []);
  const set = new Set<ConnectorSource>();
  for (const m of metrics) set.add(m.source);
  for (const w of waste) set.add(w.source);
  return [...set];
}
