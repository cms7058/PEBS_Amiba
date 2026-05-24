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

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  };
}
