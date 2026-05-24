import { getCurrentSession } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getCurrentSession();
  if (!s) return Response.json({ user: null }, { status: 401 });
  return Response.json({
    user: { id: s.sub, username: s.username, displayName: s.name, role: s.role },
  });
}
