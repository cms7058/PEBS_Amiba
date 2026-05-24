import { getCurrentSession } from "../../../lib/auth";
import { createConversation, listConversations } from "../../../lib/conversations";
import { getEnterprise } from "../../../lib/enterprises";
import { buildWelcomeEnvelope, WELCOME_TEXT } from "../../../lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const url = new URL(req.url);
  const enterpriseId = url.searchParams.get("enterpriseId") || undefined;

  const list = await listConversations({
    ownerId: s.role === "admin" ? undefined : s.sub,
    enterpriseId,
  });
  // Strip turns for list view
  const summary = list.map(({ turns, ...rest }) => ({
    ...rest,
    turnCount: turns.length,
  }));
  return Response.json({ conversations: summary });
}

export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { enterpriseId?: string } | null;
  if (!body?.enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });

  const ent = await getEnterprise(body.enterpriseId);
  if (!ent) return Response.json({ error: "企业不存在" }, { status: 404 });
  if (s.role !== "admin" && ent.ownerId !== s.sub) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  const env = buildWelcomeEnvelope(ent.industry, !!ent.memory);
  const c = await createConversation({
    enterpriseId: ent.id,
    ownerId: s.sub,
    initialTurn: {
      role: "ai",
      text: WELCOME_TEXT + (ent.memory ? "（已加载该企业的历史记忆）" : ""),
      card: env.card,
      envelope: env,
      at: new Date().toISOString(),
    },
  });
  return Response.json({ conversation: c }, { status: 201 });
}
