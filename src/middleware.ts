import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Edge middleware: first line of defence for protected routes. Full RBAC is
// still enforced server-side in every API route and admin page (defence in
// depth) — this just avoids rendering shells for unauthenticated users.

const STUDENT_PREFIXES = ["/dashboard", "/writing", "/submissions", "/profile"];
const ADMIN_PREFIX = "/admin";

const ADMIN_ROLES = new Set([
  "TEACHER",
  "SUPPORT",
  "PRODUCT_ADMIN",
  "FINANCE_ADMIN",
  "SUPER_ADMIN",
]);

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsStudent = STUDENT_PREFIXES.some((p) => pathname.startsWith(p));
  const needsAdmin = pathname.startsWith(ADMIN_PREFIX);
  if (!needsStudent && !needsAdmin) return NextResponse.next();

  const role = await getRole(req);
  if (!role) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (needsAdmin && !ADMIN_ROLES.has(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/writing/:path*",
    "/submissions/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
