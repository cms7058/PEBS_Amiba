import { authConnector } from "../../../../lib/connectors";
import { getProduct, recordToolData } from "../../../../lib/products";
import { ingestBatch } from "../../../../lib/factory";
import type { ToolId } from "../../../../lib/otd-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCT_TOOLS: ToolId[] = ["worktime", "aps", "bom", "lean", "nesting"];
// 各工具回填工时的 5M1E man 维度指标键/标签（按产品建项目后回传的产品级工时）
const MAN_METRIC: Record<string, { key: string; label: string }> = {
  bom: { key: "bom_man_hours", label: "BOM 编制工时" },
  worktime: { key: "measured_man_hours", label: "实测作业工时" },
  aps: { key: "aps_plan_man_hours", label: "排产计划工时" },
  lean: { key: "lean_man_hours", label: "精益改善工时" },
  nesting: { key: "nesting_man_hours", label: "套料工时" },
};

// 子工具回传产品级工时与回填摘要（需求1：按产品建项目完成 → 工时/指标回传）。
// 连接器令牌鉴权；令牌绑定的 source 即工具，写入产品 toolData[tool] 并作为 man 维度进 5M1E 画像。
export async function POST(req: Request) {
  const tok = await authConnector(req);
  if (!tok) return Response.json({ error: "无效或缺失的连接器令牌" }, { status: 401 });

  // 令牌绑定即工具来源；manual 令牌不允许走产品工时通道
  const tool = tok.source as ToolId;
  if (!PRODUCT_TOOLS.includes(tool)) {
    return Response.json({ error: `令牌来源「${tok.source}」不支持产品工时回填` }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    productId?: string; manHours?: number; laborCost?: number;
    summary?: string; metrics?: { label: string; value: number; unit?: string }[];
    members?: { username: string; seconds: number }[];
  } | null;
  if (!body?.productId || typeof body.manHours !== "number") {
    return Response.json({ error: "请提供 productId 与 manHours" }, { status: 400 });
  }

  const product = await getProduct(body.productId);
  if (!product) return Response.json({ error: "产品不存在" }, { status: 404 });
  if (product.enterpriseId !== tok.enterpriseId) {
    return Response.json({ error: "产品不属于该企业" }, { status: 403 });
  }

  await recordToolData(body.productId, tool, {
    manHours: body.manHours,
    laborCost: body.laborCost,
    summary: body.summary,
    metrics: body.metrics,
  });

  // 同步进 5M1E 画像（人维度）：按工具映射指标键/标签
  const m = MAN_METRIC[tool] || { key: `${tool}_man_hours`, label: `${tool} 工时` };
  const now = new Date().toISOString();
  await ingestBatch({
    source: tok.source,
    enterpriseId: tok.enterpriseId,
    batchId: `${tool}-manhours-${body.productId}`,
    metrics: [{
      factor: "man",
      key: m.key,
      label: m.label,
      value: body.manHours,
      unit: "h",
      source: tok.source,
      capturedAt: now,
    }],
  });

  return Response.json({ ok: true, productId: body.productId, tool, manHours: body.manHours, laborCost: body.laborCost }, { status: 201 });
}
