import { getCurrentSession } from "../../../lib/auth";
import { createProduct, listProducts } from "../../../lib/products";
import { getEnterprise } from "../../../lib/enterprises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId") || undefined;
  return Response.json({ products: await listProducts(enterpriseId) });
}

export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  if (s.role === "viewer") return Response.json({ error: "无权限" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { enterpriseId?: string; partNo?: string; name?: string; note?: string } | null;
  if (!body?.enterpriseId || !body?.partNo) return Response.json({ error: "请提供 enterpriseId 与 partNo" }, { status: 400 });
  const ent = await getEnterprise(body.enterpriseId);
  if (!ent) return Response.json({ error: "企业不存在" }, { status: 404 });

  const p = await createProduct({ enterpriseId: body.enterpriseId, partNo: body.partNo, name: body.name, note: body.note, createdBy: s.sub });
  return Response.json({ product: p }, { status: 201 });
}
