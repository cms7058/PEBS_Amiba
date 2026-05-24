import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/m/login"];
const PUBLIC_API = ["/api/auth/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static & next internals already filtered by matcher
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPublicApi = PUBLIC_API.some((p) => pathname.startsWith(p));

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Logged-in user visiting /login → bounce to home
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (session && pathname === "/m/login") {
    return NextResponse.redirect(new URL("/m", req.url));
  }

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }
    // Mobile routes go to mobile login page
    const loginPath = pathname.startsWith("/m") ? "/m/login" : "/login";
    const url = new URL(loginPath, req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Admin gate
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/users")) {
    if (session.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return Response.json({ error: "无权限" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static assets, _next, and public files like favicon, logo, etc.
    "/((?!_next/static|_next/image|favicon.ico|logo.png|logo.jpg).*)",
  ],
};
