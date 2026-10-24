"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type DashboardProfile = {
  id: string;
  name: string | null;
  discordUsername: string;
  discordDisplayName: string | null;
  avatarUrl: string | null;
  image: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  roles: { discordRole: { id: string; name: string; color: number | null; position: number | null } }[];
  permissions: { key: string; description: string | null }[];
};

const DashboardContext = createContext<{
  user: DashboardProfile | null;
  loading: boolean;
  error: boolean;
  needsSignIn: boolean;
  refresh: () => void;
} | null>(null);

export function DashboardProfileProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setLoading(true); setError(false); setRevision(value => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user/profile", { signal: controller.signal })
      .then(async response => {
        if (response.status === 401) {
          if (!controller.signal.aborted) { setUser(null); setNeedsSignIn(true); }
          throw new Error("Sign in required");
        }
        if (!response.ok) throw new Error("Profile unavailable");
        const profile = await response.json();
        if (!Array.isArray(profile.roles) || !Array.isArray(profile.permissions)) throw new Error("Invalid profile");
        if (!controller.signal.aborted) { setUser(profile); setNeedsSignIn(false); }
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  return <DashboardContext.Provider value={{ user, loading, error, needsSignIn, refresh }}>{children}</DashboardContext.Provider>;
}

export function useDashboardProfile() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("Dashboard profile provider is missing");
  return context;
}
