import { getCurrentSession } from "../../../../lib/auth";
import { deleteQuestion, updateQuestion } from "../../../../lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const q = await updateQuestion(id, body);
    return Response.json({ question: q });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  const { id } = await params;
  await deleteQuestion(id);
  return Response.json({ ok: true });
}
