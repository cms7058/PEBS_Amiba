import { getCurrentSession } from "../../../lib/auth";
import { getProgress, setStep, STEP_KEYS, type StepKey } from "../../../lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const enterpriseId = new URL(req.url).searchParams.get("enterpriseId");
  if (!enterpriseId) return Response.json({ error: "缺少 enterpriseId" }, { status: 400 });
  return Response.json({ progress: await getProgress(enterpriseId) });
}

export async function PUT(req: Request) {
  const s = await getCurrentSession();
  if (!s) return Response.json({ error: "未登录" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { enterpriseId?: string; step?: StepKey; done?: boolean } | null;
  if (!body?.enterpriseId || !body?.step || !STEP_KEYS.includes(body.step)) {
    return Response.json({ error: "参数错误" }, { status: 400 });
  }
  return Response.json({ progress: await setStep(body.enterpriseId, body.step, body.done ?? true) });
}
