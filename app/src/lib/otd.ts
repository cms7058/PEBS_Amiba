import path from "node:path";
import { DATA_DIR, atomicWriteJSON, newId, readJSON } from "./storage";
import type { OtdNode, OtdTemplate } from "./otd-types";
import type { ConnectorSource } from "./factory-types";
import { AMIBA_BY_SEQ } from "./amibas";

const FILE = path.join(DATA_DIR, "otd-templates.json");

// 种子：汽车零部件量产(MTO)的 OTD 库模板（设计方案 §11.2，去掉 ETO 设计节点）。
// KPI 带演示用 baseline/current/target，便于前后对比可视化立即可见。
// 稳定节点 key（与 seq 对应；ingest 回填、规则引擎都按 key 定位）
const KEY_BY_SEQ: Record<number, string> = {
  0: "rfq", 1: "quote", 2: "order_review", 3: "process_bom", 4: "planning",
  5: "procurement", 6: "kitting", 7: "production", 8: "quality",
  9: "warehouse", 10: "shipping", 11: "delivery", 12: "review",
};

function seedNodes(): OtdNode[] {
  const n = (
    seq: number,
    name: string,
    action: string,
    inputs: string[],
    outputs: string[],
    role: string,
    node: Partial<OtdNode>,
  ): OtdNode => ({
    id: newId("on"),
    key: KEY_BY_SEQ[seq] || `node_${seq}`,
    amibaId: AMIBA_BY_SEQ[seq],
    seq, name, action, inputs, outputs, role,
    kpis: [], tools: [],
    ...node,
  });

  return [
    n(0, "商机/询价 RFQ", "接询价、初判可做性", ["客户图纸/规格"], ["询价登记"], "销售", {
      factor: "method", riskProp: "completeness", riskNote: "技术要求是否齐全",
      kpis: [{ key: "rfq_resp", label: "询价响应时长", unit: "h", betterWhen: "lower", values: { baseline: 48, current: 36, target: 24 } }],
    }),
    n(1, "报价/成本估算", "估 BOM、估工时、定价（含年降测算）", ["图纸", "历史成本"], ["报价单", "估算成本"], "销售+工程", {
      factor: "material", riskProp: "correctness", riskNote: "成本估漏（辅料/工装/年降）",
      kpis: [{ key: "quote_acc", label: "报价准确率", unit: "%", betterWhen: "higher", values: { baseline: 82, current: 88, target: 95 } }],
      tools: [{ tool: "bom", enabled: true }],
    }),
    n(2, "订单评审与接单", "合同/技术/交期三评审", ["客户 PO/预测", "报价"], ["评审记录", "交期承诺"], "商务+计划", {
      factor: "method", riskProp: "rationality", riskNote: "盲目承诺交期",
      kpis: [{ key: "order_acc", label: "接单准确率", unit: "%", betterWhen: "higher", values: { baseline: 85, current: 90, target: 98 } }],
    }),
    n(3, "工艺与 BOM 准备", "工艺路线、制造 BOM、工装、定额", ["设计 BOM/图纸"], ["工艺路线", "制造 BOM", "定额"], "工艺", {
      factor: "material", riskProp: "completeness", riskNote: "缺工序/缺定额",
      kpis: [{ key: "bom_acc", label: "BOM 准确率", unit: "%", betterWhen: "higher", values: { baseline: 88, current: 92, target: 99 } }],
      tools: [{ tool: "bom", enabled: true }],
    }),
    n(4, "主计划与排产", "MPS、有限产能排产、换线优化", ["订单/看板", "产能", "BOM"], ["生产计划", "工单"], "计划/PMC", {
      factor: "machine", riskProp: "rationality", riskNote: "瓶颈/换线未优化",
      kpis: [
        { key: "plan_attain", label: "计划达成率", unit: "%", betterWhen: "higher", values: { baseline: 76, current: 84, target: 95 } },
        { key: "smed", label: "换线时间", unit: "min", betterWhen: "lower", values: { baseline: 45, current: 32, target: 20 } },
      ],
      tools: [{ tool: "aps", enabled: true }],
    }),
    n(5, "物料需求与采购", "MRP/看板补货、跟催", ["BOM", "库存", "计划"], ["采购订单", "到货计划"], "采购", {
      factor: "material", riskProp: "correctness", riskNote: "MOQ/提前期错致断料",
      kpis: [
        { key: "po_ontime", label: "采购准时率", unit: "%", betterWhen: "higher", values: { baseline: 80, current: 87, target: 96 } },
        { key: "dead_stock", label: "呆滞率", unit: "%", betterWhen: "lower", values: { baseline: 9, current: 6, target: 3 } },
      ],
      tools: [{ tool: "aps", enabled: false }],
    }),
    n(6, "齐套与备料/下料", "齐套检查、排料下料", ["工单", "物料"], ["齐套报告", "下料件"], "仓储+下料", {
      factor: "material", riskProp: "rationality", riskNote: "未齐套先开工",
      kpis: [
        { key: "kit_rate", label: "齐套率", unit: "%", betterWhen: "higher", values: { baseline: 78, current: 85, target: 97 } },
        { key: "nest_yield", label: "套料利用率", unit: "%", betterWhen: "higher", values: { baseline: 78, current: 82, target: 90 } },
      ],
      tools: [{ tool: "nesting", enabled: true }, { tool: "bom", enabled: false }],
    }),
    n(7, "生产制造", "冲压→焊接→涂装→总装 等多工序", ["齐套物料", "工艺"], ["在制品", "完工品"], "制造各巴", {
      factor: "man", riskProp: "correctness", riskNote: "工序参数错",
      kpis: [
        { key: "oee", label: "OEE", unit: "%", betterWhen: "higher", values: { baseline: 52, current: 61, target: 75 } },
        { key: "labor_value", label: "单位工时产值", unit: "元/h", betterWhen: "higher", values: { baseline: 120, current: 138, target: 165 } },
      ],
      tools: [{ tool: "worktime", enabled: true }, { tool: "aps", enabled: true }],
    }),
    n(8, "过程与成品质量", "IPQC/FQC、不良处理", ["完工品", "检验标准"], ["检验记录", "不良单"], "品质", {
      factor: "method", riskProp: "completeness", riskNote: "缺检验/缺管控点",
      kpis: [
        { key: "fpy", label: "一次交检合格率", unit: "%", betterWhen: "higher", values: { baseline: 90, current: 94, target: 99 } },
        { key: "ppm", label: "客诉 PPM", unit: "ppm", betterWhen: "lower", values: { baseline: 850, current: 520, target: 200 } },
      ],
      tools: [{ tool: "lean", enabled: true }],
    }),
    n(9, "入库/包装", "入库、包装、标识", ["合格品"], ["入库单", "成品"], "仓储", {
      factor: "material", riskProp: "correctness", riskNote: "错料/错标",
      kpis: [{ key: "inv_turn", label: "库存周转", unit: "次/年", betterWhen: "higher", values: { baseline: 6, current: 8, target: 12 } }],
      tools: [{ tool: "aps", enabled: false }],
    }),
    n(10, "发运/物流", "排车、发运、签收", ["成品", "发运计划"], ["发货单", "签收"], "物流", {
      factor: "environment", riskProp: "rationality", riskNote: "急运成本失控",
      kpis: [{ key: "ship_ontime", label: "发运准时率", unit: "%", betterWhen: "higher", values: { baseline: 88, current: 92, target: 99 } }],
    }),
    n(11, "交付确认/开票/回款", "客户验收、开票、催款", ["签收", "合同"], ["验收单", "发票", "回款"], "商务+财务", {
      factor: "method", riskProp: "completeness", riskNote: "缺验收致拖款",
      kpis: [
        { key: "otd", label: "准时交付率(OTD)", unit: "%", betterWhen: "higher", values: { baseline: 82, current: 89, target: 98 } },
        { key: "dso", label: "回款周期(DSO)", unit: "天", betterWhen: "lower", values: { baseline: 75, current: 62, target: 45 } },
      ],
    }),
    n(12, "售后/复盘/知识沉淀", "客诉处理、复盘", ["全流程数据"], ["复盘报告", "知识库"], "全员", {
      factor: "method", riskProp: "rationality", riskNote: "经验不沉淀",
      kpis: [{ key: "review_rate", label: "复盘录入率", unit: "%", betterWhen: "higher", values: { baseline: 30, current: 55, target: 90 } }],
      tools: [{ tool: "lean", enabled: true }],
    }),
  ];
}

async function ensureSeeded() {
  const all = await readJSON<OtdTemplate[]>(FILE, []);
  if (all.length > 0) return;
  const now = new Date().toISOString();
  const tpl: OtdTemplate = {
    id: newId("otd"),
    name: "汽车零部件量产 OTD（库模板）",
    industry: "auto_parts",
    mode: "MTO",
    nodes: seedNodes(),
    createdAt: now,
    updatedAt: now,
  };
  await atomicWriteJSON(FILE, [tpl]);
}

// 兼容旧数据：为缺失 key / amibaId 的节点回填
function normalize(t: OtdTemplate): OtdTemplate {
  let changed = false;
  const nodes = t.nodes.map((nd) => {
    const patch: Partial<OtdNode> = {};
    if (!nd.key) patch.key = KEY_BY_SEQ[nd.seq] || `node_${nd.seq}`;
    if (!nd.amibaId) patch.amibaId = AMIBA_BY_SEQ[nd.seq];
    if (Object.keys(patch).length === 0) return nd;
    changed = true;
    return { ...nd, ...patch };
  });
  return changed ? { ...t, nodes } : t;
}

export async function listTemplates(enterpriseId?: string): Promise<OtdTemplate[]> {
  await ensureSeeded();
  const all = (await readJSON<OtdTemplate[]>(FILE, [])).map(normalize);
  if (!enterpriseId) return all;
  // 返回该企业实例 + 行业库模板（enterpriseId 为空的）
  return all.filter((t) => t.enterpriseId === enterpriseId || !t.enterpriseId);
}

export async function getTemplate(id: string): Promise<OtdTemplate | null> {
  await ensureSeeded();
  const all = (await readJSON<OtdTemplate[]>(FILE, [])).map(normalize);
  return all.find((t) => t.id === id) || null;
}

// ---- V2.2：工具/人工采集 → 节点 KPI 回填（数据合并的闭环落点）----

export interface KpiUpdate {
  nodeKey: string;
  kpiKey: string;
  value: number;
  capturedAt?: string;
}

/**
 * 把一批采集值回填到「对应节点的对应 KPI 的 current」，并记来源。
 * 工具自动采集与人工模版导入都走这条，殊途同归。
 */
export async function applyKpiUpdates(
  templateId: string,
  updates: KpiUpdate[],
  source: ConnectorSource,
): Promise<{ applied: number; missed: KpiUpdate[] }> {
  const all = (await readJSON<OtdTemplate[]>(FILE, [])).map(normalize);
  const i = all.findIndex((t) => t.id === templateId);
  if (i < 0) throw new Error("OTD 模板不存在");
  const tpl = all[i];
  const now = new Date().toISOString();
  let applied = 0;
  const missed: KpiUpdate[] = [];

  for (const u of updates) {
    const node = tpl.nodes.find((n) => n.key === u.nodeKey);
    const kpi = node?.kpis.find((k) => k.key === u.kpiKey);
    if (!kpi) { missed.push(u); continue; }
    kpi.values = { ...kpi.values, current: u.value };
    kpi.source = source;
    kpi.capturedAt = u.capturedAt || now;
    applied++;
  }

  tpl.updatedAt = now;
  all[i] = tpl;
  await atomicWriteJSON(FILE, all);
  return { applied, missed };
}

export async function updateTemplate(
  id: string,
  patch: Partial<Omit<OtdTemplate, "id" | "createdAt">>,
): Promise<OtdTemplate> {
  const all = await readJSON<OtdTemplate[]>(FILE, []);
  const i = all.findIndex((t) => t.id === id);
  if (i < 0) throw new Error("OTD 模板不存在");
  all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
  await atomicWriteJSON(FILE, all);
  return all[i];
}

/** 克隆库模板为某企业实例 */
export async function cloneForEnterprise(templateId: string, enterpriseId: string, name?: string): Promise<OtdTemplate> {
  const src = await getTemplate(templateId);
  if (!src) throw new Error("源模板不存在");
  const all = await readJSON<OtdTemplate[]>(FILE, []);
  const now = new Date().toISOString();
  const clone: OtdTemplate = {
    ...src,
    id: newId("otd"),
    name: name || `${src.name}（实例）`,
    enterpriseId,
    nodes: src.nodes.map((node) => ({ ...node, id: newId("on") })),
    createdAt: now,
    updatedAt: now,
  };
  await atomicWriteJSON(FILE, [...all, clone]);
  return clone;
}
