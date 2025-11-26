import { PERMISSIONS } from "./permissions";
import { ROLE_IDS, DOSSIER_ADMIN_RANKS } from "./role-constants";

type UserRole = {
  discordRoleId: string;
  discordRole: {
    name: string;
    permissions: {
      permission: {
        key: string;
      };
    }[];
  };
};

/**
 * Derives all permissions for a user based on their Discord roles
 * Centralizes permission logic to avoid duplication across codebase
 */
export function deriveUserPermissions(userRoles: UserRole[]): Set<string> {
  const permissions = new Set<string>();

  // Add permissions from role_permissions table
  userRoles.forEach((userRole) => {
    userRole.discordRole.permissions.forEach((rolePermission) => {
      permissions.add(rolePermission.permission.key);
    });
  });

  // Add special permissions based on hardcoded role IDs
  const discordRoleIds = userRoles.map((r) => r.discordRoleId);
  if (discordRoleIds.includes(ROLE_IDS.SITE_ADMIN)) {
    permissions.add(PERMISSIONS.SITE_ADMIN);
  }
  if (discordRoleIds.includes(ROLE_IDS.MARKETPLACE_ADMIN)) {
    permissions.add(PERMISSIONS.MARKETPLACE_ADMIN);
  }

  // Add DOSSIER_ADMIN permission based on rank names
  const roleNames = userRoles.map((r) => r.discordRole.name.toLowerCase());
  if (roleNames.some((name) => DOSSIER_ADMIN_RANKS.has(name))) {
    permissions.add(PERMISSIONS.DOSSIER_ADMIN);
  }

  return permissions;
}
