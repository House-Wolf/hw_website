import "server-only";
import { prisma } from "@/lib/prisma";

const authorSelect = {
  id: true,
  discordDisplayName: true,
  discordUsername: true,
  avatarUrl: true,
} as const;

export async function getDashboardData(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const activeStatuses = ["OPEN", "ACCEPTED", "IN_PROGRESS"] as const;
  const doneStatuses = ["COMPLETED", "CANCELLED", "REFUSED"] as const;

  const [
    openAssistance,
    openCrafting,
    openProcurement,
    inProgressAssistance,
    inProgressCrafting,
    inProgressProcurement,
    completedTodayAssistance,
    completedTodayCrafting,
    completedTodayProcurement,
    pinnedAssistance,
    pinnedCrafting,
    pinnedProcurement,
    myAssistanceClaims,
    myCraftingClaims,
    myProcurementClaims,
    myOpenAssistance,
    myOpenCrafting,
    myOpenProcurement,
  ] = await Promise.all([
    prisma.ptAssistanceRequest.count({ where: { status: "OPEN" } }),
    prisma.ptCraftingRequest.count({ where: { status: "OPEN" } }),
    prisma.ptProcurementRequest.count({ where: { status: "OPEN" } }),
    prisma.ptAssistanceRequest.count({ where: { status: { in: ["ACCEPTED", "IN_PROGRESS"] } } }),
    prisma.ptCraftingRequest.count({ where: { status: { in: ["ACCEPTED", "IN_PROGRESS"] } } }),
    prisma.ptProcurementRequest.count({ where: { status: { in: ["ACCEPTED", "IN_PROGRESS"] } } }),
    prisma.ptAssistanceRequest.count({
      where: { status: "COMPLETED", completedAt: { gte: todayStart } },
    }),
    prisma.ptCraftingRequest.count({
      where: { status: "COMPLETED", completedAt: { gte: todayStart } },
    }),
    prisma.ptProcurementRequest.count({
      where: { status: "COMPLETED", completedAt: { gte: todayStart } },
    }),
    // Pinned active requests
    prisma.ptAssistanceRequest.findMany({
      where: { isPinned: true, status: { notIn: [...doneStatuses] } },
      include: { createdBy: { select: authorSelect }, _count: { select: { comments: true, claims: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.ptCraftingRequest.findMany({
      where: { isPinned: true, status: { notIn: [...doneStatuses] } },
      include: {
        blueprint: { select: { id: true, name: true, category: true } },
        createdBy: { select: authorSelect },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.ptProcurementRequest.findMany({
      where: { isPinned: true, status: { notIn: [...doneStatuses] } },
      include: { createdBy: { select: authorSelect }, _count: { select: { comments: true, claims: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // My active claims (assistance)
    prisma.ptAssistanceRequest.findMany({
      where: {
        status: { in: [...activeStatuses] },
        claims: { some: { profileId: userId } },
      },
      include: { createdBy: { select: authorSelect } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    // My active crafting assignments
    prisma.ptCraftingRequest.findMany({
      where: {
        status: { in: [...activeStatuses] },
        OR: [
          { assignedCrafterId: userId },
          { claims: { some: { profileId: userId } } },
        ],
      },
      include: {
        blueprint: { select: { id: true, name: true } },
        createdBy: { select: authorSelect },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    // My active procurement claims
    prisma.ptProcurementRequest.findMany({
      where: {
        status: { in: [...activeStatuses] },
        claims: { some: { profileId: userId } },
      },
      include: { createdBy: { select: authorSelect } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    // My open requests (created by me, not done)
    prisma.ptAssistanceRequest.findMany({
      where: { createdById: userId, status: { notIn: [...doneStatuses] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.ptCraftingRequest.findMany({
      where: { createdById: userId, status: { notIn: [...doneStatuses] } },
      include: { blueprint: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.ptProcurementRequest.findMany({
      where: { createdById: userId, status: { notIn: [...doneStatuses] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    counts: {
      openAssistance,
      openCrafting,
      openProcurement,
      totalOpen: openAssistance + openCrafting + openProcurement,
      totalInProgress: inProgressAssistance + inProgressCrafting + inProgressProcurement,
      completedToday: completedTodayAssistance + completedTodayCrafting + completedTodayProcurement,
    },
    pinned: { assistance: pinnedAssistance, crafting: pinnedCrafting, procurement: pinnedProcurement },
    myActiveTasks: { assistance: myAssistanceClaims, crafting: myCraftingClaims, procurement: myProcurementClaims },
    myOpenRequests: { assistance: myOpenAssistance, crafting: myOpenCrafting, procurement: myOpenProcurement },
  };
}
