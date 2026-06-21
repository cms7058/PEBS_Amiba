import { authConnector, recordRegistration } from "../../../../lib/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 工具启动时调用一次：上报自己的版本与能力清单，用于「能力发现」。
export async function POST(req: Request) {
  const tok = await authConnector(req);
  if (!tok) return Response.json({ error: "无效或缺失的连接器令牌" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    version?: string;
    capabilities?: string[];
    inboundUrl?: string;
  } | null;

  await recordRegistration({
    source: tok.source,
    enterpriseId: tok.enterpriseId,
    version: body?.version,
    capabilities: body?.capabilities,
    inboundUrl: body?.inboundUrl,
  });

  return Response.json({ ok: true, source: tok.source, enterpriseId: tok.enterpriseId });
}
