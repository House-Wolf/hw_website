// Hardcoded Discord role IDs for special permissions
export const ROLE_IDS = {
  SITE_ADMIN: "1442226431747948595",
  MARKETPLACE_ADMIN: "1443066936337633400",
} as const;

// Rank names that grant DOSSIER_ADMIN permission
export const DOSSIER_ADMIN_RANKS = new Set([
  "clan warlord",
  "hand of the clan",
  "high councilor",
  "armor",
  "fleet commander",
  "captain",
]);

// Rank priority for display purposes
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
