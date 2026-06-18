import { getCurrentSession } from "../../../lib/auth";
import { cloneForEnterprise, listTemplates } from "../../../lib/otd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId") || undefined;
  const templates = await listTemplates(enterpriseId);
  return Response.json({ templates });
}

// 克隆库模板为企业实例
export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    templateId?: string; enterpriseId?: string; name?: string;
  } | null;
  if (!body?.templateId || !body?.enterpriseId) {
    return Response.json({ error: "请提供 templateId 与 enterpriseId" }, { status: 400 });
  }
  try {
    const tpl = await cloneForEnterprise(body.templateId, body.enterpriseId, body.name);
    return Response.json({ template: tpl }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
