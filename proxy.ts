import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth(async function proxy(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const isAuthenticated = !!req.auth;
  const isSuspended =
    req.auth?.user && (req.auth.user as any).isActive === false;

  // Routes requiring authentication
  const protectedRoutes = [
    "/dashboard",
    "/profile",
    "/settings",
    "/api/contact-seller",
    "/api/marketplace/create",
    "/api/marketplace/delete",
    "/api/marketplace/my-listings",
    "/api/marketplace/update",
    "/api/marketplace/upload",
    "/api/social-links",
    "/api/user",
  ];

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // 1. Block suspended users
  if (isProtected && isSuspended) {
    url.pathname = "/auth/error";
    url.searchParams.set("error", "Suspended");
    return NextResponse.redirect(url);
  }

  // 2. Require authentication for protected routes
  if (isProtected && !isAuthenticated) {
    url.pathname = "/auth/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // 3. Authenticated users should not visit signin page
  if (isAuthenticated && pathname.startsWith("/auth/signin")) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

/**
 * Next.js 16 Proxy Matcher
 *
 * This excludes:
 * - Static assets
 * - Image optimization paths
 * - Favicon
 * - File uploads (formidable requires raw body)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/marketplace/upload|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
