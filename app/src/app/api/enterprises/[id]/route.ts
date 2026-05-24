import { getCurrentSession } from "../../../../lib/auth";
import { deleteEnterprise, getEnterprise, updateEnterprise } from "../../../../lib/enterprises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authz(id: string) {
  const s = await getCurrentSession();
  if (!s) return { err: Response.json({ error: "未登录" }, { status: 401 }), session: null };
  const e = await getEnterprise(id);
  if (!e) return { err: Response.json({ error: "企业不存在" }, { status: 404 }), session: null };
  if (s.role !== "admin" && e.ownerId !== s.sub) {
    return { err: Response.json({ error: "无权限" }, { status: 403 }), session: null };
  }
  return { enterprise: e, session: s };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await authz(id);
  if ("err" in r) return r.err;
  return Response.json({ enterprise: r.enterprise });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await authz(id);
  if ("err" in r) return r.err;
  const body = await req.json().catch(() => ({}));
  const e = await updateEnterprise(id, body);
  return Response.json({ enterprise: e });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await authz(id);
  if ("err" in r) return r.err;
  await deleteEnterprise(id);
  return Response.json({ ok: true });
}
