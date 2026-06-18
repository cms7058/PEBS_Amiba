import { getCurrentSession } from "../../../lib/auth";
import { getByOwner, getOrCreate, listByEnterprise } from "../../../lib/subflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?enterpriseId=...            列出该企业所有子流程（用于在 OTD 节点上标记"已下钻"）
// GET ?enterpriseId=&ownerNodeId=  取某节点的子流程（或 null）
export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const url = new URL(req.url);
  const enterpriseId = url.searchParams.get("enterpriseId");
  const ownerNodeId = url.searchParams.get("ownerNodeId");
  if (!enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  if (ownerNodeId) {
    const subflow = await getByOwner(enterpriseId, ownerNodeId);
    return Response.json({ subflow });
  }
  const subflows = await listByEnterprise(enterpriseId);
  return Response.json({ subflows });
}

// POST 取或建某节点的子流程
export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    enterpriseId?: string; ownerNodeId?: string; ownerLabel?: string; defaultDepartmentId?: string;
  } | null;
  if (!body?.enterpriseId || !body?.ownerNodeId) {
    return Response.json({ error: "请提供 enterpriseId 与 ownerNodeId" }, { status: 400 });
  }
  const subflow = await getOrCreate({
    enterpriseId: body.enterpriseId,
    ownerNodeId: body.ownerNodeId,
    ownerLabel: body.ownerLabel,
    defaultDepartmentId: body.defaultDepartmentId,
  });
  return Response.json({ subflow }, { status: 201 });
}
