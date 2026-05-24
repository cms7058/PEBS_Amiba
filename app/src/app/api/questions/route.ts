import { getCurrentSession } from "../../../lib/auth";
import { createQuestion, listQuestions, type QuestionStatus } from "../../../lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const statuses = statusParam ? (statusParam.split(",") as QuestionStatus[]) : undefined;
  const questions = await listQuestions(statuses ? { status: statuses } : undefined);
  return Response.json({ questions });
}

export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.question || !body?.dimension || !body?.level || !body?.type) {
    return Response.json({ error: "请填写完整字段" }, { status: 400 });
  }
  const q = await createQuestion({
    dimension: body.dimension,
    level: body.level,
    type: body.type,
    question: body.question,
    options: body.options,
    status: body.status || "active",
    source: "admin",
    createdBy: s.sub,
  });
  return Response.json({ question: q }, { status: 201 });
}
