import { getCurrentSession } from "../../../lib/auth";
import { getOrg, saveOrg } from "../../../lib/org-design";
import type { OrgDesign } from "../../../lib/org-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId");
  if (!enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  return Response.json({ org: await getOrg(enterpriseId) });
}

export async function PUT(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as OrgDesign | null;
  if (!body?.enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  return Response.json({ org: await saveOrg(body) });
}
