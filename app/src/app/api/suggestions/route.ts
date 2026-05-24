import { getCurrentSession } from "../../../lib/auth";
import { listSuggestions, type SuggestionStatus } from "../../../lib/suggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as SuggestionStatus | null;
  const items = await listSuggestions(status ? { status } : undefined);
  return Response.json({ suggestions: items });
}
