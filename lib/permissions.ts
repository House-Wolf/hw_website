import { auth } from "@/lib/auth";

// Permission constants
export const PERMISSIONS = {
  SITE_ADMIN: "SITE_ADMIN",
  MERCENARY_APPROVE: "MERCENARY_APPROVE",
  MARKETPLACE_ADMIN: "MARKETPLACE_ADMIN",
  MARKETPLACE_MODERATOR: "MARKETPLACE_MODERATOR",
  DIVISION_CONFIG: "DIVISION_CONFIG",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(
  permission: Permission
): Promise<boolean> {
  const session = await auth();

  if (!session?.user) {
    return false;
  }

  return session.user.permissions.includes(permission);
}

/**
 * Check if the current user has ANY of the specified permissions
 */
export async function hasAnyPermission(
  permissions: Permission[]
): Promise<boolean> {
  const session = await auth();

  if (!session?.user) {
    return false;
  }

  return permissions.some((permission) =>
    session.user.permissions.includes(permission)
  );
}

/**
 * Check if the current user has ALL of the specified permissions
 */
export async function hasAllPermissions(
  permissions: Permission[]
): Promise<boolean> {
  const session = await auth();

  if (!session?.user) {
    return false;
  }

  return permissions.every((permission) =>
    session.user.permissions.includes(permission)
  );
}

/**
 * Get the current session or throw an error if not authenticated
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Authentication required");
  }

  return session;
}

/**
 * Require a specific permission or throw an error
 */
export async function requirePermission(permission: Permission) {
  const hasAccess = await hasPermission(permission);

  if (!hasAccess) {
    throw new Error(`Permission required: ${permission}`);
  }
}
