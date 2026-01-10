"use client";

import { SessionProvider } from "next-auth/react";

/**
 * @components Providers Wrapper
 * @description Wraps the application with necessary providers such as SessionProvider for authentication.
 * Note: ThemeProvider is now scoped to dashboard routes only.
 * @param param0 - children components to be wrapped
 * @returns The wrapped children components
 * @author House Wolf Dev Team
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
