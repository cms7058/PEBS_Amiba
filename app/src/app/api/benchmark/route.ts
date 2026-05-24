import { getCurrentSession } from "../../../lib/auth";
import { getIndustryStats, percentileForIndustry } from "../../../lib/benchmark";
import type { Industry } from "../../../lib/diagnosis-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const url = new URL(req.url);
  const industry = url.searchParams.get("industry") as Industry | null;
  const score = Number(url.searchParams.get("score") || "");

  if (!industry) return Response.json({ error: "缺少 industry" }, { status: 400 });

  const stats = await getIndustryStats(industry);
  let percentile: number | null = null;
  if (!Number.isNaN(score)) percentile = await percentileForIndustry(industry, score);

  return Response.json({ stats, percentile });
}
