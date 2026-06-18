import { getCurrentSession } from "../../../lib/auth";
import { buildCompanyTree, getFinancials, saveFinancials, type Actuals } from "../../../lib/dupont";
import type { FinancialInput } from "../../../lib/dupont";
import { listTemplates } from "../../../lib/otd";
import { rollupTemplate } from "../../../lib/rollup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 现场 rollup（元）→ 万元，仅 >0 的项作为实际值覆盖杜邦叶子「当前」
async function actualsFromRollup(enterpriseId: string): Promise<{ actuals: Actuals; rollupYuan: { labor: number; equipment: number; material: number; total: number } }> {
  const templates = await listTemplates(enterpriseId);
  const tpl = templates.find((t) => t.enterpriseId === enterpriseId) || templates[0];
  if (!tpl) return { actuals: {}, rollupYuan: { labor: 0, equipment: 0, material: 0, total: 0 } };
  const { total } = await rollupTemplate(enterpriseId, tpl.id);
  const w = (n: number) => Math.round((n / 10000) * 100) / 100; // 元→万元
  const actuals: Actuals = {};
  if (total.labor > 0) actuals.labor = w(total.labor);
  if (total.equipment > 0) actuals.equipment = w(total.equipment);
  if (total.material > 0) actuals.material = w(total.material);
  return { actuals, rollupYuan: total };
}

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId");
  if (!enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  const financials = await getFinancials(enterpriseId);
  const { actuals, rollupYuan } = await actualsFromRollup(enterpriseId);
  const tree = buildCompanyTree(financials, actuals);
  return Response.json({ financials, tree, rollup: rollupYuan });
}

export async function PUT(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as FinancialInput | null;
  if (!body?.enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  const financials = await saveFinancials(body);
  const tree = buildCompanyTree(financials);
  return Response.json({ financials, tree });
}
