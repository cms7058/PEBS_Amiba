import { getCurrentSession } from "../../../lib/auth";
import { listRegistrations, listTokens } from "../../../lib/connectors";
import { sourcesForEnterprise } from "../../../lib/factory";
import { listTemplates } from "../../../lib/otd";
import type { ConnectorSource } from "../../../lib/factory-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 节点 KPI 回填也算「已上报数据」：扫描生效模板各 KPI 的 source。
async function kpiSources(enterpriseId: string): Promise<ConnectorSource[]> {
  const tpl = (await listTemplates(enterpriseId))[0];
  if (!tpl) return [];
  const set = new Set<ConnectorSource>();
  for (const n of tpl.nodes) for (const k of n.kpis) if (k.source && k.source !== "manual") set.add(k.source);
  return [...set];
}

// 管理端：查看某企业各工具的接入状态（已发令牌 / 已注册 / 已上报数据）。
export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId") || undefined;

  const [tokens, registrations, batchSources, kpiSrc] = await Promise.all([
    listTokens(enterpriseId),
    listRegistrations(enterpriseId),
    enterpriseId ? sourcesForEnterprise(enterpriseId) : Promise.resolve([]),
    enterpriseId ? kpiSources(enterpriseId) : Promise.resolve([]),
  ]);
  const ingested = [...new Set([...batchSources, ...kpiSrc])];

  // 不回传明文令牌，避免泄露
  const safeTokens = tokens.map(({ token, ...rest }) => ({
    ...rest,
    tokenPreview: token.slice(0, 8) + "…",
  }));

  return Response.json({ tokens: safeTokens, registrations, ingested });
}
