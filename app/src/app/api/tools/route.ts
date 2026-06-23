import { getCurrentSession } from "../../../lib/auth";
import { effectiveTools } from "../../../lib/tool-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 生效工具清单（名称/网址按超管覆盖生效）。任意登录用户可读，供诊断引擎/产品页显示。
export async function GET() {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const tools = await effectiveTools();
  return Response.json({ tools });
}
