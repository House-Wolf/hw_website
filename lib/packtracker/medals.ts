import "server-only";
import { prisma } from "@/lib/prisma";

export async function getMedalDefinitions() {
  return prisma.ptMedalDefinition.findMany({
    where: { isActive: true },
    include: { _count: { select: { awards: true, nominations: true } } },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });
}

export async function getMedalLeaderboard(limit = 20) {
  const awards = await prisma.ptMedalAward.groupBy({
    by: ["recipientId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const userIds = awards.map((a) => a.recipientId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, discordDisplayName: true, discordUsername: true, avatarUrl: true },
  });

  return awards.map((a) => ({
    user: users.find((u) => u.id === a.recipientId),
    totalMedals: a._count.id,
  }));
}

export async function nominateMember(data: {
  medalId: number;
  nomineeId: string;
  nominatedById: string;
  reason: string;
}) {
  return prisma.ptMedalNomination.create({ data });
}

export async function reviewNomination(
  nominationId: number,
  reviewedById: string,
  approved: boolean
) {
  return prisma.ptMedalNomination.update({
    where: { id: nominationId },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      reviewedById,
      reviewedAt: new Date(),
    },
  });
}
