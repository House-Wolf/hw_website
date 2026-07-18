import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  PtRequestStatus,
  PtRequestPriority,
  PtMaterialSupplyMode,
} from "@prisma/client";

const authorSelect = {
  id: true,
  discordDisplayName: true,
  discordUsername: true,
  avatarUrl: true,
} as const;

const claimsInclude = {
  claims: {
    include: { profile: { select: authorSelect } },
    orderBy: { claimedAt: "asc" as const },
  },
} as const;

export async function getCraftingRequests(filters?: {
  status?: PtRequestStatus;
  createdById?: string;
  assignedCrafterId?: string;
  claimedByUserId?: string;
  pinned?: boolean;
  blueprintId?: number;
}) {
  return prisma.ptCraftingRequest.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.createdById && { createdById: filters.createdById }),
      ...(filters?.assignedCrafterId && {
        assignedCrafterId: filters.assignedCrafterId,
      }),
      ...(filters?.pinned != null && { isPinned: filters.pinned }),
      ...(filters?.blueprintId && { blueprintId: filters.blueprintId }),
      ...(filters?.claimedByUserId && {
        claims: { some: { profileId: filters.claimedByUserId } },
      }),
    },
    include: {
      blueprint: { select: { id: true, name: true, category: true, tier: true } },
      createdBy: { select: authorSelect },
      assignedCrafter: { select: authorSelect },
      ...claimsInclude,
      _count: { select: { comments: true, linkedProcurementRequests: true } },
    },
    orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getCraftingRequestById(id: string) {
  return prisma.ptCraftingRequest.findUnique({
    where: { id },
    include: {
      blueprint: {
        include: { recipeMaterials: { include: { material: true } } },
      },
      createdBy: { select: authorSelect },
      assignedCrafter: { select: authorSelect },
      ...claimsInclude,
      linkedProcurementRequests: {
        include: {
          material: true,
          createdBy: { select: authorSelect },
          ...claimsInclude,
        },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        where: { isDeleted: false },
        include: { author: { select: authorSelect } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createCraftingRequest(data: {
  blueprintId: number;
  itemName: string;
  quantityRequested?: number;
  minimumQuality?: number;
  materialSupplyMode?: PtMaterialSupplyMode;
  priority?: PtRequestPriority;
  rewardOffered?: string;
  deliveryLocation?: string;
  requiredBy?: Date;
  notes?: string;
  maxClaims?: number;
  createdById: string;
}) {
  return prisma.ptCraftingRequest.create({ data });
}

export async function assignCrafter(requestId: string, crafterId: string) {
  const request = await prisma.ptCraftingRequest.findUnique({
    where: { id: requestId },
    include: { _count: { select: { claims: true } } },
  });
  if (!request) throw new Error("Request not found");
  if (request._count.claims >= request.maxClaims)
    throw new Error("This request already has a crafter assigned");

  const [updated, claim] = await prisma.$transaction([
    prisma.ptCraftingRequest.update({
      where: { id: requestId },
      data: {
        status: "ACCEPTED",
        assignedCrafterId: crafterId,
        acceptedAt: new Date(),
      },
    }),
    prisma.ptRequestClaim.create({
      data: { craftingRequestId: requestId, profileId: crafterId },
    }),
  ]);
  return { updated, claim };
}

export async function unassignCrafter(requestId: string, crafterId: string) {
  await prisma.ptRequestClaim.deleteMany({
    where: { craftingRequestId: requestId, profileId: crafterId },
  });
  await prisma.ptCraftingRequest.update({
    where: { id: requestId },
    data: { status: "OPEN", assignedCrafterId: null, acceptedAt: null },
  });
}

export async function updateCraftingStatus(
  requestId: string,
  status: PtRequestStatus
) {
  const data: Record<string, unknown> = { status };
  if (status === "COMPLETED") data.completedAt = new Date();
  if (status === "CANCELLED") data.cancelledAt = new Date();
  return prisma.ptCraftingRequest.update({ where: { id: requestId }, data });
}

export async function pinCraftingRequest(requestId: string, isPinned: boolean) {
  return prisma.ptCraftingRequest.update({
    where: { id: requestId },
    data: { isPinned },
  });
}

export async function addCraftingComment(
  requestId: string,
  authorId: string,
  content: string,
  isLiveChat = false
) {
  return prisma.ptRequestComment.create({
    data: { craftingRequestId: requestId, authorId, content, isLiveChat },
    include: { author: { select: authorSelect } },
  });
}
