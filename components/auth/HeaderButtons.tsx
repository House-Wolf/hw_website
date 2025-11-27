/**
 * HeaderButtons component to display Sign In, Sign Out, or Dashboard buttons
 * based on user authentication status and current route. 
 * Uses client-side navigation and authentication handling.
 * @param isLoggedIn - Boolean indicating if the user is logged in 
 * @return JSX.Element - The appropriate button component
 * @component
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function HeaderButtons({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  // Detect dashboard route
  const onDashboard = pathname.startsWith("/dashboard");

  // User NOT logged in → Show Sign In button
  if (!isLoggedIn) {
    return (
      <Link href="/auth/signin" className="btn btn-secondary">
        Sign In
      </Link>
    );
  }

  // User IS logged in AND on dashboard → Show Sign Out button
  if (onDashboard) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="btn btn-secondary flex items-center gap-2"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    );
  }

  // User logged in but NOT on dashboard → Show Dashboard button
  return (
    <Link href="/dashboard" className="btn btn-secondary">
      Dashboard
    </Link>
  );
}
