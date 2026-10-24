import { CommandError, isOfficer } from "./access.js";
import { crewMember, textField, credentialCode, uuid, scheduleTransaction, releaseAssignments, displayMember } from "./staffingPolicy.js";
const memberSelect = { id: true, name: true, discordDisplayName: true, discordUsername: true };
/** @param {any} adapters */
export function createFleetService(adapters) {
  const { prisma, authorize, refreshProduction = async () => ({ status: "unavailable", updated: 0 }) } = adapters;
  const audit = (tx, actor, action, id, metadata) => tx.auditLog.create({ data: { actorId: actor.id, action: `COMMAND_FLEET_${action}`, targetType: "CommandShip", targetId: id, metadata } });
  async function loadShip(tx, actor, id) {
    if (!uuid(id)) throw new CommandError(404, "NOT_FOUND", "Ship not found.");
    const ship = await tx.commandShip.findFirst({ where: { id, guildId: actor.guildId } });
    if (!ship) throw new CommandError(404, "NOT_FOUND", "Ship not found.");
    return ship;
  }
  return {
    async list(userId, ownerId = "") {
      const actor = await authorize(userId);
      if (!crewMember(actor)) throw new CommandError(403, "MEMBER_REQUIRED", "Current House Wolf membership is required to view operational fleet records.");
      if (ownerId && !uuid(ownerId)) throw new CommandError(422, "INVALID_OWNER", "Select a valid ship owner.");
      const productionSync = await refreshProduction(actor);
      const officer = isOfficer(actor.roleIds);
      const owners = (await prisma.user.findMany({ where: { isActive: true }, select: memberSelect })).map((user) => ({ id: user.id, name: displayMember(user) })).sort((a, b) => a.name.localeCompare(b.name));
      const rows = ownerId ? await prisma.commandShip.findMany({ where: { guildId: actor.guildId, ownerId, ...(!officer ? { OR: [{ ownerId: userId }, { verifiedAt: { not: null } }] } : {}) }, include: { owner: { select: memberSelect } }, orderBy: [{ name: "asc" }, { id: "asc" }] }) : [];
      const qualifications = await prisma.commandQualification.findMany({ where: { guildId: actor.guildId, ...(officer ? {} : { userId }) }, include: { user: { select: memberSelect } }, orderBy: { issuedAt: "desc" }, take: 200 });
      return { officer, owners, selectedOwnerId: ownerId, productionSync, userId: actor.id, checkedAt: new Date().toISOString(), ships: rows.map((row) => ({ ...row, verificationSource: row.verifiedAt ? (row.verifiedById ? "OFFICER" : row.evidence.startsWith("FleetYards ownership:") ? "FLEETYARDS" : "UNKNOWN") : null, ownerName: displayMember(row.owner), evidence: officer || row.ownerId === userId ? row.evidence : undefined, owner: undefined })), qualifications: qualifications.map((row) => ({ ...row, memberName: displayMember(row.user), user: undefined })) };
    },
    async directory(userId, query) {
      await authorize(userId, { officer: true });
      const search = textField(query || "", "Search", 80, true);
      return (await prisma.user.findMany({ where: { isActive: true, OR: ["discordUsername", "discordDisplayName", "name"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) }, select: memberSelect, take: 30, orderBy: { discordUsername: "asc" } })).map((user) => ({ id: user.id, name: displayMember(user) }));
    },
    async create(userId, raw) {
      const actor = await authorize(userId);
      if (!crewMember(actor)) throw new CommandError(403, "MEMBER_REQUIRED", "Verified House Wolf membership is required to declare an operational ship.");
      const name = textField(raw?.name, "Ship name", 100), model = textField(raw?.model, "Model", 100);
      if (!uuid(raw?.requestKey)) throw new CommandError(422, "IDEMPOTENCY_REQUIRED", "A declaration request key is required.");
      const externalRef = textField(raw?.externalRef || "", "FleetYards/ownership reference", 200, true) || null;
      return scheduleTransaction(prisma, actor, async (tx) => {
        const previous = await tx.commandShip.findUnique({ where: { id: raw.requestKey } });
        if (previous) {
          if (previous.guildId !== actor.guildId || previous.ownerId !== actor.id) throw new CommandError(409, "DECLARATION_KEY_USED", "This declaration key is already used. Start a new declaration.");
          const fresh = await authorize(userId);
          if (!crewMember(fresh)) throw new CommandError(403, "MEMBER_REQUIRED", "Current House Wolf membership is required.");
          return previous;
        }
        const ship = await tx.commandShip.create({ data: { id: raw.requestKey, guildId: actor.guildId, ownerId: actor.id, name, model, externalRef } });
        await audit(tx, actor, "DECLARED", ship.id, { model, externalRef });
        const fresh = await authorize(userId);
        if (!crewMember(fresh)) throw new CommandError(403, "MEMBER_REQUIRED", "Membership changed before the declaration could be saved.");
        return ship;
      });
    },
    async update(userId, id, action, revision, raw) {
      const actor = await authorize(userId, { officer: action === "verify" });
      return scheduleTransaction(prisma, actor, async (tx) => {
        const ship = await loadShip(tx, actor, id);
        if (ship.revision !== revision) throw new CommandError(409, "STALE_REVISION", "Ship changed. Reload before saving.");
        let data;
        if (action === "verify") {
          if (ship.ownerId === actor.id) throw new CommandError(403, "INDEPENDENT_VERIFICATION", "Another officer must verify your ship ownership and model.");
          const owner = await authorize(ship.ownerId);
          if (!crewMember(owner)) throw new CommandError(403, "OWNER_INELIGIBLE", "The owner is not a current eligible member.");
          if (!["FLIGHT_READY", "CONCEPT", "UNKNOWN"].includes(raw?.productionState) || !Number.isInteger(raw?.capacity) || raw.capacity < 1 || raw.capacity > 100) throw new CommandError(422, "INVALID_VERIFICATION", "Select model production state and a crew capacity between 1 and 100.");
          data = { productionState: raw.productionState, capacity: raw.capacity, evidence: textField(raw.evidence, "Ownership/model evidence", 1000), verifiedAt: new Date(), verifiedById: actor.id };
        } else if (action === "update") {
          if (ship.ownerId !== actor.id) throw new CommandError(403, "OWNER_REQUIRED", "Only the owner may change this ship's declaration or availability.");
          if (!["AVAILABLE", "UNAVAILABLE"].includes(raw?.availability) || !["READY", "MAINTENANCE", "UNKNOWN"].includes(raw?.readiness)) throw new CommandError(422, "INVALID_READINESS", "Select availability and declared readiness.");
          const model = textField(raw.model, "Model", 100), externalRef = textField(raw.externalRef || "", "FleetYards/ownership reference", 200, true) || null;
          data = { name: textField(raw.name, "Ship name", 100), model, externalRef, availability: raw.availability, readiness: raw.readiness };
          if (model !== ship.model || externalRef !== ship.externalRef) Object.assign(data, { verifiedAt: null, verifiedById: null, productionState: "UNKNOWN", evidence: "" });
        } else throw new CommandError(422, "INVALID_ACTION", "Choose update or verify.");
        const next = { ...ship, ...data };
        const reserved = await tx.commandOperationShip.count({ where: { shipId: id, consentAt: { not: null }, operation: { state: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } } } });
        if (reserved && (!next.verifiedAt || next.productionState !== "FLIGHT_READY" || next.availability !== "AVAILABLE" || next.readiness !== "READY" || next.capacity < ship.capacity)) throw new CommandError(409, "SHIP_RESERVED", "Withdraw operation consent before changing a reserved ship's model, capacity or readiness.");
        const saved = await tx.commandShip.update({ where: { id }, data: { ...data, revision: { increment: 1 } } });
        await audit(tx, actor, action.toUpperCase(), id, { revision: saved.revision, productionState: saved.productionState });
        await authorize(userId, { officer: action === "verify" }); return saved;
      });
    },
    async qualification(userId, action, raw) {
      const actor = await authorize(userId, { officer: true });
      return scheduleTransaction(prisma, actor, async (tx) => {
        if (action === "issue") {
          if (!uuid(raw?.userId)) throw new CommandError(422, "INVALID_MEMBER", "Select a member.");
          if (raw.userId === actor.id) throw new CommandError(403, "INDEPENDENT_VERIFICATION", "Another officer must verify your qualification.");
          const member = await authorize(raw.userId);
          if (!crewMember(member)) throw new CommandError(403, "MEMBER_REQUIRED", "Current eligible membership is required.");
          const code = credentialCode(raw.code), evidence = textField(raw.evidence, "Qualification evidence", 1000);
          const expiresAt = raw.expiresAt ? new Date(raw.expiresAt) : null;
          if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) throw new CommandError(422, "INVALID_EXPIRY", "Qualification expiry must be in the future.");
          const previous = await tx.commandQualification.findFirst({ where: { guildId: actor.guildId, userId: raw.userId, code, revokedAt: null } });
          if (previous && (!previous.expiresAt || previous.expiresAt > new Date())) throw new CommandError(409, "ALREADY_QUALIFIED", "An active qualification already exists. Revoke it with a reason before correcting it.");
          if (previous) await tx.commandQualification.update({ where: { id: previous.id }, data: { revokedAt: new Date(), revokeReason: "Expired credential renewed" } });
          const saved = await tx.commandQualification.create({ data: { guildId: actor.guildId, userId: raw.userId, issuerId: actor.id, code, evidence, expiresAt } });
          await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_QUALIFICATION_ISSUED", targetType: "CommandQualification", targetId: saved.id, metadata: { userId: raw.userId, code, previousId: previous?.id || null } } });
          await authorize(userId, { officer: true }); return saved;
        }
        if (action !== "revoke" || !uuid(raw?.id)) throw new CommandError(422, "INVALID_ACTION", "Choose issue or revoke.");
        const row = await tx.commandQualification.findFirst({ where: { id: raw.id, guildId: actor.guildId, revokedAt: null } });
        if (!row) throw new CommandError(404, "NOT_FOUND", "Active qualification not found.");
        const reason = textField(raw.reason, "Revocation reason", 500);
        const saved = await tx.commandQualification.update({ where: { id: row.id }, data: { revokedAt: new Date(), revokeReason: reason } });
        await releaseAssignments(tx, { userId: row.userId, operation: { guildId: actor.guildId }, seat: { requiredCode: row.code } }, actor.id, `Qualification ${row.code} revoked: ${reason}`);
        await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_QUALIFICATION_REVOKED", targetType: "CommandQualification", targetId: row.id, metadata: { code: row.code, reason } } });
        await authorize(userId, { officer: true }); return saved;
      });
    },
  };
}
