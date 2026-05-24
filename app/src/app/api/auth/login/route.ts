import { cookies } from "next/headers";
import { recordLogin, verifyPassword } from "../../../../lib/users";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
  if (!body?.username || !body?.password) {
    return Response.json({ error: "请填写用户名和密码" }, { status: 400 });
  }

  const user = await verifyPassword(body.username.trim(), body.password);
  if (!user) {
    return Response.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    username: user.username,
    role: user.role,
    name: user.displayName,
  });

  const c = await cookies();
  c.set(SESSION_COOKIE, token, sessionCookieOptions());
  await recordLogin(user.id);

  return Response.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  });
}
