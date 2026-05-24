import { getCurrentSession } from "../../../lib/auth";
import { createEnterprise, listEnterprises } from "../../../lib/enterprises";
import type { Industry } from "../../../lib/diagnosis-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  // Admins see all; others see their own
  const enterprises = await listEnterprises(s.role === "admin" ? undefined : s.sub);
  return Response.json({ enterprises });
}

export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    name?: string; industry?: Industry; scale?: string; contact?: string;
  } | null;
  if (!body?.name || !body?.industry) return Response.json({ error: "请填写公司名称和行业" }, { status: 400 });
  try {
    const e = await createEnterprise({
      name: body.name,
      industry: body.industry,
      scale: body.scale,
      contact: body.contact,
      ownerId: s.sub,
    });
    return Response.json({ enterprise: e }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
