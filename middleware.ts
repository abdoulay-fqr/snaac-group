import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "snaac_admin_session";
const PUBLIC_PATHS = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/api/admin/login",
  "/api/admin/forgot-password",
  "/api/admin/reset-password",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (pathname.startsWith("/admin") && !PUBLIC_PATHS.has(pathname) && !hasSession) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin/login" && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/api/admin") && !PUBLIC_PATHS.has(pathname) && !hasSession) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
