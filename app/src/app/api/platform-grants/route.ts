import { getCurrentSession } from "../../../lib/auth";
import { listGrants, setUserTools } from "../../../lib/platform-grants";
import { findById } from "../../../lib/users";
import type { ToolId } from "../../../lib/otd-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TOOLS: ToolId[] = ["worktime", "aps", "bom", "lean", "nesting"];

// 超管：列出全部平台令牌（用户管理页据此渲染每个用户的工具开通状态）
export async function GET() {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  return Response.json({ grants: await listGrants() });
}

// 超管：调和某用户开通的工具（多选激活，未选的停用）
export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { userId?: string; tools?: string[]; paidPlan?: string } | null;
  if (!body?.userId || !Array.isArray(body.tools)) {
    return Response.json({ error: "请提供 userId 与 tools" }, { status: 400 });
  }
  const tools = body.tools.filter((t): t is ToolId => VALID_TOOLS.includes(t as ToolId));
  const user = await findById(body.userId);
  if (!user) return Response.json({ error: "用户不存在" }, { status: 404 });

  const grants = await setUserTools({ userId: user.id, username: user.username, tools, createdBy: s.sub, paidPlan: body.paidPlan });
  return Response.json({ grants });
}
