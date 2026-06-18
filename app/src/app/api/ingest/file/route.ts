import { getCurrentSession } from "../../../../lib/auth";
import { applyKpiUpdates, getTemplate, type KpiUpdate } from "../../../../lib/otd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 人工采集模版导入：登录用户上传填好的模版（JSON），回填到节点 KPI。
// 与工具自动采集殊途同归（source 标记为 manual）。
// 请求体：{ templateId, updates: [{ nodeKey, kpiKey, value, capturedAt? }] }
// 或 CSV 文本（首行表头 nodeKey,kpiKey,value）。
export async function POST(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });

  const ct = req.headers.get("content-type") || "";
  let templateId = new URL(req.url).searchParams.get("templateId") || "";
  let updates: KpiUpdate[] = [];

  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as
      { templateId?: string; updates?: KpiUpdate[] } | null;
    if (!body) return Response.json({ error: "无效 JSON" }, { status: 400 });
    templateId = body.templateId || templateId;
    updates = body.updates || [];
  } else {
    // CSV：nodeKey,kpiKey,value[,capturedAt]
    const text = await req.text();
    updates = parseCsv(text);
  }

  if (!templateId) return Response.json({ error: "缺少 templateId" }, { status: 400 });
  if (updates.length === 0) return Response.json({ error: "没有可导入的数据行" }, { status: 400 });

  const tpl = await getTemplate(templateId);
  if (!tpl) return Response.json({ error: "OTD 模板不存在" }, { status: 404 });

  try {
    const r = await applyKpiUpdates(templateId, updates, "manual");
    return Response.json({ ok: true, ...r }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

function parseCsv(text: string): KpiUpdate[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const iNode = header.indexOf("nodeKey");
  const iKpi = header.indexOf("kpiKey");
  const iVal = header.indexOf("value");
  const iAt = header.indexOf("capturedAt");
  if (iNode < 0 || iKpi < 0 || iVal < 0) return [];
  const out: KpiUpdate[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const value = Number(c[iVal]);
    if (!c[iNode] || !c[iKpi] || Number.isNaN(value)) continue;
    out.push({
      nodeKey: c[iNode].trim(),
      kpiKey: c[iKpi].trim(),
      value,
      capturedAt: iAt >= 0 ? c[iAt]?.trim() : undefined,
    });
  }
  return out;
}
