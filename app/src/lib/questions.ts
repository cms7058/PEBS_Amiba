import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { CardType, DimensionKey } from "./diagnosis-types";

export type QuestionStatus = "active" | "draft" | "archived" | "pending_review";
export type QuestionSource = "builtin" | "admin" | "ai_suggested";

export interface Question {
  id: string;
  dimension: DimensionKey;
  level: "L1" | "L2" | "L3";
  type: CardType;
  question: string;
  options?: string[];
  status: QuestionStatus;
  source: QuestionSource;
  /** For pending_review: what the AI noticed in conversation */
  reason?: string;
  createdBy?: string; // user id
  createdAt: string;
  updatedAt: string;
}

const FILE = path.join(DATA_DIR, "questions.json");

// Seed bank: 18 baseline questions = 6 dimensions × 3 levels
const SEED: Omit<Question, "id" | "createdAt" | "updatedAt">[] = [
  // organization
  { dimension: "organization", level: "L1", type: "text", question: "目前公司大致的部门设置是怎样的？人员规模多少？", status: "active", source: "builtin" },
  { dimension: "organization", level: "L2", type: "single", question: "主要的决策权目前集中在哪里？", options: ["老板一人决策", "高管团队集体决策", "已下放到部门负责人", "其他"], status: "active", source: "builtin" },
  { dimension: "organization", level: "L3", type: "single", question: "过去 3 年内，公司经历过较大的组织变革吗？整体感受？", options: ["有，效果较好", "有，效果一般", "有，阻力较大", "几乎没有"], status: "active", source: "builtin" },
  // finance
  { dimension: "finance", level: "L1", type: "text", question: "近一年大致的营收和毛利率范围？主要成本构成？", status: "active", source: "builtin" },
  { dimension: "finance", level: "L2", type: "single", question: "目前成本核算精细到哪一级？", options: ["只到公司整体", "到产品大类", "到产品 + 工序", "到工单 / 项目"], status: "active", source: "builtin" },
  { dimension: "finance", level: "L3", type: "single", question: "对财务数据的依赖与质量？", options: ["每周看，质量较高", "每月看，质量一般", "季度才看，质量较差", "基本不看"], status: "active", source: "builtin" },
  // it
  { dimension: "it", level: "L1", type: "multi", question: "目前在用的信息化系统有哪些？", options: ["ERP", "MES", "WMS", "CRM", "OA", "IoT/工业数采", "都没有"], status: "active", source: "builtin" },
  { dimension: "it", level: "L2", type: "single", question: "ERP/MES 之间的数据集成程度？", options: ["完全打通", "部分对接", "靠人工导入导出", "没有 MES"], status: "active", source: "builtin" },
  { dimension: "it", level: "L3", type: "single", question: "信息化负责人 / 团队配置？", options: ["有专职 CIO + 团队", "1-2 名 IT 兼职", "完全外包", "几乎无"], status: "active", source: "builtin" },
  // equipment
  { dimension: "equipment", level: "L1", type: "text", question: "主要的生产设备有哪些？大致的设备资产价值范围？", status: "active", source: "builtin" },
  { dimension: "equipment", level: "L2", type: "single", question: "能耗计量目前到哪一级？", options: ["仅厂区总表", "车间分表", "产线 / 设备子表", "完整三级计量"], status: "active", source: "builtin" },
  { dimension: "equipment", level: "L3", type: "single", question: "存在多个部门 / 班组共用同一设备的情况吗？", options: ["大量存在", "部分存在", "极少", "完全没有"], status: "active", source: "builtin" },
  // process
  { dimension: "process", level: "L1", type: "text", question: "典型订单从下单到交付的 L/T 大概多久？", status: "active", source: "builtin" },
  { dimension: "process", level: "L2", type: "single", question: "目前是否存在内部转移定价 / 内部交易机制？", options: ["有完整机制", "有简单划账", "完全没有", "不清楚"], status: "active", source: "builtin" },
  { dimension: "process", level: "L3", type: "single", question: "质量管理体系成熟度？", options: ["IATF16949 / ISO 长期运行", "有体系但执行偏弱", "在建设中", "基本无体系"], status: "active", source: "builtin" },
  // culture
  { dimension: "culture", level: "L1", type: "single", question: "上次员工主动提出成本改善建议大约是什么时候？", options: ["最近一周", "最近一月", "最近半年", "想不起来"], status: "active", source: "builtin" },
  { dimension: "culture", level: "L2", type: "single", question: "中层管理者会主动关注自己团队的盈亏吗？", options: ["普遍会", "少数会", "几乎不会", "不清楚"], status: "active", source: "builtin" },
  { dimension: "culture", level: "L3", type: "textarea", question: "上一次比较大的内部变革推进时，主要遇到了什么阻力？", status: "active", source: "builtin" },
];

async function ensureSeeded() {
  const all = await readJSON<Question[]>(FILE, []);
  if (all.length > 0) return;
  const now = new Date().toISOString();
  const seeded: Question[] = SEED.map((q) => ({
    ...q,
    id: newId("q"),
    createdAt: now,
    updatedAt: now,
  }));
  await atomicWriteJSON(FILE, seeded);
}

export async function listQuestions(filter?: { status?: QuestionStatus | QuestionStatus[] }): Promise<Question[]> {
  await ensureSeeded();
  const all = await readJSON<Question[]>(FILE, []);
  if (!filter?.status) return all;
  const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
  return all.filter((q) => statuses.includes(q.status));
}

export async function getQuestion(id: string): Promise<Question | null> {
  const all = await readJSON<Question[]>(FILE, []);
  return all.find((q) => q.id === id) || null;
}

export async function createQuestion(input: Omit<Question, "id" | "createdAt" | "updatedAt">): Promise<Question> {
  await ensureSeeded();
  const all = await readJSON<Question[]>(FILE, []);
  const now = new Date().toISOString();
  const q: Question = { ...input, id: newId("q"), createdAt: now, updatedAt: now };
  await atomicWriteJSON(FILE, [...all, q]);
  return q;
}

export async function updateQuestion(id: string, patch: Partial<Omit<Question, "id" | "createdAt">>): Promise<Question> {
  const all = await readJSON<Question[]>(FILE, []);
  const i = all.findIndex((q) => q.id === id);
  if (i < 0) throw new Error("题目不存在");
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  await atomicWriteJSON(FILE, all);
  return all[i];
}

export async function deleteQuestion(id: string) {
  const all = await readJSON<Question[]>(FILE, []);
  await atomicWriteJSON(FILE, all.filter((q) => q.id !== id));
}
