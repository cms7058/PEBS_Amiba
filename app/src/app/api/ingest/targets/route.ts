import { authConnector } from "../../../../lib/connectors";
import { listTemplates } from "../../../../lib/otd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 子工具用连接器令牌拉取「回填目标」：该企业当前生效的 OTD 模板 id + 节点/KPI 目录。
// 工具据此知道可以往哪些 nodeKey/kpiKey 回填（无需提前知道 templateId）。
// 生效模板 = listTemplates(enterpriseId)[0]，与规划/总览页所用的模板保持一致。
export async function GET(req: Request) {
  const tok = await authConnector(req);
  if (!tok) return Response.json({ error: "无效或缺失的连接器令牌" }, { status: 401 });

  const list = await listTemplates(tok.enterpriseId);
  const tpl = list[0];
  if (!tpl) return Response.json({ error: "该企业暂无 OTD 模板" }, { status: 404 });

  return Response.json({
    templateId: tpl.id,
    enterpriseId: tok.enterpriseId,
    source: tok.source,
    nodes: tpl.nodes.map((n) => ({
      key: n.key,
      name: n.name,
      factor: n.factor,
      kpis: n.kpis.map((k) => ({
        key: k.key,
        label: k.label,
        unit: k.unit,
        betterWhen: k.betterWhen,
        baseline: k.values.baseline,
        current: k.values.current,
        target: k.values.target,
        source: k.source,
      })),
    })),
  });
}
