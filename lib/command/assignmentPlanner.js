import { createHash } from "node:crypto";
import { CommandError } from "./access.js";
import { assignmentPreview } from "./planningPolicy.js";
import { overlaps, shipReady, staffingWindow, validCredential } from "./staffingPolicy.js";

export async function buildAssignmentPreview(tx, op, wingId = null) {
  const window = staffingWindow(op.input);
  if (window.end <= Date.now() || !["PUBLISHED", "ACTIVE"].includes(op.state)) throw new CommandError(409, "STAFFING_CLOSED", "Assignment previews require a published, unfinished operation.");
  const [allSeats, locked, signups, credentials, reserves, elsewhere, wingSeats, setting, plan] = await Promise.all([
    tx.commandSeat.findMany({ where: { operationId: op.id, archived: false }, include: { operationShip: { include: { ship: { include: { owner: { select: { isActive: true } } } } } } }, orderBy: { id: "asc" } }),
    tx.commandCrewAssignment.findMany({ where: { operationId: op.id, releasedAt: null } }),
    tx.commandSignup.findMany({ where: { operationId: op.id, status: "COMMITTED", user: { isActive: true } }, orderBy: { userId: "asc" }, take: 201 }),
    tx.commandQualification.findMany({ where: { guildId: op.guildId, revokedAt: null } }),
    tx.commandReserveCrew.findMany({ where: { releasedAt: null, operation: { guildId: op.guildId, state: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } } }, include: { operation: true } }),
    tx.commandCrewAssignment.findMany({ where: { releasedAt: null, operationId: { not: op.id }, operation: { guildId: op.guildId, state: { in: ["PUBLISHED", "ACTIVE"] } } }, include: { operation: true } }),
    tx.commandWingSeat.findMany({ where: { operationId: op.id, ...(wingId ? { wingId } : {}) } }),
    tx.siteSetting.findUnique({ where: { key: `command:${op.guildId}:settings` } }),
    tx.commandOperationPlan.findUnique({ where: { operationId: op.id } }),
  ]);
  if (signups.length > 200) throw new CommandError(422, "PREVIEW_LIMIT", "Assignment previews support up to 200 committed members.");
  const seats = allSeats.filter((seat) => !locked.some((row) => row.seatId === seat.id) && (!wingId || wingSeats.some((row) => row.seatId === seat.id)));
  const candidates = signups.filter((row) => !locked.some((item) => item.userId === row.userId) && ![...reserves, ...elsewhere].some((item) => item.userId === row.userId && overlaps(window, staffingWindow(item.operation.input)))).map((person) => {
    const valid = credentials.filter((row) => row.userId === person.userId && validCredential(row, row.code, window.end));
    return { userId: person.userId, preferences: person.preferences, qualificationCodes: valid.map((row) => row.code).sort(), eligibleSeatIds: seats.filter((seat) => {
      const attached = seat.operationShip;
      return (!seat.requiredCode || valid.some((row) => row.code === seat.requiredCode)) && (!attached || (attached.consentAt && attached.consentById === attached.ship.ownerId && shipReady(attached.ship) && attached.ship.owner.isActive));
    }).map((seat) => seat.id) };
  });
  const skillWeight = setting?.value?.skillWeight ?? 50, preferenceWeight = setting?.value?.preferenceWeight ?? 50;
  const result = assignmentPreview(seats, candidates, skillWeight, preferenceWeight);
  const fingerprint = createHash("sha256").update(JSON.stringify({ operationRevision: op.revision, crewRevision: op.crewRevision, planRevision: plan?.revision ?? 0, seats: seats.map(({ id, role, requiredCode }) => ({ id, role, requiredCode })), candidates, skillWeight, preferenceWeight, result })).digest("hex");
  return { ...result, fingerprint, crewRevision: op.crewRevision, operationRevision: op.revision, lockedCount: locked.length, wingId, skillWeight, preferenceWeight };
}
