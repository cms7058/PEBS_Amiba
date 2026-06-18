import { getCurrentSession } from "../../../../lib/auth";
import { getSubflow, updateSubflow } from "../../../../lib/subflow";
import type { Lane, ProcessActivity, ProcessEdge } from "../../../../lib/process-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  const subflow = await getSubflow(id);
  if (!subflow) return Response.json({ error: "不存在" }, { status: 404 });
  return Response.json({ subflow });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    lanes?: Lane[]; activities?: ProcessActivity[]; edges?: ProcessEdge[]; ownerLabel?: string;
  } | null;
  if (!body) return Response.json({ error: "无效请求体" }, { status: 400 });
  try {
    const subflow = await updateSubflow(id, body);
    return Response.json({ subflow });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
