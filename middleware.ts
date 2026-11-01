import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "snaac_admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !hasSession) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin/login" && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login" && !hasSession) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
