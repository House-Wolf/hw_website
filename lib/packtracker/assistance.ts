import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  PtAssistanceKind,
  PtRequestStatus,
  PtRequestPriority,
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

export async function getAssistanceRequests(filters?: {
  status?: PtRequestStatus;
  kind?: PtAssistanceKind;
  createdById?: string;
  claimedByUserId?: string;
  pinned?: boolean;
}) {
  return prisma.ptAssistanceRequest.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.kind && { kind: filters.kind }),
      ...(filters?.createdById && { createdById: filters.createdById }),
      ...(filters?.pinned != null && { isPinned: filters.pinned }),
      ...(filters?.claimedByUserId && {
        claims: { some: { profileId: filters.claimedByUserId } },
      }),
    },
    include: {
      createdBy: { select: authorSelect },
      ...claimsInclude,
      _count: { select: { comments: true } },
    },
    orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAssistanceRequestById(id: string) {
  return prisma.ptAssistanceRequest.findUnique({
    where: { id },
    include: {
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

export async function createAssistanceRequest(data: {
  title: string;
  kind: PtAssistanceKind;
  priority?: PtRequestPriority;
  description?: string;
  skillObjective?: string;
  gameBuild?: string;
  playerHandle?: string;
  timezone?: string;
  hasMicrophone?: boolean;
  availability?: string;
  assetsShips?: string;
  urgency?: string;
  groupPreference?: string;
  successCriteria?: string;
  recordingPermission?: boolean;
  materialName?: string;
  quantityNeeded?: number;
  meetingLocation?: string;
  rewardOffered?: string;
  maxClaims?: number;
  dueAt?: Date;
  createdById: string;
}) {
  return prisma.ptAssistanceRequest.create({ data });
}

export async function claimAssistanceRequest(requestId: string, userId: string) {
  const request = await prisma.ptAssistanceRequest.findUnique({
    where: { id: requestId },
    include: { _count: { select: { claims: true } } },
  });
  if (!request) throw new Error("Request not found");
  if (request._count.claims >= request.maxClaims)
    throw new Error("This request has reached its maximum number of claims");

  const [, claim] = await prisma.$transaction([
    prisma.ptAssistanceRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
    prisma.ptRequestClaim.create({
      data: { assistanceRequestId: requestId, profileId: userId },
    }),
  ]);
  return claim;
}

export async function unclaimAssistanceRequest(requestId: string, userId: string) {
  await prisma.ptRequestClaim.deleteMany({
    where: { assistanceRequestId: requestId, profileId: userId },
  });
  const remaining = await prisma.ptRequestClaim.count({
    where: { assistanceRequestId: requestId },
  });
  if (remaining === 0) {
    await prisma.ptAssistanceRequest.update({
      where: { id: requestId },
      data: { status: "OPEN", acceptedAt: null },
    });
  }
}

export async function updateAssistanceStatus(
  requestId: string,
  status: PtRequestStatus
) {
  const data: Record<string, unknown> = { status };
  if (status === "COMPLETED") data.completedAt = new Date();
  if (status === "CANCELLED") data.cancelledAt = new Date();
  return prisma.ptAssistanceRequest.update({ where: { id: requestId }, data });
}

export async function pinAssistanceRequest(requestId: string, isPinned: boolean) {
  return prisma.ptAssistanceRequest.update({
    where: { id: requestId },
    data: { isPinned },
  });
}

export async function addAssistanceComment(
  requestId: string,
  authorId: string,
  content: string,
  isLiveChat = false
) {
  return prisma.ptRequestComment.create({
    data: { assistanceRequestId: requestId, authorId, content, isLiveChat },
    include: { author: { select: authorSelect } },
  });
}
