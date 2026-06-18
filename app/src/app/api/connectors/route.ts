import { getCurrentSession } from "../../../lib/auth";
import { listRegistrations, listTokens } from "../../../lib/connectors";
import { sourcesForEnterprise } from "../../../lib/factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理端：查看某企业各工具的接入状态（已发令牌 / 已注册 / 已上报数据）。
export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId") || undefined;

  const [tokens, registrations, ingested] = await Promise.all([
    listTokens(enterpriseId),
    listRegistrations(enterpriseId),
    enterpriseId ? sourcesForEnterprise(enterpriseId) : Promise.resolve([]),
  ]);

  // 不回传明文令牌，避免泄露
  const safeTokens = tokens.map(({ token, ...rest }) => ({
    ...rest,
    tokenPreview: token.slice(0, 8) + "…",
  }));

  return Response.json({ tokens: safeTokens, registrations, ingested });
}
