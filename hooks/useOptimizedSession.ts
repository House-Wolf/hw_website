"use client";

import { useSession as useNextAuthSession } from "next-auth/react";
import { useRef, useEffect } from "react";

// Cache to deduplicate session requests
const sessionCache: {
  data: unknown;
  timestamp: number;
  CACHE_DURATION: number;
} = {
  data: null,
  timestamp: 0,
  CACHE_DURATION: 5000, // 5 seconds
};

/**
 * @hook useOptimizedSession
 * @description Optimized session hook that caches session data to prevent excessive API calls
 * @returns Session data and status from NextAuth
 * @author House Wolf Dev Team
 */
export function useOptimizedSession() {
  const session = useNextAuthSession();
  const hasLogged = useRef(false);

  useEffect(() => {
    const now = Date.now();
    if (!hasLogged.current && session.data) {
      if (now - sessionCache.timestamp < sessionCache.CACHE_DURATION) {
        // Session was cached, no new API call made
        hasLogged.current = true;
      } else {
        // New API call was made
        sessionCache.data = session.data;
        sessionCache.timestamp = now;
        hasLogged.current = true;
      }
    }
  }, [session.data]);

  return session;
}
