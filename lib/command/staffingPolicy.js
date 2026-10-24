import { CommandError, isOfficer } from "./access.js";
import { PERSONNEL_ROLES, SERVICE_RANKS } from "../personnel/policy.js";

export const CREW_ROLES = ["PILOT", "COPILOT", "GUNNER", "ENGINEER", "MEDIC", "TRANSPORT", "MINING", "SALVAGE", "GROUND"];
export const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const displayMember = (user) => user.discordDisplayName || user.name || user.discordUsername;
export function crewMember(actor) {
  return isOfficer(actor.roleIds) || actor.roleIds.some((id) => [PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf, ...SERVICE_RANKS.map((rank) => rank.roleId)].includes(id));
}
export function textField(value, name, max, optional = false) {
  if (typeof value !== "string" || value.length > max || (!optional && !value.trim()) || /[\u0000-\u001f\u007f]/.test(value)) throw new CommandError(422, "INVALID_INPUT", `${name} must contain ${optional ? "at most" : "1 to"} ${max} characters.`);
  return value.trim();
}
export function credentialCode(value) {
  if (typeof value !== "string" || !/^[A-Z][A-Z0-9_-]{1,39}$/.test(value)) throw new CommandError(422, "INVALID_QUALIFICATION", "Use a qualification code of 2–40 uppercase letters, numbers, underscores or hyphens.");
  return value;
}
export function shipReady(ship) {
  return !!ship.verifiedAt && ship.productionState === "FLIGHT_READY" && ship.availability === "AVAILABLE" && ship.readiness === "READY";
}
export function staffingWindow(input) {
  if (input.recurrence && input.recurrence !== "NONE") throw new CommandError(422, "OCCURRENCE_REQUIRED", "Manual staffing currently requires a one-time operation. Recurring staffing needs separate occurrence records.");
  const start = Date.parse(input.start), end = Date.parse(input.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new CommandError(422, "STAFFING_END_REQUIRED", "Set an explicit operation end time before reserving ships or assigning crew.");
  return { start, end };
}
export function overlaps(left, right) { return left.start < right.end && right.start < left.end; }
export function validCredential(qualification, requiredCode, end, now = Date.now()) {
  return qualification.code === requiredCode && !qualification.revokedAt && (!qualification.expiresAt || new Date(qualification.expiresAt).getTime() >= Math.max(end, now));
}
export async function lockSchedule(tx, guildId) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`command-staffing:${guildId}`}))::text`;
}
export async function scheduleTransaction(prisma, actor, callback) {
  try {
    return await prisma.$transaction(async (tx) => { await lockSchedule(tx, actor.guildId); return callback(tx); }, { timeout: 25000 });
  } catch (error) {
    if (error instanceof CommandError) throw error;
    if (["P2002", "P2034"].includes(error?.code)) throw new CommandError(409, "CONCURRENT_STAFFING", "The fleet or crew record changed or already exists. Reload before retrying.");
    throw error;
  }
}
export async function staffingAudit(tx, actorId, operationId, action, metadata) {
  return tx.auditLog.create({ data: { actorId, action: `COMMAND_CREW_${action}`, targetType: "CommandOperation", targetId: operationId, metadata } });
}
export async function releaseAssignments(tx, where, actorId, reason) {
  const rows = await tx.commandCrewAssignment.findMany({ where: { ...where, releasedAt: null }, select: { id: true, operationId: true } });
  if (!rows.length) return;
  await tx.commandCrewAssignment.updateMany({ where: { id: { in: rows.map((row) => row.id) }, releasedAt: null }, data: { releasedAt: new Date(), releaseReason: reason } });
  for (const operationId of new Set(rows.map((row) => row.operationId))) {
    await tx.commandOperation.update({ where: { id: operationId }, data: { crewRevision: { increment: 1 } } });
    await staffingAudit(tx, actorId, operationId, "RELEASED", { reason, assignmentIds: rows.filter((row) => row.operationId === operationId).map((row) => row.id) });
  }
}
export async function assertNoScheduleConflicts(tx, operation, input = operation.input) {
  const crews = await tx.commandCrewAssignment.findMany({ where: { operationId: operation.id, releasedAt: null }, include: { seat: true, user: { select: { isActive: true } } } });
  const ships = await tx.commandOperationShip.findMany({ where: { operationId: operation.id, consentAt: { not: null } }, include: { ship: true } });
  if (!crews.length && !ships.length) return;
  const window = staffingWindow(input);
  for (const row of crews) {
    if (!row.user.isActive) throw new CommandError(409, "INACTIVE_CREW", "Release suspended crew before changing this operation's staffing or schedule.");
    if (row.seat.requiredCode) {
      const qualifications = await tx.commandQualification.findMany({ where: { guildId: operation.guildId, userId: row.userId, code: row.seat.requiredCode, revokedAt: null } });
      if (!qualifications.some((qualification) => validCredential(qualification, row.seat.requiredCode, window.end))) throw new CommandError(422, "QUALIFICATION_REQUIRED", "A crew qualification will not remain valid through the new operation end.");
    }
  }
  if (ships.some((row) => !shipReady(row.ship))) throw new CommandError(409, "SHIP_NOT_READY", "A consenting ship is no longer ready.");
  const others = await tx.commandCrewAssignment.findMany({ where: { releasedAt: null, userId: { in: crews.map((row) => row.userId) }, operationId: { not: operation.id }, operation: { guildId: operation.guildId, state: { in: ["PUBLISHED", "ACTIVE"] } } }, include: { operation: true } });
  for (const row of others) if (overlaps(window, staffingWindow(row.operation.input))) throw new CommandError(409, "MEMBER_OVERLAP", "A crew member is assigned to an overlapping operation.");
  const reservations = await tx.commandOperationShip.findMany({ where: { shipId: { in: ships.map((row) => row.shipId) }, consentAt: { not: null }, operationId: { not: operation.id }, operation: { guildId: operation.guildId, state: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } } }, include: { operation: true } });
  for (const row of reservations) if (overlaps(window, staffingWindow(row.operation.input))) throw new CommandError(409, "SHIP_OVERLAP", "A consenting ship is reserved for an overlapping operation.");
}
