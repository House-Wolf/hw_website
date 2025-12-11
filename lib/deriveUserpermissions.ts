// lib/derive-permissions.ts
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
 * @component - DeriveUserPermissions
 * @description - Derives all permissions for a user based on their Discord roles,
 * optional mercenary profile rank, and hardcoded mappings.
 * @param {UserRole[]} userRoles - Array of user roles from the database.
 * @param {string | null} rankName - Optional mercenary profile rank name.
 * @returns {Set<string>} - A set of unique permission keys assigned to the user.
 * @author House Wolf Dev Team
 */
export function deriveUserPermissions(
  userRoles: UserRole[],
  rankName?: string | null
): Set<string> {
  const permissions = new Set<string>();

  // 1️⃣ DB-based role_permissions table
  userRoles.forEach((userRole) => {
    userRole.discordRole.permissions.forEach((rolePermission) => {
      permissions.add(rolePermission.permission.key);
    });
  });

  // 2️⃣ Hardcoded Discord role IDs (site admin, marketplace admin)
  const discordRoleIds = userRoles.map((r) => r.discordRoleId);

  if (discordRoleIds.includes(ROLE_IDS.SITE_ADMIN)) {
    permissions.add(PERMISSIONS.SITE_ADMIN);
  }

  if (discordRoleIds.includes(ROLE_IDS.MARKETPLACE_ADMIN)) {
    permissions.add(PERMISSIONS.MARKETPLACE_ADMIN);
  }

  // 3️⃣ DOSSIER_ADMIN via DISCORD ROLE NAME (partial match allowed)
  const discordRoleNames = userRoles.map((r) =>
    r.discordRole.name.toLowerCase()
  );

  for (const roleName of discordRoleNames) {
    for (const keyword of DOSSIER_ADMIN_RANKS) {
      const normalized = keyword.toLowerCase();
      if (roleName.includes(normalized)) {
        permissions.add(PERMISSIONS.DOSSIER_ADMIN);
      }
    }
  }

  // 4️⃣ DOSSIER_ADMIN via MERCENARY PROFILE RANK NAME
  if (rankName) {
    const normalizedRank = rankName.trim().toLowerCase();
    if (DOSSIER_ADMIN_RANKS.has(normalizedRank)) {
      permissions.add(PERMISSIONS.DOSSIER_ADMIN);
    }
  }

  return permissions;
}
