import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "./users-types";

export const SESSION_COOKIE = "amiba_session";
const ALG = "HS256";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const s = process.env.AMIBA_AUTH_SECRET || "dev-only-secret-change-me-in-production-xxxxxxxxxxxx";
  if (s === "dev-only-secret-change-me-in-production-xxxxxxxxxxxx" && process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn("[auth] AMIBA_AUTH_SECRET is not set; using insecure default. SET IT IN PRODUCTION.");
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  sub: string; // user id
  username: string;
  role: Role;
  name: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions(req?: Request) {
  // Only set the `Secure` flag when the request actually arrived over HTTPS.
  // Setting it on plain HTTP would make the browser silently drop the cookie
  // — login appears to succeed but no session is stored, redirecting users
  // back to /login indefinitely. Detect via x-forwarded-proto (set by
  // reverse proxies like Nginx / Caddy / Cloudflare) or the request URL scheme.
  let isHttps = false;
  if (req) {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto === "https") isHttps = true;
    else if (req.url.startsWith("https://")) isHttps = true;
  }
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
    maxAge: SESSION_TTL,
  };
}
