import { getCurrentSession } from "../../../../lib/auth";
import { rotateToken } from "../../../../lib/platform-grants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 超管：轮换某枚令牌（旧令牌立即失效）
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  const { id } = await params;
  try {
    const g = await rotateToken(id);
    return Response.json({ grant: g });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
