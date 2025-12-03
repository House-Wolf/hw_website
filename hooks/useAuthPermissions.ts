"use client";

import { useSession } from "next-auth/react";
import { PERMISSIONS, Permission } from "@/lib/permissions";

/**
 * @component - UseAuthPermissions
 * @description A custom hook to manage user authentication and permissions.
 * Provides methods to check user permissions. 
 * @returns {Object} An object containing session data, user info, and permission check methods
 * @author House Wolf Dev Team
 */
export function useAuthPermissions() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const hasPermission = (perm: Permission): boolean => {
    if (!user) return false;
    return user.permissions.includes(perm);
  };

  const hasAnyPermission = (perms: Permission[]): boolean => {
    if (!user) return false;
    return perms.some((p) => user.permissions.includes(p));
  };

  const hasAllPermissions = (perms: Permission[]): boolean => {
    if (!user) return false;
    return perms.every((p) => user.permissions.includes(p));
  };

  return {
    session,
    status,
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    PERMISSIONS,
  };
}
