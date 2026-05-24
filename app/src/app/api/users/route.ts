import { getCurrentSession } from "../../../lib/auth";
import { createUser, listUsers } from "../../../lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  const users = await listUsers();
  return Response.json({ users });
}

export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    username?: string;
    displayName?: string;
    role?: "admin" | "consultant" | "viewer";
    password?: string;
  } | null;

  if (!body?.username || !body?.password || !body?.role) {
    return Response.json({ error: "请填写完整字段" }, { status: 400 });
  }
  if (body.password.length < 6) {
    return Response.json({ error: "密码长度需 ≥ 6 位" }, { status: 400 });
  }

  try {
    const u = await createUser({
      username: body.username,
      displayName: body.displayName || body.username,
      role: body.role,
      password: body.password,
    });
    return Response.json({ user: u }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
