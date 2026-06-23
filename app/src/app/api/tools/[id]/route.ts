import { getCurrentSession } from "../../../../lib/auth";
import { setToolOverride } from "../../../../lib/tool-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 超管：改某工具的 名称 / 注册网址（运行时生效，无需重新 build）。
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { name?: string; registerUrl?: string } | null;
  if (!body) return Response.json({ error: "无效请求体" }, { status: 400 });
  try {
    const config = await setToolOverride(id, { name: body.name, registerUrl: body.registerUrl });
    return Response.json({ ok: true, config });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
