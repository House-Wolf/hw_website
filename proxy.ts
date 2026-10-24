import { auth } from "@/lib/auth";
import type { NextAuthRequest } from "next-auth";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

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
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Auth.js may replace req.url with AUTH_URL; redirects must retain the browser's origin.
  const originalOrigin = new URL(request.url).origin;
  const handler: (req: NextAuthRequest, event: NextFetchEvent) => NextResponse = (req) => {
    const { pathname } = req.nextUrl;

    const session = req.auth;
    const isAuthenticated = !!session?.user;
    const isSuspended = session?.user?.isActive === false;

    const protectedRoutes = [
      "/dashboard",
      "/profile",
      "/settings",
      "/api/contact-seller",
      "/api/marketplace/contact-seller",
      "/api/marketplace/create",
      "/api/marketplace/delete",
      "/api/marketplace/my-listings",
      "/api/marketplace/update",
      "/api/marketplace/upload",
      "/api/packtracker",
      "/api/command",
      "/api/social-links",
      "/api/user",
    ];

    const isProtected = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtected && !isAuthenticated) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in with Discord first." }, { status: 401 });
      const url = new URL("/auth/signin", originalOrigin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (isProtected && isSuspended) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
      const url = new URL("/auth/error", originalOrigin);
      url.searchParams.set("error", "Suspended");
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/auth/signin") && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", originalOrigin));
    }

    return NextResponse.next();
  };
  return auth(handler)(request, event);
}

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
