/**
 * @constant ROLE_IDs 
 * @description sssHardcoded Discord role IDs for special permissions Hardcoded Discord role IDs for special permissions 
 * @author House Wold Dev Team
 * ### REVIEWED 12/08/25 ###
*/
export const ROLE_IDS = {
  SITE_ADMIN: "1442226431747948595",
  MARKETPLACE_ADMIN: "1443066936337633400",
} as const;

/**
 * @component 
 * @description Rank names that grant DOSSIER_ADMIN permission
 * @author House Wolf Dev Team
 * ### REVIED ###
 */
// Rank names that grant DOSSIER_ADMIN permission
export const DOSSIER_ADMIN_RANKS = new Set([
  "clan warlord",
  "hand of the clan",
  "high councilor",
  "armor",
  "fleet commander",
  "captain",
]);

/**
 * @constant Rank Priority
 * @description Rank priority for display purposes 
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
