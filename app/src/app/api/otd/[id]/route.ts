import { getCurrentSession } from "../../../../lib/auth";
import { getTemplate, updateTemplate } from "../../../../lib/otd";
import type { OtdNode } from "../../../../lib/otd-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  const tpl = await getTemplate(id);
  if (!tpl) return Response.json({ error: "不存在" }, { status: 404 });
  return Response.json({ template: tpl });
}

// 编辑：可整体替换 nodes（节点、KPI、工具开关等），或改 name
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    name?: string; nodes?: OtdNode[];
  } | null;
  if (!body) return Response.json({ error: "无效请求体" }, { status: 400 });
  try {
    const patch: { name?: string; nodes?: OtdNode[] } = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.nodes !== undefined) patch.nodes = body.nodes;
    const tpl = await updateTemplate(id, patch);
    return Response.json({ template: tpl });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
