import { getCurrentSession } from "../../../../lib/auth";
import { deleteUser, updateUser } from "../../../../lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    displayName?: string;
    role?: "admin" | "consultant" | "viewer";
    password?: string;
  } | null;
  if (!body) return Response.json({ error: "无效请求" }, { status: 400 });
  if (body.password && body.password.length < 6) {
    return Response.json({ error: "密码长度需 ≥ 6 位" }, { status: 400 });
  }
  try {
    const u = await updateUser(id, body);
    return Response.json({ user: u });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });

  const { id } = await params;
  if (id === s.sub) return Response.json({ error: "不能删除自己" }, { status: 400 });

  try {
    await deleteUser(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
