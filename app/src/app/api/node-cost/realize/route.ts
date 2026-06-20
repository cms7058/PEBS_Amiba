import { getCurrentSession } from "../../../../lib/auth";
import { getNodeCost, upsertNodeCost } from "../../../../lib/node-cost";
import { costVariance } from "../../../../lib/cost-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PDCA 回写：部署任务完成/撤销 → 把节点该要素的改进结果写入 node-cost.realized，
// 诊断/成熟度/总览随之实时变化。factor: labor|material|method|quality
export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { enterpriseId?: string; nodeId?: string; factor?: string; on?: boolean } | null;
  if (!body?.enterpriseId || !body?.nodeId || !body?.factor) return Response.json({ error: "缺少 enterpriseId / nodeId / factor" }, { status: 400 });

  const nc = await getNodeCost(body.enterpriseId, body.nodeId);
  if (!nc) return Response.json({ error: "节点成本不存在" }, { status: 404 });

  const realized = { ...(nc.realized || {}) };
  const on = body.on !== false;
  if (body.factor === "labor" || body.factor === "material") {
    if (on) realized[body.factor] = costVariance(nc)[body.factor].std; // 改进到标准值
    else delete realized[body.factor];
  } else if (body.factor === "method") {
    if (on) realized.method = true; else delete realized.method;
  } else if (body.factor === "quality") {
    if (on) realized.quality = true; else delete realized.quality;
  }
  const cost = await upsertNodeCost({ ...nc, realized });
  return Response.json({ cost });
}
