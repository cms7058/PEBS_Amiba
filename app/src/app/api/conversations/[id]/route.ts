import { getCurrentSession } from "../../../../lib/auth";
import { deleteConversation, getConversation, updateConversation } from "../../../../lib/conversations";
import { createSuggestion } from "../../../../lib/suggestions";
import type { ConversationTurn } from "../../../../lib/diagnosis-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authz(id: string) {
  const s = await getCurrentSession();
  if (!s) return { err: Response.json({ error: "未登录" }, { status: 401 }) };
  const c = await getConversation(id);
  if (!c) return { err: Response.json({ error: "会话不存在" }, { status: 404 }) };
  if (s.role !== "admin" && c.ownerId !== s.sub) {
    return { err: Response.json({ error: "无权限" }, { status: 403 }) };
  }
  return { conversation: c, session: s };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await authz(id);
  if ("err" in r) return r.err;
  return Response.json({ conversation: r.conversation });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await authz(id);
  if ("err" in r) return r.err;

  const body = (await req.json().catch(() => null)) as {
    turns?: ConversationTurn[];
    status?: "in_progress" | "completed" | "abandoned";
    progress?: Record<string, number>;
    currentDimension?: string;
  } | null;
  if (!body) return Response.json({ error: "无效请求" }, { status: 400 });

  const updated = await updateConversation(id, body as never);

  // If the latest AI turn contains propose_question, record a Suggestion
  const lastAi = [...(body.turns || [])].reverse().find((t) => t.role === "ai");
  const proposal = lastAi?.envelope?.propose_question;
  if (proposal && proposal.question?.trim()) {
    try {
      await createSuggestion({
        dimension: proposal.dimension,
        level: proposal.level,
        type: proposal.type,
        question: proposal.question,
        options: proposal.options,
        reason: proposal.reason || "智能体在对话中识别的新现象",
        conversationId: id,
        enterpriseId: updated.enterpriseId,
        proposedBy: r.session.sub,
      });
    } catch {
      // best-effort; ignore dedup / store errors
    }
  }

  return Response.json({ conversation: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await authz(id);
  if ("err" in r) return r.err;
  await deleteConversation(id);
  return Response.json({ ok: true });
}
