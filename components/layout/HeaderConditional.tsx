"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "./Header";

/**
 * @component HeaderConditional - Client component for header rendering
 * @description Renders Header with session-based authentication state
 * @author House Wolf Dev Team
 */
export default function HeaderConditional() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (pathname?.startsWith("/invite/")) {
    return null;
  }

  // Show header with loading state or logged in state
  return <Header isLoggedIn={status === "authenticated" && !!session?.user} />;
}
