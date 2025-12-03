import { RANK_PRIORITY } from "@/lib/role-constants";

/**
 * @component - GetRankPriority
 * @description - Returns the relative priority of a rank name.
 * Lower index = higher rank. Unknown ranks go to the end.
 * @param {string | null} rankName - The name of the rank.
 * @returns {number} - The priority index of the rank.
 * @author House Wolf Dev Team
 */
export function getRankPriority(rankName?: string | null): number {
  if (!rankName) return RANK_PRIORITY.length;
  const index = RANK_PRIORITY.indexOf(rankName.trim());
  return index === -1 ? RANK_PRIORITY.length : index;
}
