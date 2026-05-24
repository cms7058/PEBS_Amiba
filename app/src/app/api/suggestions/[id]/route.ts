import { getCurrentSession } from "../../../../lib/auth";
import { getSuggestion, updateSuggestion } from "../../../../lib/suggestions";
import { createQuestion } from "../../../../lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  action: "approve" | "reject";
  /** Optional patch to apply before approval */
  patch?: {
    dimension?: string;
    level?: string;
    type?: string;
    question?: string;
    options?: string[];
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });

  const { id } = await params;
  const sugg = await getSuggestion(id);
  if (!sugg) return Response.json({ error: "建议不存在" }, { status: 404 });
  if (sugg.status !== "pending") return Response.json({ error: "已审核过" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.action) return Response.json({ error: "缺少 action" }, { status: 400 });

  if (body.action === "reject") {
    const updated = await updateSuggestion(id, {
      status: "rejected",
      reviewedBy: s.sub,
      reviewedAt: new Date().toISOString(),
    });
    return Response.json({ suggestion: updated });
  }

  // approve → create active Question, then mark suggestion approved
  const merged = { ...sugg, ...body.patch };
  const q = await createQuestion({
    dimension: merged.dimension as never,
    level: merged.level as never,
    type: merged.type as never,
    question: merged.question,
    options: merged.options,
    status: "active",
    source: "ai_suggested",
    createdBy: s.sub,
  });
  const updated = await updateSuggestion(id, {
    status: "approved",
    reviewedBy: s.sub,
    reviewedAt: new Date().toISOString(),
    resultingQuestionId: q.id,
  });
  return Response.json({ suggestion: updated, question: q });
}
