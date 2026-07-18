import "server-only";
import { prisma } from "@/lib/prisma";
import type { PtInterestType, PtOwnershipStatus } from "@prisma/client";

const authorSelect = {
  id: true,
  discordDisplayName: true,
  discordUsername: true,
  avatarUrl: true,
} as const;

export async function getBlueprints(query?: string, category?: string) {
  return prisma.ptBlueprint.findMany({
    where: {
      isActive: true,
      ...(query && {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { craftedItemName: { contains: query, mode: "insensitive" } },
        ],
      }),
      ...(category && { category }),
    },
    include: {
      recipeMaterials: { include: { material: true } },
      memberInterests: {
        select: { userId: true, interestType: true, ownerStatus: true },
      },
      _count: { select: { craftingRequests: true } },
    },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });
}

export async function getBlueprintById(id: number) {
  return prisma.ptBlueprint.findUnique({
    where: { id },
    include: {
      recipeMaterials: { include: { material: true } },
      memberInterests: {
        include: { user: { select: authorSelect } },
        orderBy: { addedAt: "asc" },
      },
      craftingRequests: {
        where: { status: { in: ["OPEN", "IN_PROGRESS", "ACCEPTED"] } },
        include: {
          createdBy: { select: { id: true, discordDisplayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

export async function getBlueprintCategories() {
  const results = await prisma.ptBlueprint.findMany({
    where: { isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return results.map((r) => r.category).filter(Boolean) as string[];
}

export async function setBlueprintInterest(
  userId: string,
  blueprintId: number,
  interestType: PtInterestType,
  ownerStatus?: PtOwnershipStatus
) {
  return prisma.ptMemberBlueprintInterest.upsert({
    where: {
      userId_blueprintId_interestType: { userId, blueprintId, interestType },
    },
    create: { userId, blueprintId, interestType, ownerStatus },
    update: { ownerStatus },
  });
}

export async function removeBlueprintInterest(
  userId: string,
  blueprintId: number,
  interestType: PtInterestType
) {
  return prisma.ptMemberBlueprintInterest.deleteMany({
    where: { userId, blueprintId, interestType },
  });
}

export async function getUserBlueprintInterests(userId: string) {
  return prisma.ptMemberBlueprintInterest.findMany({
    where: { userId },
    include: { blueprint: { select: { id: true, name: true, category: true } } },
    orderBy: { addedAt: "desc" },
  });
}
