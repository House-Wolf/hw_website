import { CommandError, isOfficer, mayManageOperation } from "./access.js";
import { assertReserveAvailability } from "./planningPolicy.js";
import { buildAssignmentPreview } from "./assignmentPlanner.js";
import { lockOperation } from "./operations.js";
import { CREW_ROLES, uuid, textField, credentialCode, crewMember, displayMember, shipReady, staffingWindow, validCredential, overlaps, staffingAudit, releaseAssignments, scheduleTransaction, assertNoScheduleConflicts } from "./staffingPolicy.js";

const names = { id: true, name: true, discordDisplayName: true, discordUsername: true, discordId: true, isActive: true };
/** @param {any} adapters */
export function createCrewService(adapters) {
  const { prisma, authorize, advanced = false, interests = null, refreshProduction = async () => {} } = adapters;
  async function managed(tx, userId, id, revision) {
    const actor = await authorize(userId, { officer: true });
    const op = await lockOperation(tx, id, actor.guildId);
    if (!mayManageOperation(actor, op)) throw new CommandError(403, "MANAGER_REQUIRED", "A current operation manager or Clan Warlord must make this change.");
    if (!["DRAFT", "PUBLISHED", "ACTIVE"].includes(op.state)) throw new CommandError(409, "STAFFING_CLOSED", "This operation's staffing is closed.");
    if (!Number.isInteger(revision) || op.crewRevision !== revision) throw new CommandError(409, "STALE_CREW_REVISION", "Crew changed. Reload before saving.");
    return { actor, op };
  }
  async function finish(tx, actor, op, action, metadata) {
    await staffingAudit(tx, actor.id, op.id, action, metadata);
    const fresh = await authorize(actor.id, { officer: true });
    if (!mayManageOperation(fresh, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Operation management authority changed.");
    const saved = await tx.commandOperation.update({ where: { id: op.id }, data: { crewRevision: { increment: 1 } } });
    return { crewRevision: saved.crewRevision };
  }
  async function assignOne(tx, actor, op, raw) {
    const operationId = op.id;
    if (!["PUBLISHED", "ACTIVE"].includes(op.state)) throw new CommandError(409, "STAFFING_CLOSED", "Publish the operation before assigning crew.");
    const window = staffingWindow(op.input);
    if (window.end <= Date.now()) throw new CommandError(409, "STAFFING_CLOSED", "The operation has already ended.");
    if (!uuid(raw.seatId) || (!uuid(raw.userId) && !(interests && /^discord:\d{17,20}$/.test(raw.userId)))) throw new CommandError(422, "INVALID_ASSIGNMENT", "Choose a seat and eligible crew member.");
    const seat = await tx.commandSeat.findFirst({ where: { id: raw.seatId, operationId, archived: false }, include: { operationShip: { include: { ship: true } } } });
    if (!seat) throw new CommandError(404, "NOT_FOUND", "Seat not found.");
    if (raw.userId.startsWith("discord:")) raw = { ...raw, userId: await interests.confirm(tx, actor, op, raw.userId) };
    const target = interests ? await interests.authorizeMember(tx, raw.userId, op.guildId) : await authorize(raw.userId);
    if (!crewMember(target)) throw new CommandError(403, "MEMBER_INELIGIBLE", "A current eligible House Wolf member is required for crew assignment.");
    const signup = await tx.commandSignup.findUnique({ where: { operationId_userId: { operationId, userId: raw.userId } } });
    if (signup?.status !== "COMMITTED") throw new CommandError(422, "COMMITMENT_REQUIRED", "The member must explicitly commit before assignment.");
    if (seat.requiredCode) {
      const credentials = await tx.commandQualification.findMany({ where: { guildId: actor.guildId, userId: raw.userId, code: seat.requiredCode, revokedAt: null } });
      if (!credentials.some((row) => validCredential(row, seat.requiredCode, window.end))) throw new CommandError(422, "QUALIFICATION_REQUIRED", "The seat requires a verified qualification valid through operation end.");
    }
    if (seat.operationShip) {
      const attached = seat.operationShip;
      if (!attached.consentAt || attached.consentById !== attached.ship.ownerId || !shipReady(attached.ship)) throw new CommandError(422, "SHIP_CONSENT_REQUIRED", "A ready verified ship and its owner's explicit operation consent are required.");
      const owner = await authorize(attached.ship.ownerId);
      if (!crewMember(owner)) throw new CommandError(403, "OWNER_INELIGIBLE", "The ship owner is not currently an eligible member.");
    }
    const existing = await tx.commandCrewAssignment.findFirst({ where: { operationId, seatId: seat.id, releasedAt: null } });
    if (existing) throw new CommandError(409, "SEAT_OCCUPIED", "Release the existing assignment before transferring this seat.");
    const others = await tx.commandCrewAssignment.findMany({ where: { userId: raw.userId, releasedAt: null, operation: { guildId: actor.guildId, state: { in: ["PUBLISHED", "ACTIVE"] } } }, include: { operation: true } });
    if (others.some((row) => row.operationId === operationId || overlaps(window, staffingWindow(row.operation.input)))) throw new CommandError(409, "MEMBER_OVERLAP", "The member already has a seat or an overlapping assignment.");
    textField(raw.reason, "Manual assignment reason", 500);
    if (advanced) await assertReserveAvailability(tx, op, raw.userId);
    const assignment = await tx.commandCrewAssignment.create({ data: { operationId, seatId: seat.id, userId: raw.userId, assignedById: actor.id } });
    await assertNoScheduleConflicts(tx, op);
    const freshTarget = interests ? await interests.authorizeMember(tx, raw.userId, op.guildId) : await authorize(raw.userId);
    if (!crewMember(freshTarget)) throw new CommandError(403, "MEMBER_INELIGIBLE", "Membership changed before assignment could be saved.");
    return assignment;
  }
  return {
    async view(userId, id) {
      const actor = await authorize(userId);
      if (!crewMember(actor)) throw new CommandError(403, "MEMBER_REQUIRED", "Current House Wolf membership is required to view operation crew records.");
      await refreshProduction(actor);
      if (!uuid(id)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const op = await prisma.commandOperation.findFirst({ where: { id, guildId: actor.guildId } });
      if (!op || ((op.input.visibility !== "GUILD" || op.state === "DRAFT") && !isOfficer(actor.roleIds))) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const canManage = mayManageOperation(actor, op);
      const [ships, seats, assignments, signups, available, pendingVerification] = await Promise.all([
        prisma.commandOperationShip.findMany({ where: { operationId: id }, include: { ship: { include: { owner: { select: names } } } }, orderBy: { id: "asc" } }),
        prisma.commandSeat.findMany({ where: { operationId: id, archived: false }, orderBy: { label: "asc" } }),
        prisma.commandCrewAssignment.findMany({ where: { operationId: id, ...(canManage ? {} : { releasedAt: null }) }, include: { user: { select: names } }, orderBy: { createdAt: "desc" }, take: 200 }),
        canManage ? prisma.commandSignup.findMany({ where: { operationId: id, status: "COMMITTED", user: { isActive: true } }, include: { user: { select: names } } }) : Promise.resolve([]),
        canManage ? prisma.commandShip.findMany({ where: { guildId: actor.guildId, verifiedAt: { not: null }, owner: { isActive: true } }, include: { owner: { select: names } }, take: 200, orderBy: { name: "asc" } }) : Promise.resolve([]),
        canManage ? prisma.commandShip.count({ where: { guildId: actor.guildId, verifiedAt: null, owner: { isActive: true } } }) : Promise.resolve(0),
      ]);
      const interested = interests && canManage ? await interests.candidates(actor, op) : { members: [], supported: false, checkedAt: null, nextRefreshAt: null };
      const qualifiers = canManage ? await prisma.commandQualification.findMany({ where: { guildId: actor.guildId, userId: { in: signups.map((row) => row.userId) }, revokedAt: null }, select: { userId: true, code: true, expiresAt: true } }) : [];
      const audit = canManage ? await prisma.auditLog.findMany({ where: { targetType: "CommandOperation", targetId: id, action: { startsWith: "COMMAND_CREW_" } }, include: { actor: { select: names } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 }) : [];
      return { userId, canManage, crewRevision: op.crewRevision, state: op.state, roles: CREW_ROLES, pendingVerification,
        ships: ships.map((row) => ({ id: row.id, shipId: row.shipId, ownerId: row.ship.ownerId, name: row.ship.name, model: row.ship.model, capacity: row.ship.capacity, ready: shipReady(row.ship) && row.ship.owner.isActive, consentAt: row.consentAt, ownerName: displayMember(row.ship.owner) })), seats,
        assignments: assignments.map((row) => ({ id: row.id, seatId: row.seatId, userId: row.userId, memberName: displayMember(row.user), releasedAt: row.releasedAt, releaseReason: canManage ? row.releaseReason : undefined })),
        candidates: [...signups.map((row) => ({ userId: row.userId, name: displayMember(row.user), source: row.source || "WEBSITE", preferences: row.preferences, qualifications: qualifiers.filter((q) => q.userId === row.userId) })), ...interested.members.filter(member => !signups.some(signup => signup.user.discordId === member.discordId))],
        discordInterest: { supported: interested.supported, checkedAt: interested.checkedAt, nextRefreshAt: interested.nextRefreshAt, count: interested.members.length },
        availableShips: available.map((ship) => ({ id: ship.id, name: ship.name, model: ship.model, ready: shipReady(ship), ownerName: displayMember(ship.owner) })),
        audit: audit.map((row) => ({ id: row.id, action: row.action.replace("COMMAND_CREW_", "").replaceAll("_", " "), at: row.createdAt, actor: row.actor ? displayMember(row.actor) : "House Wolf command", reason: typeof row.metadata?.reason === "string" ? row.metadata.reason : null })),
      };
    },
    async mutate(userId, operationId, action, revision, raw = {}) {
      if (action === "syncInterested") {
        if (!interests) throw new CommandError(503, "INTERESTED_DISABLED", "Discord Interested syncing is not available.");
        return interests.refresh(userId, operationId);
      }
      const caller = await authorize(userId, { officer: action !== "consent" && action !== "withdrawConsent" });
      if (crewMember(caller)) await refreshProduction(caller);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CommandError(422, "INVALID_INPUT", "Submit crew action fields as an object.");
      return scheduleTransaction(prisma, caller, async (tx) => {
        if (action === "consent" || action === "withdrawConsent") {
          const op = await lockOperation(tx, operationId, caller.guildId);
          if (!["DRAFT", "PUBLISHED", "ACTIVE"].includes(op.state) || op.crewRevision !== revision) throw new CommandError(409, "STALE_CREW_REVISION", "Staffing changed or is closed. Reload before saving consent.");
          if ((op.input.visibility !== "GUILD" || op.state === "DRAFT") && !isOfficer(caller.roleIds)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
          if (!uuid(raw.operationShipId)) throw new CommandError(404, "NOT_FOUND", "Operation ship not found.");
          const attached = await tx.commandOperationShip.findFirst({ where: { id: raw.operationShipId, operationId }, include: { ship: true } });
          if (!attached || attached.ship.guildId !== caller.guildId) throw new CommandError(404, "NOT_FOUND", "Operation ship not found.");
          if (attached.ship.ownerId !== caller.id) throw new CommandError(403, "OWNER_CONSENT_REQUIRED", "Only the actual ship owner may give or withdraw consent.");
          if (action === "consent") {
            if (!crewMember(caller) || !shipReady(attached.ship)) throw new CommandError(422, "SHIP_NOT_READY", "Verified ownership, flight-ready model, owner availability and READY attestation are required.");
            const window = staffingWindow(op.input);
            if (window.end <= Date.now()) throw new CommandError(409, "STAFFING_CLOSED", "The operation has already ended.");
            const seats = await tx.commandSeat.count({ where: { operationShipId: attached.id, archived: false } });
            if (seats > attached.ship.capacity) throw new CommandError(409, "SHIP_CAPACITY", "Review this ship's seats before granting consent; its verified capacity is lower.");
            await tx.commandOperationShip.update({ where: { id: attached.id }, data: { consentAt: new Date(), consentById: caller.id } });
            await assertNoScheduleConflicts(tx, op);
          } else {
            await tx.commandOperationShip.update({ where: { id: attached.id }, data: { consentAt: null, consentById: null } });
            await releaseAssignments(tx, { operationId, seat: { operationShipId: attached.id } }, caller.id, "Owner withdrew ship consent");
          }
          await staffingAudit(tx, caller.id, operationId, action === "consent" ? "OWNER_CONSENT" : "OWNER_WITHDRAWAL", { operationShipId: attached.id });
          const freshOwner = await authorize(userId);
          if (action === "consent" && !crewMember(freshOwner)) throw new CommandError(403, "OWNER_INELIGIBLE", "Membership changed before consent could be saved.");
          return tx.commandOperation.update({ where: { id: operationId }, data: { crewRevision: { increment: 1 } }, select: { crewRevision: true } });
        }
        const { actor, op } = await managed(tx, userId, operationId, revision);
        if (action === "attachShip") {
          if (!uuid(raw.shipId)) throw new CommandError(422, "INVALID_SHIP", "Choose a verified ship.");
          const ship = await tx.commandShip.findFirst({ where: { id: raw.shipId, guildId: actor.guildId, verifiedAt: { not: null } } });
          if (!ship) throw new CommandError(404, "NOT_FOUND", "Verified ship not found.");
          await tx.commandOperationShip.create({ data: { operationId, shipId: ship.id } });
          return finish(tx, actor, op, "SHIP_ATTACHED", { shipId: ship.id });
        }
        if (action === "addSeat") {
          const label = textField(raw.label, "Seat label", 80);
          if (!CREW_ROLES.includes(raw.role)) throw new CommandError(422, "INVALID_ROLE", "Choose an operational role; it does not grant a Discord/security role.");
          const requiredCode = raw.requiredCode ? credentialCode(raw.requiredCode) : null;
          let operationShipId = null;
          if (raw.operationShipId) {
            if (!uuid(raw.operationShipId)) throw new CommandError(422, "INVALID_SHIP", "Choose an attached operation ship.");
            const attached = await tx.commandOperationShip.findFirst({ where: { id: raw.operationShipId, operationId }, include: { ship: true } });
            if (!attached || attached.ship.guildId !== actor.guildId) throw new CommandError(404, "NOT_FOUND", "Operation ship not found.");
            const count = await tx.commandSeat.count({ where: { operationShipId: attached.id, archived: false } });
            if (count >= attached.ship.capacity) throw new CommandError(409, "SHIP_CAPACITY", "The ship's verified crew capacity is full.");
            operationShipId = attached.id;
          }
          const seat = await tx.commandSeat.create({ data: { operationId, operationShipId, label, role: raw.role, requiredCode } });
          return finish(tx, actor, op, "SEAT_CREATED", { seatId: seat.id, role: raw.role });
        }
        if (action === "assign" || action === "activateReserve" || action === "transfer") {
          let prior = null;
          if (action !== "assign" && !advanced) throw new CommandError(503, "ADVANCED_DISABLED", "Advanced staffing is not enabled.");
          if (action === "activateReserve") {
            const row = uuid(raw.reserveId) ? await tx.commandReserveCrew.findFirst({ where: { id: raw.reserveId, operationId, releasedAt: null } }) : null;
            if (!row) throw new CommandError(404, "NOT_FOUND", "Active reserve not found.");
            const reason = textField(raw.reason, "Activation reason", 500);
            const signup = await tx.commandSignup.findUnique({ where: { operationId_userId: { operationId, userId: row.userId } } });
            if (signup?.status === "RESERVE") {
              const plan = await tx.commandOperationPlan.findUnique({ where: { operationId } });
              const count = await tx.commandSignup.count({ where: { operationId, status: "COMMITTED" } });
              const first = await tx.commandOperationWaitlist.findFirst({ where: { operationId }, orderBy: [{ queuedAt: "asc" }, { userId: "asc" }] });
              if (plan?.capacity != null && count >= plan.capacity) throw new CommandError(409, "CAPACITY_FULL", "Free a committed place before activating a reserve.");
              if (first && first.userId !== row.userId) throw new CommandError(409, "WAITLIST_ORDER", "The next waitlisted member must receive the available place first.");
              await tx.commandSignup.update({ where: { operationId_userId: { operationId, userId: row.userId } }, data: { status: "COMMITTED" } });
              await tx.commandOperationWaitlist.deleteMany({ where: { operationId, userId: row.userId } });
            }
            await tx.commandReserveCrew.update({ where: { id: row.id }, data: { releasedAt: new Date(), releaseReason: `Activated: ${reason}` } });
            raw = { ...raw, userId: row.userId, seatId: raw.seatId || row.seatId };
            prior = row.id;
          } else if (action === "transfer") {
            const row = uuid(raw.assignmentId) ? await tx.commandCrewAssignment.findFirst({ where: { id: raw.assignmentId, operationId, releasedAt: null } }) : null;
            if (!row) throw new CommandError(404, "NOT_FOUND", "Active assignment not found.");
            await tx.commandCrewAssignment.update({ where: { id: row.id }, data: { releasedAt: new Date(), releaseReason: `Transfer: ${textField(raw.reason, "Transfer reason", 500)}` } });
            raw = { ...raw, userId: row.userId }; prior = row.id;
          }
          const assignment = await assignOne(tx, actor, op, raw);
          return finish(tx, actor, op, action === "assign" ? "ASSIGNED" : action.toUpperCase(), { assignmentId: assignment.id, priorId: prior, reason: raw.reason });
        }
        if (action === "assignMany") {
          if (!advanced) throw new CommandError(503, "ADVANCED_DISABLED", "Advanced staffing is not enabled.");
          const preview = await buildAssignmentPreview(tx, op, raw.wingId || null);
          if (!preview.assignments.length || typeof raw.fingerprint !== "string" || preview.fingerprint !== raw.fingerprint) throw new CommandError(409, "STALE_PREVIEW", "The assignment preview changed or has no eligible assignments. Preview again before applying.");
          const reason = textField(raw.reason, "Approval reason", 500);
          const assignments = [];
          for (const row of preview.assignments) assignments.push(await assignOne(tx, actor, op, { ...row, reason }));
          return finish(tx, actor, op, "PREVIEW_APPLIED", { assignmentIds: assignments.map((row) => row.id), reason, fingerprint: preview.fingerprint });
        }

        if (action === "archiveSeat") {
          if (!uuid(raw.seatId)) throw new CommandError(422, "INVALID_SEAT", "Choose a current seat.");
          const seat = await tx.commandSeat.findFirst({ where: { id: raw.seatId, operationId, archived: false } });
          if (!seat) throw new CommandError(404, "NOT_FOUND", "Current seat not found.");
          const reason = textField(raw.reason, "Seat archive reason", 500);
          if (advanced) await tx.commandReserveCrew.updateMany({ where: { operationId, seatId: raw.seatId, releasedAt: null }, data: { releasedAt: new Date(), releaseReason: "Seat archived" } });
          await releaseAssignments(tx, { operationId, seatId: seat.id }, actor.id, `Seat ${seat.label} archived: ${reason}`);
          await tx.commandSeat.update({ where: { id: seat.id }, data: { archived: true } });
          return finish(tx, actor, op, "SEAT_ARCHIVED", { seatId: seat.id, label: seat.label, reason });
        }
        if (action === "release") {
          if (!uuid(raw.assignmentId)) throw new CommandError(422, "INVALID_ASSIGNMENT", "Choose an active assignment.");
          const row = await tx.commandCrewAssignment.findFirst({ where: { id: raw.assignmentId, operationId, releasedAt: null } });
          if (!row) throw new CommandError(404, "NOT_FOUND", "Active assignment not found.");
          await releaseAssignments(tx, { id: row.id, operationId }, actor.id, textField(raw.reason, "Release reason", 500));
          return finish(tx, actor, op, "MANAGER_RELEASE", { assignmentId: row.id });
        }
        throw new CommandError(422, "INVALID_ACTION", "Choose a supported crew action.");
      });
    },
  };
}
