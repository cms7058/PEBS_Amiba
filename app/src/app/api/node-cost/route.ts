import { getCurrentSession } from "../../../lib/auth";
import { getNodeCost, listByEnterprise, upsertNodeCost } from "../../../lib/node-cost";
import type { NodeCost } from "../../../lib/cost-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?enterpriseId=&nodeId=  单节点成本；?enterpriseId= 全部（rollup 用）
export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const url = new URL(req.url);
  const enterpriseId = url.searchParams.get("enterpriseId");
  const nodeId = url.searchParams.get("nodeId");
  if (!enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  if (nodeId) return Response.json({ cost: await getNodeCost(enterpriseId, nodeId) });
  return Response.json({ costs: await listByEnterprise(enterpriseId) });
}

export async function PUT(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as NodeCost | null;
  if (!body?.enterpriseId || !body?.nodeId) {
    return Response.json({ error: "缺少 enterpriseId / nodeId" }, { status: 400 });
  }
  const cost = await upsertNodeCost(body);
  return Response.json({ cost });
}
