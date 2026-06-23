import { getCurrentSession } from "../../../../lib/auth";
import { createToken } from "../../../../lib/connectors";
import { getEnterprise } from "../../../../lib/enterprises";
import { buildRegisterRedirect, getTool } from "../../../../lib/tools-registry";
import { listGrants } from "../../../../lib/platform-grants";
import { findById } from "../../../../lib/users";
import { getProduct } from "../../../../lib/products";

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
    productId?: string;   // APS/Lean 等：接入时选定的作业产品，一并带给工具
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
  let redirectUrl = buildRegisterRedirect({
    tool,
    amibaEndpoint,
    token: t.token,
    enterpriseId: ent.id,
  });

  // 若当前用户持有该工具的平台令牌，把平台登录参数一并带上，使工具 /register 页
  // 也能建立 BOM 端会话（"进入工作台"不再被踢回登录）。
  const grant = (await listGrants()).find((g) => g.userId === s.sub && g.status === "active" && g.tool === tool.id);
  if (grant) {
    const me = await findById(s.sub);
    const u = new URL(redirectUrl);
    u.searchParams.set("platform_token", grant.token);
    u.searchParams.set("username", me?.username || grant.username);
    // 选定了作业产品：把产品上下文一并带给工具，使其进入操作页即按该产品建项目+计时
    if (body.productId) {
      const product = await getProduct(body.productId);
      if (product && product.enterpriseId === ent.id) {
        u.searchParams.set("product_id", product.id);
        u.searchParams.set("part_no", product.partNo);
        u.searchParams.set("product_name", product.name);
        u.searchParams.set("enterprise_name", ent.name);
      }
    }
    redirectUrl = u.toString();
  }

  return Response.json({ token: t.token, redirectUrl }, { status: 201 });
}
