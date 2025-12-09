/**
 * @component AuthMiddleware
 * @description Authentication + authorization gate for the House Wolf Next.js App Router.
 *              Prevents unauthenticated/suspended users from accessing protected dashboard
 *              routes and redirects authenticated users away from the sign-in page.
 * @param {Request} req The incoming request wrapped by Auth.js middleware
 * @returns {NextResponse} A redirect or pass-through response based on authentication state
 * @author House Wolf Dev Team
 *  ### REVIEWED 12/08/25 ###
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const user = req.auth?.user ?? null;
  const isAuthenticated = !!user;

  const isSuspended = user ? user.isActive !== true : false;

  const isProtectedRoute = pathname.startsWith("/dashboard");

  /**
   * 1️⃣ Block unauthenticated users from protected routes
   */
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url);

    signInUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));

    return NextResponse.redirect(signInUrl);
  }

  /**
   * 2️⃣ Block suspended users from dashboard routes
   */
  if (isProtectedRoute && isSuspended) {
    const suspendedUrl = new URL("/auth/error", req.url);
    suspendedUrl.searchParams.set("error", "Suspended");
    return NextResponse.redirect(suspendedUrl);
  }

  /**
   * 3️⃣ Redirect authenticated users *away* from the signin page
   */
  if (isAuthenticated && pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

/**
 * @component MiddlewareMatcher
 * @description Defines which incoming paths should be processed by middleware.
 *              Uses the official Next.js pattern, avoiding brittle regex and ensuring
 *              static assets, images, and upload endpoints bypass middleware cleanly.
 * @returns {object} Matcher configuration for Next.js runtime
 * @author House Wolf Dev Team
 */
export const config = {
  matcher: [
    /**
     * Matches ALL routes **except**:
     * - /_next/*
     * - /favicon.ico
     * - public static files
     * - upload endpoints (must bypass middleware or upload will break)
     */
    "/((?!_next|favicon.ico|api/marketplace/upload|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
