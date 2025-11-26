import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Force Node.js runtime for middleware (required for Prisma with pg adapter)
export const runtime = "nodejs";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const isSuspended = req.auth?.user && (req.auth.user as any).isActive === false;

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard"];

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect to signin if accessing protected route without auth
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isProtectedRoute && isSuspended) {
    const suspendedUrl = new URL("/auth/error", req.url);
    suspendedUrl.searchParams.set("error", "Suspended");
    return NextResponse.redirect(suspendedUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
