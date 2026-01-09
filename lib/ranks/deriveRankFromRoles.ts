import "server-only";
import { prisma } from "@/lib/prisma";
import { RANK_PRIORITY } from "@/lib/role-constants";

/**
 * @function deriveRankFromRoles
 * @description Derives the highest-priority rank from a user's Discord role names
 * @param {string[]} roleNames - Array of Discord role names
 * @returns {Promise<number | null>} - The rank ID to assign, or null if no matching rank
 * @author House Wolf Dev Team
 */
export async function deriveRankFromRoles(
  roleNames: string[]
): Promise<number | null> {
  try {
    // Find Discord roles that match rank names
    const matchingRanks = roleNames.filter((roleName) =>
      RANK_PRIORITY.includes(roleName)
    );

    if (matchingRanks.length === 0) {
      console.log("[deriveRankFromRoles] No matching ranks found", { roleNames });
      return null;
    }

    // Find the highest-priority rank (lowest index in RANK_PRIORITY)
    const highestRank = matchingRanks.reduce((highest, current) => {
      const currentPriority = RANK_PRIORITY.indexOf(current);
      const highestPriority = RANK_PRIORITY.indexOf(highest);
      return currentPriority < highestPriority ? current : highest;
    });

    console.log("[deriveRankFromRoles] Derived rank", {
      roleNames,
      matchingRanks,
      highestRank
    });

    // Look up the rank ID in the database
    const rankRecord = await prisma.rank.findFirst({
      where: {
        name: {
          equals: highestRank,
          mode: "insensitive",
        },
      },
    });

    if (!rankRecord) {
      console.warn("[deriveRankFromRoles] Rank not found in database", {
        highestRank
      });
    }

    return rankRecord?.id ?? null;
  } catch (error) {
    console.error("[deriveRankFromRoles] Error deriving rank", {
      roleNames,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
