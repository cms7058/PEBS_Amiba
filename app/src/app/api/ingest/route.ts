import { authConnector } from "../../../lib/connectors";
import { ingestBatch } from "../../../lib/factory";
import { applyKpiUpdates, getTemplate, listTemplates, type KpiUpdate } from "../../../lib/otd";
import type { IngestEnvelope } from "../../../lib/factory-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NodeUpdateEnvelope {
  source?: string;
  enterpriseId?: string;
  templateId?: string;   // 省略时按令牌企业解析生效模板
  updates: KpiUpdate[];
}

// 子工具上报现场要素数据。V2.2 起首选「节点 KPI 回填」(updates)；
// 兼容旧的「企业散点」批次(metrics/wasteItems)，避免破坏既有连接器。
export async function POST(req: Request) {
  const tok = await authConnector(req);
  if (!tok) return Response.json({ error: "无效或缺失的连接器令牌" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | (Partial<IngestEnvelope> & Partial<NodeUpdateEnvelope>)
    | null;
  if (!body) return Response.json({ error: "无效请求体" }, { status: 400 });

  // 令牌绑定即真相
  if (body.source && body.source !== tok.source) {
    return Response.json({ error: "source 与令牌不匹配" }, { status: 403 });
  }
  if (body.enterpriseId && body.enterpriseId !== tok.enterpriseId) {
    return Response.json({ error: "enterpriseId 与令牌不匹配" }, { status: 403 });
  }

  // --- 新路径：节点 KPI 回填 ---
  if (Array.isArray(body.updates) && body.updates.length) {
    // templateId 省略时，按令牌企业解析「生效模板」(与 /ingest/targets、规划页一致)
    let templateId = body.templateId;
    if (!templateId) {
      const list = await listTemplates(tok.enterpriseId);
      templateId = list[0]?.id;
    }
    if (!templateId) return Response.json({ error: "该企业暂无 OTD 模板" }, { status: 404 });

    const tpl = await getTemplate(templateId);
    if (!tpl) return Response.json({ error: "OTD 模板不存在" }, { status: 404 });
    // 模板必须属于本企业（或是行业库模板）
    if (tpl.enterpriseId && tpl.enterpriseId !== tok.enterpriseId) {
      return Response.json({ error: "模板不属于该企业" }, { status: 403 });
    }
    try {
      const r = await applyKpiUpdates(templateId, body.updates, tok.source);
      return Response.json({ ok: true, templateId, ...r }, { status: 201 });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  // --- 旧路径：企业散点批次（向后兼容）---
  if (body.batchId) {
    const env: IngestEnvelope = {
      source: tok.source,
      enterpriseId: tok.enterpriseId,
      batchId: body.batchId,
      metrics: body.metrics,
      wasteItems: body.wasteItems,
    };
    try {
      const result = await ingestBatch(env);
      return Response.json({ ok: true, ...result }, { status: 201 });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  return Response.json({ error: "需提供 templateId+updates 或 batchId+metrics" }, { status: 400 });
}
