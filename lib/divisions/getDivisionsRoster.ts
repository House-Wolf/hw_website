import "server-only";
import { prisma } from "@/lib/prisma";
import type { DivisionSlug } from "@/lib/divisions/divisionConfig";

const COMMAND_RANKS = ["Captain", "Lieutenant", "Field Marshal", "Platoon Sergeant"] as const;

export type DivisionMember = {
  id: string;
  characterName: string;
  callSign: string | null;
  rank: string;
  rankSortOrder: number;
  isLeadershipCore: boolean;
  isOfficerCore: boolean;
  bio: string;
  portraitUrl: string | null;
  subdivisionName: string | null;
  discordUsername: string | null;
};

export type DivisionRosterResponse = {
  division: {
    name: string;
    slug: string;
    description: string;
  };
  commandRoster: DivisionMember[];
  officers: DivisionMember[];
  members: DivisionMember[];
};

export async function getDivisionRoster(
  slug: DivisionSlug
): Promise<DivisionRosterResponse> {
  const normalizedSlug = slug.toLowerCase().trim();

  const division = await prisma.division.findFirst({
    where: {
      slug: {
        equals: normalizedSlug,
        mode: "insensitive", // 🔑 CRITICAL FIX
      },
    },
    include: {
      mercenaryProfiles: {
        where: { status: "APPROVED", isPublic: true },
        include: {
          rank: {
            select: {
              name: true,
              sortOrder: true,
              isLeadershipCore: true,
              isOfficerCore: true,
            },
          },
          subdivision: { select: { name: true } },
          user: { select: { discordUsername: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!division) {
    throw new Error(`Division not found: ${normalizedSlug}`);
  }

  const profiles: DivisionMember[] = division.mercenaryProfiles.map((profile) => ({
    id: profile.id,
    characterName: profile.characterName,
    callSign: profile.call_sign,
    rank: profile.rank?.name || "Member",
    rankSortOrder: profile.rank?.sortOrder ?? 999,
    isLeadershipCore: profile.rank?.isLeadershipCore ?? false,
    isOfficerCore: profile.rank?.isOfficerCore ?? false,
    bio: profile.bio,
    portraitUrl: profile.portraitUrl || profile.user.avatarUrl || null,
    subdivisionName: profile.subdivision?.name || null,
    discordUsername: profile.user.discordUsername ?? null,
  }));

  const commandRoster = profiles
    .filter((p) => p.isLeadershipCore || (COMMAND_RANKS as readonly string[]).includes(p.rank))
    .sort((a, b) => a.rankSortOrder - b.rankSortOrder);

  const officers = profiles
    .filter(
      (p) =>
        !p.isLeadershipCore &&
        !(COMMAND_RANKS as readonly string[]).includes(p.rank) &&
        p.isOfficerCore
    )
    .sort((a, b) => a.rankSortOrder - b.rankSortOrder);

  const members = profiles
    .filter(
      (p) =>
        !p.isLeadershipCore &&
        !(COMMAND_RANKS as readonly string[]).includes(p.rank) &&
        !p.isOfficerCore
    )
    .sort((a, b) => a.rankSortOrder - b.rankSortOrder);

  return {
    division: {
      name: division.name,
      slug: division.slug,
      description: division.description,
    },
    commandRoster,
    officers,
    members,
  };
}
