import { prisma } from "../prisma";

export async function getLeadershipRoster() {
  const profiles = await prisma.mercenaryProfile.findMany({
    where: {
      status: "APPROVED",
      isPublic: true,
      rank: {
        isLeadershipCore: true, // ✅ FIXED
      },
    },
    include: {
      rank: true,
      subdivision: true,
      user: true,
    },
    orderBy: {
      rank: { sortOrder: "asc" },
    },
  });

  return profiles.map((profile) => ({
    id: profile.id,
    characterName: profile.characterName,
    rank: profile.rank?.name ?? "Leader",
    rankSortOrder: profile.rank?.sortOrder ?? 0,
    isLeadershipCore: profile.rank?.isLeadershipCore ?? false,
    bio: profile.bio,
    portraitUrl: profile.portraitUrl || profile.user.avatarUrl || null,
    subdivisionName: profile.subdivision?.name,
    discordUsername: profile.user.discordUsername ?? null,
  }));
}
