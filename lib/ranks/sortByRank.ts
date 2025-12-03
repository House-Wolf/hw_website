import { getRankPriority } from "./getRankPriority";

export type RankedItem = {
  rankName?: string | null;
};

/**
 * @component - SortByRank
 * @description - Sorts items by rank priority using the shared RANK_PRIORITY order.
 * @param {T[]} items - Array of items with rankName property.
 * @returns {T[]} - Sorted array of items.
 * @author House Wolf Dev Team
 */
export function sortByRank<T extends RankedItem>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => getRankPriority(a.rankName) - getRankPriority(b.rankName)
  );
}
