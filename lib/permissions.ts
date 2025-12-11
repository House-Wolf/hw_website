import { auth } from "@/lib/auth";

/**
 * @component permissions constants
 * @description Defines the various permissions available in the system.
 * Each permission corresponds to a specific capability within the application.
 * @author House Wolf Dev Team
 */
export const PERMISSIONS = {
  SITE_ADMIN: "SITE_ADMIN",
  MERCENARY_APPROVE: "MERCENARY_APPROVE",
  MARKETPLACE_ADMIN: "MARKETPLACE_ADMIN",
  MARKETPLACE_MODERATOR: "MARKETPLACE_MODERATOR",
  DIVISION_CONFIG: "DIVISION_CONFIG",
  DOSSIER_ADMIN: "DOSSIER_ADMIN",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * @component Permission Check Functions
 * @description Functions to check user permissions within the application.
 * These functions utilize the authentication context to verify if the
 * current user has the required permissions to perform certain actions.
 * @author House Wolf Dev Team
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return session.user.permissions.includes(permission);
}

/**
 * @component hasAnyPermission
 * @description Check if the current user has ANY of the specified permissions
 * @param permissions - An array of permissions to check against the current user
 * @returns A promise that resolves to true if the user has at least one of the specified permissions, false otherwise
 * @author House Wolf Dev Team
 */
export async function hasAnyPermission(
  permissions: Permission[]
): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return permissions.some((p) => session.user!.permissions.includes(p));
}

/**
 * @component hasAllPermissions
 * @description Check if the current user has ALL of the specified permissions
 * @param permissions - An array of permissions to check against the current user
 * @returns A promise that resolves to true if the user has all of the specified permissions, false otherwise
 * @author House Wolf Dev Team
 */
export async function hasAllPermissions(
  permissions: Permission[]
): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return permissions.every((p) => session.user!.permissions.includes(p));
}

/**
 * @component requireAuth
 * @description Require authentication or throw an error
 * @author House Wolf Dev Team
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required");
  }
  return session;
}

/**
 * @component requirePermission
 * @description Require a specific permission or throw an error
 * @param permission - The permission to check
 * @author House Wolf Dev Team
 */
export async function requirePermission(permission: Permission) {
  const ok = await hasPermission(permission);
  if (!ok) {
    throw new Error(`Permission required: ${permission}`);
  }
}
