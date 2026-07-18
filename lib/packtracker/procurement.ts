import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  PtRequestStatus,
  PtRequestPriority,
  PtPreferredForm,
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

export async function getProcurementRequests(filters?: {
  status?: PtRequestStatus;
  createdById?: string;
  claimedByUserId?: string;
  linkedCraftingRequestId?: string;
  pinned?: boolean;
}) {
  return prisma.ptProcurementRequest.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.createdById && { createdById: filters.createdById }),
      ...(filters?.pinned != null && { isPinned: filters.pinned }),
      ...(filters?.linkedCraftingRequestId && {
        linkedCraftingRequestId: filters.linkedCraftingRequestId,
      }),
      ...(filters?.claimedByUserId && {
        claims: { some: { profileId: filters.claimedByUserId } },
      }),
    },
    include: {
      material: { select: { id: true, name: true, category: true } },
      createdBy: { select: authorSelect },
      ...claimsInclude,
      _count: { select: { comments: true } },
    },
    orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getProcurementRequestById(id: string) {
  return prisma.ptProcurementRequest.findUnique({
    where: { id },
    include: {
      material: true,
      linkedCraftingRequest: {
        select: { id: true, itemName: true, status: true },
      },
      createdBy: { select: authorSelect },
      ...claimsInclude,
      comments: {
        where: { isDeleted: false },
        include: { author: { select: authorSelect } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createProcurementRequest(data: {
  materialName: string;
  materialId?: number;
  quantityRequested: number;
  minimumQuality?: number;
  preferredForm?: PtPreferredForm;
  priority?: PtRequestPriority;
  deliveryLocation?: string;
  rewardOffered?: string;
  notes?: string;
  maxClaims?: number;
  linkedCraftingRequestId?: string;
  createdById: string;
}) {
  return prisma.ptProcurementRequest.create({ data });
}

export async function claimProcurementRequest(requestId: string, userId: string) {
  const request = await prisma.ptProcurementRequest.findUnique({
    where: { id: requestId },
    include: { _count: { select: { claims: true } } },
  });
  if (!request) throw new Error("Request not found");
  if (request._count.claims >= request.maxClaims)
    throw new Error("This request has reached its maximum number of claims");

  const [, claim] = await prisma.$transaction([
    prisma.ptProcurementRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
    prisma.ptRequestClaim.create({
      data: { procurementRequestId: requestId, profileId: userId },
    }),
  ]);
  return claim;
}

export async function unclaimProcurementRequest(requestId: string, userId: string) {
  await prisma.ptRequestClaim.deleteMany({
    where: { procurementRequestId: requestId, profileId: userId },
  });
  const remaining = await prisma.ptRequestClaim.count({
    where: { procurementRequestId: requestId },
  });
  if (remaining === 0) {
    await prisma.ptProcurementRequest.update({
      where: { id: requestId },
      data: { status: "OPEN", acceptedAt: null },
    });
  }
}

export async function updateProcurementStatus(
  requestId: string,
  status: PtRequestStatus
) {
  const data: Record<string, unknown> = { status };
  if (status === "COMPLETED") data.completedAt = new Date();
  if (status === "CANCELLED") data.cancelledAt = new Date();
  return prisma.ptProcurementRequest.update({ where: { id: requestId }, data });
}

export async function updateQuantityDelivered(
  requestId: string,
  quantityDelivered: number
) {
  return prisma.ptProcurementRequest.update({
    where: { id: requestId },
    data: { quantityDelivered },
  });
}

export async function pinProcurementRequest(requestId: string, isPinned: boolean) {
  return prisma.ptProcurementRequest.update({
    where: { id: requestId },
    data: { isPinned },
  });
}

export async function addProcurementComment(
  requestId: string,
  authorId: string,
  content: string,
  isLiveChat = false
) {
  return prisma.ptRequestComment.create({
    data: { procurementRequestId: requestId, authorId, content, isLiveChat },
    include: { author: { select: authorSelect } },
  });
}
