import { getCurrentSession } from "../../../../../lib/auth";
import { getProduct } from "../../../../../lib/products";
import { getEnterprise } from "../../../../../lib/enterprises";
import { listGrants } from "../../../../../lib/platform-grants";
import { getActiveToken, createToken } from "../../../../../lib/connectors";
import { getTool } from "../../../../../lib/tools-registry";
import { effectiveRegisterUrl } from "../../../../../lib/tool-config";
import { findById, findByUsername } from "../../../../../lib/users";
import type { ConnectorSource } from "../../../../../lib/factory-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 为某产品打开子工具工作台（默认 BOM）：组装平台登录 + 产品 + 团队 + 连接器令牌 的跳转 URL。
// 工具侧用 username+platform_token 调 /api/platform-auth/verify 登录，按 product/team 建项目。
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const tool = (new URL(req.url).searchParams.get("tool") || "bom") as ConnectorSource;

  const product = await getProduct(id);
  if (!product) return Response.json({ error: "产品不存在" }, { status: 404 });
  const ent = await getEnterprise(product.enterpriseId);
  if (!ent) return Response.json({ error: "企业不存在" }, { status: 404 });
  const toolDef = getTool(tool);
  if (!toolDef) return Response.json({ error: "未知工具" }, { status: 400 });

  // 当前登录用户必须持有该工具的有效平台令牌（平台登录凭证）
  const grants = await listGrants();
  const mine = grants.find((g) => g.userId === s.sub && g.status === "active" && g.tool === tool
    && (g.enterpriseIds.length === 0 || g.enterpriseIds.includes(ent.id)));
  if (!mine) {
    return Response.json({ error: `你尚无「${toolDef.name}」的平台令牌，请联系管理员在「用户管理」里开通。` }, { status: 403 });
  }
  const me = await findById(s.sub);

  // 团队成员：持有该工具平台令牌、且企业范围覆盖本企业的阿米巴用户
  const teamGrants = grants.filter((g) => g.status === "active" && g.tool === tool
    && (g.enterpriseIds.length === 0 || g.enterpriseIds.includes(ent.id)));
  const team = await Promise.all(teamGrants.map(async (g) => {
    const u = await findById(g.userId) || await findByUsername(g.username);
    return { username: g.username, displayName: u?.displayName || g.username };
  }));

  // 回传数据通道：企业+工具连接器令牌，没有则现发一枚
  let conn = await getActiveToken(ent.id, tool);
  if (!conn) conn = await createToken({ enterpriseId: ent.id, source: tool, label: `${ent.name} · ${toolDef.name}`, createdBy: s.sub });

  const amibaEndpoint = process.env.NEXT_PUBLIC_PUBLIC_URL || new URL(req.url).origin;
  // 注册页地址按超管「工具管理」运行时覆盖生效
  const effUrl = (await effectiveRegisterUrl(toolDef.id)) || toolDef.registerUrl;
  const base = effUrl.replace(/\/register\/?$/, "");
  const u = new URL(base + "/amiba/launch");
  u.searchParams.set("amiba_endpoint", amibaEndpoint);
  u.searchParams.set("platform_token", mine.token);
  u.searchParams.set("username", mine.username);
  u.searchParams.set("tool", String(tool));
  u.searchParams.set("enterprise_id", ent.id);
  u.searchParams.set("enterprise_name", ent.name);
  u.searchParams.set("product_id", product.id);
  u.searchParams.set("part_no", product.partNo);
  u.searchParams.set("product_name", product.name);
  u.searchParams.set("connector_token", conn.token);
  u.searchParams.set("team", JSON.stringify(team));

  return Response.json({ launchUrl: u.toString(), team, displayName: me?.displayName });
}
