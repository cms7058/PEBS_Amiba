import { getCurrentSession } from "../../../lib/auth";
import { rollupTemplate } from "../../../lib/rollup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 成本汇总：返回某 OTD 模板各节点的自底向上 rollup 成本 + 全链总成本。
export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const url = new URL(req.url);
  const enterpriseId = url.searchParams.get("enterpriseId");
  const templateId = url.searchParams.get("templateId");
  if (!enterpriseId || !templateId) {
    return Response.json({ error: "缺少 enterpriseId / templateId" }, { status: 400 });
  }
  const result = await rollupTemplate(enterpriseId, templateId);
  return Response.json(result);
}
