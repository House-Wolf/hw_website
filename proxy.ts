import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * @component - Authentication and Authorization Proxy Middleware
 * @description - This middleware handles authentication and authorization for protected routes.
 * It redirects unauthenticated users to the sign-in page and suspended users to an error page.
 * It also prevents authenticated users from accessing the sign-in page.
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/middleware}
 * @see {@link https://next-auth.js.org/configuration/nextjs#middleware}
 * @returns {NextResponse} - The appropriate NextResponse based on authentication and authorization status.
 * @author House Wolf Dev Team
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const session = req.auth;
  const isAuthenticated = !!session?.user;
  const isSuspended = session?.user?.isActive === false;

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

  if (isProtected && !isAuthenticated) {
    const url = new URL("/auth/signin", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isProtected && isSuspended) {
    const url = new URL("/auth/error", req.url);
    url.searchParams.set("error", "Suspended");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/auth/signin") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

/**
 * Middleware Configuration
 * Defines which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (NextAuth routes)
     * - Image files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
