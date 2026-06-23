import { verifyGrant } from "../../../../lib/platform-grants";
import { findById, findByUsername } from "../../../../lib/users";
import { listEnterprises } from "../../../../lib/enterprises";
import type { ToolId } from "../../../../lib/otd-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TOOLS: ToolId[] = ["worktime", "aps", "bom", "lean", "nesting"];

// 子工具登录核验：用户拿阿米巴用户名 + 平台令牌 + 目标工具来登录工具，
// 工具把三者 POST 到这里核验。令牌本身即凭证，无需额外鉴权。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    username?: string; token?: string; tool?: string;
  } | null;
  if (!body?.username || !body?.token || !body?.tool) {
    return Response.json({ valid: false, reason: "缺少 username / token / tool" }, { status: 400 });
  }
  if (!VALID_TOOLS.includes(body.tool as ToolId)) {
    return Response.json({ valid: false, reason: "未知工具" }, { status: 400 });
  }

  const r = await verifyGrant(body.username, body.token, body.tool as ToolId);
  if (!r.valid) return Response.json(r, { status: 200 });

  // 附带用户展示名 + 可作业企业（供工具展示与限定作业范围）
  const user = r.userId ? await findById(r.userId) : await findByUsername(body.username);
  const allEnts = await listEnterprises();
  const scoped = r.enterpriseIds && r.enterpriseIds.length
    ? allEnts.filter((e) => r.enterpriseIds!.includes(e.id))
    : allEnts;

  return Response.json({
    valid: true,
    userId: r.userId,
    username: r.username,
    displayName: user?.displayName || body.username,
    tool: r.tool,
    paidPlan: r.paidPlan,
    enterprises: scoped.map((e) => ({ id: e.id, name: e.name })),
  });
}
