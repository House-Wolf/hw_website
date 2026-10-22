import "server-only";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PackTrackerAccessState =
  | { kind: "unauthorized" }
  | { kind: "unconfigured" }
  | { kind: "pendingMigration"; message: string }
  | {
      kind: "ready";
      profile: {
        id: string;
        username: string;
        discordDisplayName: string | null;
        discordAvatarUrl: string | null;
      };
      displayName: string;
    };

export async function getPackTrackerAccess(): Promise<PackTrackerAccessState> {
  if (!process.env.DATABASE_URL) {
    return { kind: "unconfigured" };
  }

  const session = await auth();
  const user = session?.user;

  if (!user?.discordId) {
    return { kind: "unauthorized" };
  }

  try {
    const profile = await prisma.packTrackerProfile.upsert({
      where: { discordId: user.discordId },
      update: {
        userId: user.id,
        username: user.discordUsername || user.name || "Unknown",
        discordDisplayName: user.discordDisplayName || user.name,
        discordAvatarUrl: user.avatarUrl || user.image,
        lastLogin: new Date(),
      },
      create: {
        userId: user.id,
        discordId: user.discordId,
        username: user.discordUsername || user.name || "Unknown",
        discordDisplayName: user.discordDisplayName || user.name,
        discordAvatarUrl: user.avatarUrl || user.image,
      },
      select: {
        id: true,
        username: true,
        discordDisplayName: true,
        discordAvatarUrl: true,
      },
    });

    return {
      kind: "ready",
      profile,
      displayName: profile.discordDisplayName || profile.username,
    };
  } catch (error) {
    return {
      kind: "pendingMigration",
      message: error instanceof Error ? error.message : "PackTracker data is unavailable.",
    };
  }
}

export function formatPackTrackerStatus(status: number) {
  return ["Open", "Accepted", "In Progress", "Completed", "Cancelled", "Refused"][
    status
  ] ?? "Unknown";
}

export function formatPackTrackerPriority(priority: number) {
  return ["Low", "Normal", "High", "Critical"][priority] ?? "Normal";
}
