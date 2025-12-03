/**
 * @component role-constants.ts
 * @description Constants related to roles and permissions within the application.
 * @author House Wolf Dev Team
 */
export const ROLE_IDS = {
  SITE_ADMIN: "1442226431747948595",
  MARKETPLACE_ADMIN: "1443066936337633400",
} as const;


/**
 * @component DOSSIER_ADMIN_RANKS
 * @description Rank names that grant DOSSIER_ADMIN permission
 * @author House Wolf Dev Team
 */
export const DOSSIER_ADMIN_RANKS = new Set([
  "clan warlord",
  "hand of the clan",
  "high councilor",
  "armor",
  "fleet commander",
  "captain",
]);

/**
 * @component RANK_PRIORITY
 * @description Ordered list of ranks from highest to lowest priority
 * @author House Wolf Dev Team
 */
export const RANK_PRIORITY = [
  "Clan Warlord",
  "Hand of the Clan",
  "High Councilor",
  "Armor",
  "Fleet Commander",
  "Captain",
  "Lieutenant",
  "Field Marshal",
  "Platoon Sergeant",
  "Rally Master",
  "Wolf Dragoon",
  "Foundling",
  "Member",
];
