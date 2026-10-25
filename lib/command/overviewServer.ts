import "server-only";
import { prisma } from "@/lib/prisma";
import { getPublicFleetData } from "@/lib/fleetyards/client";
import { RANK_PRIORITY } from "@/lib/role-constants";
import { OFFICER_ROLE_IDS, PERSONNEL_ROLES, SERVICE_RANKS } from "@/lib/personnel/policy.js";
import { authorize } from "./server";
import { isOfficer } from "./access.js";
import { operationOverviewStatistics, type OperationsOverview, type OverviewOperation } from "./overview";

export async function getOperationsOverview(userId: string, at = new Date()): Promise<OperationsOverview> {
  const actor = await authorize(userId);
  const leadership = isOfficer(actor.roleIds);
  const memberRoles = [...new Set([PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf, ...OFFICER_ROLE_IDS, ...SERVICE_RANKS.map(rank => rank.roleId)])];
  const memberWhere = { isActive: true, roles: { some: { discordRoleId: { in: memberRoles } } } };
  const monthStart = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const fleetSlug = process.env.NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG;
  // Select just chart/briefing fields, excluding potentially large event-cover data.
  // This visibility predicate matches operationService.list for ordinary members.
  const [rows, total, newThisMonth, recentMembers, recentActivity, fleetResult] = await Promise.all([
    prisma.$queryRaw<OverviewOperation[]>`
      SELECT id, input->>'title' AS title, input->>'start' AS start, state, "createdAt"
      FROM command_operations WHERE "guildId" = ${actor.guildId}
      AND (${leadership} OR (state <> 'DRAFT' AND input->>'visibility' = 'GUILD'))`,
    prisma.user.count({ where: memberWhere }),
    prisma.user.count({ where: { ...memberWhere, createdAt: { gte: monthStart, lte: at } } }),
    leadership ? prisma.user.findMany({ where: memberWhere, orderBy: { createdAt: "desc" }, take: 5,
      select: { discordDisplayName: true, discordUsername: true, name: true, createdAt: true,
        roles: { select: { discordRole: { select: { name: true } } } } } }) : Promise.resolve([]),
    prisma.$queryRaw<{ id: number; operationId: string; title: string | null; action: string; at: Date; actor: string | null }[]>`
      SELECT a.id, o.id AS "operationId", o.input->>'title' AS title, a.action, a.created_at AS at,
        COALESCE(u.discord_display_name, u.name, u.discord_username) AS actor
      FROM audit_logs a JOIN command_operations o ON a.target_id = o.id::text
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE o."guildId" = ${actor.guildId} AND a.target_type = 'CommandOperation'
      AND a.action LIKE 'COMMAND_OPERATION_%'
      AND (${leadership} OR (o.state <> 'DRAFT' AND o.input->>'visibility' = 'GUILD'))
      ORDER BY a.created_at DESC, a.id DESC LIMIT 6`,
    fleetSlug ? getPublicFleetData(fleetSlug).catch(() => null) : Promise.resolve(null),
  ]);
  let reliability: OperationsOverview["reliability"] = { value: null, description: "Reliability will be available once mission attendance is recorded." };
  if (leadership && process.env.COMMAND_ATTENDANCE_ENABLED === "true") {
    const counts = await prisma.commandAttendance.groupBy({ by: ["status"], where: { debrief: { finalizedAt: { not: null }, operation: { guildId: actor.guildId, state: { in: ["COMPLETED", "ARCHIVED"] } } } }, _count: true });
    const present = counts.find((row) => row.status === "PRESENT")?._count ?? 0;
    const absent = counts.find((row) => row.status === "ABSENT")?._count ?? 0;
    const excused = counts.find((row) => row.status === "EXCUSED")?._count ?? 0;
    reliability = { value: present + absent ? Math.round(100 * present / (present + absent)) : null, description: `${present} present / ${present + absent} expected across finalized attendance records. ${excused} excused absences excluded.` };
  }
  return {
    generatedAt: at.toISOString(), leadership,
    members: { total, newThisMonth },
    ...operationOverviewStatistics(rows, at),
    fleet: { total: fleetResult && fleetResult.sourceStatus !== "unavailable" ? fleetResult.vehicles.length : null,
      status: fleetResult?.sourceStatus ?? "unavailable" },
    reliability,
    recentMembers: recentMembers.map(member => {
      const names = new Set(member.roles.map(role => role.discordRole.name));
      return { name: member.discordDisplayName || member.name || member.discordUsername, rank: RANK_PRIORITY.find(rank => names.has(rank)) || "Member", joinedAt: member.createdAt.toISOString() };
    }),
    recentActivity: recentActivity.map(activity => ({ ...activity, title: activity.title || "Untitled operation", at: activity.at.toISOString(), actor: activity.actor || "House Wolf command" })),
  };
}
