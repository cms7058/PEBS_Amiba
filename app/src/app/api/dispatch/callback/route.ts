import { authConnector } from "../../../../lib/connectors";
import { applyCallback, type DispatchStatus } from "../../../../lib/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 工具回调上报改进任务的进展/结果（连接器令牌鉴权）。
export async function POST(req: Request) {
  const tok = await authConnector(req);
  if (!tok) return Response.json({ error: "无效或缺失的连接器令牌" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    taskId?: string; status?: DispatchStatus; ref?: string; summary?: string; resultUrl?: string;
  } | null;
  if (!body?.taskId) return Response.json({ error: "缺少 taskId" }, { status: 400 });

  const task = await applyCallback({
    taskId: body.taskId,
    enterpriseId: tok.enterpriseId,
    source: tok.source,
    status: body.status,
    ref: body.ref,
    summary: body.summary,
    resultUrl: body.resultUrl,
  });
  if (!task) return Response.json({ error: "任务不存在或不属于该工具" }, { status: 404 });
  return Response.json({ ok: true, task }, { status: 200 });
}
