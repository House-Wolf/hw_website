"use client";

import { useSession } from "next-auth/react";
import Header from "./Header";

/**
 * @component HeaderConditional - Client component for header rendering
 * @description Renders Header with session-based authentication state
 * @author House Wolf Dev Team
 */
export default function HeaderConditional() {
  const { data: session, status } = useSession();

  // Show header with loading state or logged in state
  return <Header isLoggedIn={status === "authenticated" && !!session?.user} />;
}
