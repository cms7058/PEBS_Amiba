import { getCurrentSession } from "../../../../lib/auth";
import { createToken } from "../../../../lib/connectors";
import { getEnterprise } from "../../../../lib/enterprises";
import { buildRegisterRedirect, getTool } from "../../../../lib/tools-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理端「接入工具」：为某企业+某工具生成连接器令牌，
// 并返回跳转到该工具注册页的完整 URL（前端据此自动跳转）。
export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    enterpriseId?: string;
    source?: string;
    label?: string;
  } | null;
  if (!body?.enterpriseId || !body?.source) {
    return Response.json({ error: "请提供 enterpriseId 与 source" }, { status: 400 });
  }

  const tool = getTool(body.source);
  if (!tool) return Response.json({ error: "未知工具" }, { status: 400 });

  const ent = await getEnterprise(body.enterpriseId);
  if (!ent) return Response.json({ error: "企业不存在" }, { status: 404 });

  const t = await createToken({
    enterpriseId: ent.id,
    source: tool.id,
    label: body.label || `${ent.name} · ${tool.name}`,
    createdBy: s.sub,
  });

  // 阿米巴自身对外地址：优先用配置，否则用当前请求来源
  const amibaEndpoint = process.env.NEXT_PUBLIC_PUBLIC_URL || new URL(req.url).origin;
  const redirectUrl = buildRegisterRedirect({
    tool,
    amibaEndpoint,
    token: t.token,
    enterpriseId: ent.id,
  });

  return Response.json({ token: t.token, redirectUrl }, { status: 201 });
}
