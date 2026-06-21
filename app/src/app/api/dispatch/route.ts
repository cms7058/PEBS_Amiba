import { getCurrentSession } from "../../../lib/auth";
import { createAndSend, listTasks } from "../../../lib/dispatch";
import { getEnterprise } from "../../../lib/enterprises";
import { getTool } from "../../../lib/tools-registry";
import type { ConnectorSource } from "../../../lib/factory-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 列出某企业已下发的改进任务
export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId") || undefined;
  return Response.json({ tasks: await listTasks(enterpriseId) });
}

// 创建并下发一条改进任务给目标工具
export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    enterpriseId?: string; source?: string; nodeKey?: string; nodeName?: string;
    action?: string; title?: string; detail?: string;
  } | null;
  if (!body?.enterpriseId || !body?.source || !body?.nodeKey || !body?.title) {
    return Response.json({ error: "请提供 enterpriseId / source / nodeKey / title" }, { status: 400 });
  }
  if (!getTool(body.source)) return Response.json({ error: "未知工具" }, { status: 400 });
  const ent = await getEnterprise(body.enterpriseId);
  if (!ent) return Response.json({ error: "企业不存在" }, { status: 404 });

  const amibaEndpoint = process.env.NEXT_PUBLIC_PUBLIC_URL || new URL(req.url).origin;
  const task = await createAndSend({
    enterpriseId: body.enterpriseId,
    source: body.source as ConnectorSource,
    nodeKey: body.nodeKey,
    nodeName: body.nodeName || body.nodeKey,
    action: body.action || "review",
    title: body.title,
    detail: body.detail || "",
    createdBy: s.sub,
    amibaEndpoint,
  });
  return Response.json({ task }, { status: 201 });
}
