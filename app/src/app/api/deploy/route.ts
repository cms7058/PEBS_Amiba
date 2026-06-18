import { getCurrentSession } from "../../../lib/auth";
import { listByEnterprise, upsertTask, deleteTask, replaceTasks } from "../../../lib/deploy";
import type { DeployTask } from "../../../lib/deploy-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId");
  if (!enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  return Response.json({ tasks: await listByEnterprise(enterpriseId) });
}

export async function PUT(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as DeployTask | null;
  if (!body?.enterpriseId || !body?.id) return Response.json({ error: "缺少 enterpriseId / id" }, { status: 400 });
  return Response.json({ task: await upsertTask(body) });
}

export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { enterpriseId?: string; tasks?: DeployTask[] } | null;
  if (!body?.enterpriseId || !Array.isArray(body.tasks)) return Response.json({ error: "缺少 enterpriseId / tasks" }, { status: 400 });
  return Response.json({ tasks: await replaceTasks(body.enterpriseId, body.tasks) });
}

export async function DELETE(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const url = new URL(req.url);
  const enterpriseId = url.searchParams.get("enterpriseId"); const id = url.searchParams.get("id");
  if (!enterpriseId || !id) return Response.json({ error: "缺少 enterpriseId / id" }, { status: 400 });
  await deleteTask(enterpriseId, id);
  return Response.json({ ok: true });
}
