import { prisma } from "@/lib/prisma";

/**
 * Check if a user is suspended from marketplace
 * @param userId - User ID to check
 * @returns boolean - true if suspended, false otherwise
 */
export async function isUserSuspended(userId: string): Promise<boolean> {
  try {
    const userStatus = await prisma.marketplaceUserStatus.findUnique({
      where: { userId },
    });

    if (!userStatus) {
      return false;
    }

    // Check if suspended
    if (!userStatus.isSuspended) {
      return false;
    }

    // Check if suspension has ended
    if (userStatus.endsAt && userStatus.endsAt < new Date()) {
      // Auto-lift expired suspension
      await prisma.marketplaceUserStatus.update({
        where: { userId },
        data: { isSuspended: false },
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking suspension status (failing closed):", error);
    // Fail closed to avoid accidentally lifting suspensions during outages
    return true;
  }
}

/**
 * Get user suspension details
 * @param userId - User ID to check
 * @returns Suspension details or null
 */
export async function getUserSuspensionDetails(userId: string) {
  try {
    const userStatus = await prisma.marketplaceUserStatus.findUnique({
      where: { userId },
      include: {
        suspender: {
          select: {
            discordUsername: true,
            discordDisplayName: true,
          },
        },
      },
    });

    if (!userStatus || !userStatus.isSuspended) {
      return null;
    }

    return {
      isSuspended: true,
      reason: userStatus.reason,
      suspendedAt: userStatus.suspendedAt,
      endsAt: userStatus.endsAt,
      suspendedBy:
        userStatus.suspender?.discordDisplayName ||
        userStatus.suspender?.discordUsername ||
        "System",
    };
  } catch (error) {
    console.error("Error fetching suspension details:", error);
    return null;
  }
}
