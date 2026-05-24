import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
