import { cookies } from "next/headers";
import { findOrCreateInviteUser, recordLogin } from "../../../../lib/users";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PEBS cloud function endpoint. May be overridden via env for staging. */
const CLOUD_API = process.env.PEBS_CLOUD_API
  || "https://fc-mp-ad17509f-ebae-4693-974b-769771dd93c5.next.bspapp.com/pebs-copilot-api";
const PRODUCT_KEY = "Amoeba-copilot";

interface CloudResp {
  success?: boolean;
  ok?: boolean;
  valid?: boolean;
  access?: boolean;
  code?: number | string;
  status?: string;          // "ok" / "success" / "not_found" / "expired" ...
  message?: string;
  error?: string;
  action?: string;          // e.g. "apply_invite" → tell client to show 申请邀请码
  data?: {
    email?: string;
    displayName?: string;
    name?: string;
    role?: "admin" | "consultant" | "viewer";
    isAdmin?: boolean;
    productKey?: string;
    userEmail?: string;
    inviteCode?: string;
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; invite_code?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const inviteCode = body?.invite_code?.trim();

  if (!email || !inviteCode) {
    return Response.json({ error: "请填写邮箱和邀请码" }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "邮箱格式不正确" }, { status: 400 });
  }

  // ---------- 1) Hit the PEBS cloud function ----------
  let cloud: CloudResp = {};
  let upstreamStatus = 0;
  try {
    const r = await fetch(CLOUD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        action: "loginWithInvite",
        productKey: PRODUCT_KEY,
        email,
        inviteCode,
      }),
    });
    upstreamStatus = r.status;
    cloud = (await r.json().catch(() => ({}))) as CloudResp;
  } catch (e) {
    return Response.json(
      { error: "云函数调用失败：" + (e as Error).message },
      { status: 502 }
    );
  }

  // STRICT success detection. The cloud function returns HTTP 200 even for
  // invalid invites — distinguishable only by the explicit fields below.
  // A request is success only if ANY explicit success marker is set AND no
  // explicit failure marker is set.
  const successMarker =
    cloud.success === true ||
    cloud.ok === true ||
    cloud.valid === true ||
    cloud.access === true ||
    cloud.status === "ok" ||
    cloud.status === "success" ||
    cloud.code === 0 || cloud.code === "0" || cloud.code === 200;

  const failureMarker =
    cloud.success === false ||
    cloud.valid === false ||
    cloud.access === false ||
    !!cloud.error ||
    (typeof cloud.code === "number" && cloud.code >= 400) ||
    (typeof cloud.status === "string" &&
      ["not_found", "expired", "denied", "invalid", "error"].includes(cloud.status));

  const looksOk = upstreamStatus < 400 && successMarker && !failureMarker;

  if (!looksOk) {
    // Map well-known failure statuses to friendlier action codes for the UI
    const action =
      cloud.action ||
      (cloud.status === "not_found" ? "apply_invite" : undefined);

    return Response.json(
      {
        error:
          cloud.message ||
          cloud.error ||
          "邀请码验证失败（云函数未返回明确成功标记）",
        action,
        upstreamStatus,
      },
      { status: 401 }
    );
  }

  // ---------- 2) Establish local session ----------
  try {
    const role = cloud.data?.role || (cloud.data?.isAdmin ? "admin" : "consultant");
    const user = await findOrCreateInviteUser({
      email,
      displayName: cloud.data?.displayName || cloud.data?.name,
      role,
    });

    const token = await signSession({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.displayName,
    });
    const c = await cookies();
    c.set(SESSION_COOKIE, token, sessionCookieOptions(req));
    await recordLogin(user.id);

    return Response.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        email,
      },
    });
  } catch (e) {
    return Response.json(
      { error: "本地会话建立失败：" + (e as Error).message },
      { status: 500 }
    );
  }
}
