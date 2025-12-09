"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider
      // Disable automatic session polling to prevent excessive API calls
      refetchInterval={0}
      // Disable refetch on window focus to reduce unnecessary calls
      refetchOnWindowFocus={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
