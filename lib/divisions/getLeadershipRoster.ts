import { prisma } from "../prisma";

export type LeadershipMember = {
  id: string;
  characterName: string;
  rank: string;
  rankSortOrder: number;
  isLeadershipCore: boolean;
  isOfficerCore: boolean;
  bio: string;
  portraitUrl: string | null;
  subdivisionName: string | undefined;
  subdivisionSlug: string | null;
  subdivisionPatchPath: string | null;
  discordUsername: string | null;
  callSign?: string;
  divisionSlug?: string;
};

export type LeadershipRosterResponse = {
  leadershipCore: LeadershipMember[];
  officers: LeadershipMember[];
};

export async function getLeadershipRoster(): Promise<LeadershipRosterResponse> {
  const profiles = await prisma.mercenaryProfile.findMany({
    where: {
      status: "APPROVED",
      isPublic: true,
      rank: {
        OR: [
          { isLeadershipCore: true },
          { isOfficerCore: true }
        ]
      },
    },
    include: {
      rank: true,
      subdivision: true,
      user: true,
      division: true,
    },
    orderBy: {
      rank: { sortOrder: "asc" },
    },
  });

  const allMembers = profiles.map((profile) => ({
    id: profile.id,
    characterName: profile.characterName,
    rank: profile.rank?.name ?? "Leader",
    rankSortOrder: profile.rank?.sortOrder ?? 0,
    isLeadershipCore: profile.rank?.isLeadershipCore ?? false,
    isOfficerCore: profile.rank?.isOfficerCore ?? false,
    bio: profile.bio,
    portraitUrl: profile.portraitUrl || profile.user.avatarUrl || null,
    subdivisionName: profile.subdivision?.name,
    subdivisionSlug: profile.subdivision?.slug ?? null,
    subdivisionPatchPath: profile.subdivision?.patchImagePath ?? null,
    discordUsername: profile.user.discordUsername ?? null,
    callSign: profile.call_sign ?? undefined,
    divisionSlug: profile.division?.slug,
  }));

  return {
    leadershipCore: allMembers.filter(m => m.isLeadershipCore),
    officers: allMembers.filter(m => !m.isLeadershipCore && m.isOfficerCore),
  };
}
