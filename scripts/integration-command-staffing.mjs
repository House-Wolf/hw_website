import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createAuthorizer, CommandError } from "../lib/command/access.js";
import { createOperationService } from "../lib/command/operations.js";
import { createFleetService } from "../lib/command/fleetService.js";
import { createFleetRegistryService } from "../lib/command/fleetRegistryService.js";
import { createCrewService } from "../lib/command/crewService.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
const database = process.env.COMMAND_TEST_DATABASE_URL;
const url = new URL(database || "https://refuse.invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/housewolf_command_test") throw new Error("Use only the named disposable loopback database.");
const prisma = new PrismaClient({ datasources: { db: { url: database } } });
const guildId = `staffing-${randomUUID()}`;
const [officer, secondOfficer, owner, member, visitor] = Array.from({ length: 5 }, () => randomUUID());
const ids = [officer, secondOfficer, owner, member, visitor];
const roles = new Map([[officer, [PERSONNEL_ROLES.lieutenant]], [secondOfficer, [PERSONNEL_ROLES.captain]], [owner, [PERSONNEL_ROLES.member]], [member, [PERSONNEL_ROLES.member]], [visitor, [PERSONNEL_ROLES.visitor]]]);
let providerFailure = false;
const authorize = createAuthorizer({ guildId, loadAccount: (id) => prisma.user.findUnique({ where: { id } }),
  async loadMember(guild, discordId) { if (providerFailure) throw new Error("Mock outage"); const user = await prisma.user.findUnique({ where: { discordId } }); return user ? { guildId: guild, userId: discordId, roleIds: roles.get(user.id) || [] } : null; },
});
const operations = createOperationService({ prisma, authorize, preflight: async () => true, baseUrl: "https://example.test", staffingEnabled: true });
const fleet = createFleetService({ prisma, authorize }), crew = createCrewService({ prisma, authorize });
const declareShip = (actor, input) => fleet.create(actor, { requestKey: randomUUID(), ...input });
const raw = { title: "Mock crew operation", description: "Test only", entityType: "EXTERNAL", location: "Test", timezone: "UTC", startLocal: "2099-06-01T10:00", endLocal: "2099-06-01T12:00", visibility: "GUILD", recurrence: "NONE", imageData: null };
const opRow = (id) => prisma.commandOperation.findUnique({ where: { id } });
async function operation(input = raw) { const draft = await operations.create(officer, input, randomUUID()); return operations.mutate(officer, draft.id, "publish", draft.revision); }
async function change(id, action, input, actor = officer) { const op = await opRow(id); return crew.mutate(actor, id, action, op.crewRevision, action === "assign" ? { reason: "Officer reviewed preferences and staffing needs", ...input } : input); }
async function seat(id, input = {}) { const label = randomUUID(); await change(id, "addSeat", { label, role: "GROUND", ...input }); return prisma.commandSeat.findUnique({ where: { operationId_label: { operationId: id, label } } }); }
async function ship(productionState = "FLIGHT_READY") {
  let record = await declareShip(owner, { name: `Test ship ${randomUUID()}`, model: "Test verified model" });
  record = await fleet.update(officer, record.id, "verify", record.revision, { productionState, capacity: 2, evidence: "Officer inspected the owner's hangar and model source" });
  return fleet.update(owner, record.id, "update", record.revision, { name: record.name, model: record.model, externalRef: "", availability: "AVAILABLE", readiness: "READY" });
}
async function attach(id, shipId) { await change(id, "attachShip", { shipId }); return prisma.commandOperationShip.findUnique({ where: { operationId_shipId: { operationId: id, shipId } } }); }
before(async () => { await prisma.user.createMany({ data: ids.map((id, index) => ({ id, discordId: `test-${id}`, discordUsername: `Disposable crew ${index}` })) }); });
after(async () => {
  const ops = await prisma.commandOperation.findMany({ where: { guildId }, select: { id: true } }); const opIds = ops.map((op) => op.id);
  await prisma.commandCrewAssignment.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandSeat.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandOperationShip.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandQualification.deleteMany({ where: { guildId } });
  await prisma.commandShip.deleteMany({ where: { guildId } });
  await prisma.commandDelivery.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandSignup.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { targetId: { in: opIds } }] } });
  await prisma.commandOperation.deleteMany({ where: { guildId } });
  await prisma.personnelMember.deleteMany({ where: { guildId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect();
});

test("FleetYards verifies an existing owner's ship for attachment without officer ownership review", async () => {
  const vehicleId = randomUUID();
  await prisma.personnelMember.create({ data: { guildId, discordId: `test-${owner}`, rsiHandle: "RegistryOwner", membershipConfirmedAt: new Date() } });
  const declared = await declareShip(owner, { name: "Registry ship", model: "Registry model", externalRef: `fleetyards:${vehicleId}` });
  const registry = createFleetRegistryService({ prisma, authorize, loadFleet: async () => ({ sourceStatus: "complete", vehicles: [{ id: vehicleId, model: { name: "Registry model" }, owner: { rsiHandle: "registryowner" } }] }) });
  const result = await registry.sync(owner);
  assert.equal(result.verified, 1);
  const row = await prisma.commandShip.findUnique({ where: { id: declared.id } });
  assert.ok(row.verifiedAt);
  assert.equal(row.verifiedById, null);
  assert.equal(row.productionState, "UNKNOWN");
  assert.equal(row.availability, "UNAVAILABLE");
  assert.equal(row.readiness, "UNKNOWN");
  const ownFleet = await fleet.list(owner, owner);
  const listedShip = ownFleet.ships.find((ship) => ship.id === row.id);
  assert.ok(listedShip, "Selecting the owner must include the imported ship");
  assert.equal(listedShip.verificationSource, "FLEETYARDS");
  const op = await operation();
  assert.ok((await crew.view(officer, op.id)).availableShips.some((ship) => ship.id === row.id));
  const attached = await attach(op.id, row.id);
  assert.equal(attached.shipId, row.id);
  await assert.rejects(change(op.id, "consent", { operationShipId: attached.id }, owner), (error) => error.code === "SHIP_NOT_READY");
});
test("only eligible owners declare; only live officers verify; no admin/self-verification bypass", async () => {
  await assert.rejects(declareShip(visitor, { name: "Visitor", model: "Test" }), (e) => e.status === 403);
  const record = await declareShip(owner, { name: "Unverified", model: "Test" });
  await assert.rejects(fleet.update(owner, record.id, "verify", 1, { productionState: "FLIGHT_READY", capacity: 1, evidence: "Self claim" }), (e) => e.status === 403);
  const personal = await declareShip(officer, { name: "Officer personal", model: "Test" });
  await assert.rejects(fleet.update(officer, personal.id, "verify", 1, { productionState: "FLIGHT_READY", capacity: 1, evidence: "Self claim" }), (e) => e.code === "INDEPENDENT_VERIFICATION");
  providerFailure = true; await assert.rejects(declareShip(owner, { name: "Outage", model: "Test" }), (e) => e.status === 503); providerFailure = false;
});
test("repeated concurrent declaration keys persist one owned ship and do not leak another owner", async () => {
  const input = { name: "Idempotent ship", model: "Test", requestKey: randomUUID() };
  const records = await Promise.all([fleet.create(owner, input), fleet.create(owner, input)]);
  assert.equal(records[0].id, records[1].id);
  assert.equal(await prisma.commandShip.count({ where: { id: input.requestKey } }), 1);
  await assert.rejects(fleet.create(member, input), (e) => e.code === "DECLARATION_KEY_USED");
});
test("consent cannot be given by a manager and unready/concept ships never receive crew", async () => {
  const op = await operation(); const record = await ship("CONCEPT"); const attached = await attach(op.id, record.id);
  await assert.rejects(change(op.id, "consent", { operationShipId: attached.id }), (e) => e.status === 403);
  await assert.rejects(change(op.id, "consent", { operationShipId: attached.id }, owner), (e) => e.code === "SHIP_NOT_READY");
  const row = await seat(op.id, { role: "PILOT", operationShipId: attached.id });
  await operations.signup(member, op.id, "COMMITTED", "Pilot");
  await assert.rejects(change(op.id, "assign", { seatId: row.id, userId: member }), (e) => e.code === "SHIP_CONSENT_REQUIRED");
});
test("real row locks and unique indexes prevent simultaneous last-seat occupancy", async () => {
  const op = await operation(); const row = await seat(op.id);
  for (const id of [owner, member]) await operations.signup(id, op.id, "COMMITTED", "Ground");
  const current = await opRow(op.id);
  const outcomes = await Promise.allSettled([owner, member].map((id) => crew.mutate(officer, op.id, "assign", current.crewRevision, { seatId: row.id, userId: id, reason: "Officer reviewed volunteer preferences" })));
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1); assert.equal(outcomes.find((r) => r.status === "rejected").reason.status, 409);
  const winner = await prisma.commandCrewAssignment.findFirst({ where: { seatId: row.id, releasedAt: null } });
  await assert.rejects(prisma.commandCrewAssignment.create({ data: { operationId: op.id, seatId: row.id, userId: winner.userId === owner ? member : owner, assignedById: officer } }), (e) => e.code === "P2002");
  await operations.signup(winner.userId, op.id, "WITHDRAWN", "");
  assert.ok((await prisma.commandCrewAssignment.findUnique({ where: { id: winner.id } })).releasedAt);
  assert.equal((await opRow(op.id)).revision, op.revision); // Staffing does not manufacture Discord revisions.
});
test("ship capacity, owner consent, withdrawal release and ship reservation conflicts persist", async () => {
  const op = await operation(); const record = await ship(); const attached = await attach(op.id, record.id);
  const a = await seat(op.id, { operationShipId: attached.id, role: "PILOT" }); await seat(op.id, { operationShipId: attached.id, role: "ENGINEER" });
  await assert.rejects(seat(op.id, { operationShipId: attached.id }), (e) => e.code === "SHIP_CAPACITY");
  await change(op.id, "consent", { operationShipId: attached.id }, owner);
  await operations.signup(member, op.id, "COMMITTED", "Pilot"); await change(op.id, "assign", { seatId: a.id, userId: member });
  await assert.rejects(fleet.update(owner, record.id, "update", record.revision, { name: record.name, model: record.model, availability: "UNAVAILABLE", readiness: "MAINTENANCE" }), (e) => e.code === "SHIP_RESERVED");
  const other = await operation(); const another = await attach(other.id, record.id);
  await assert.rejects(change(other.id, "consent", { operationShipId: another.id }, owner), (e) => e.code === "SHIP_OVERLAP");
  await change(op.id, "withdrawConsent", { operationShipId: attached.id }, owner);
  assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: op.id, releasedAt: null } }), 0);
  assert.ok((await prisma.commandCrewAssignment.findFirst({ where: { operationId: op.id } })).releaseReason.includes("Owner withdrew"));
  await change(other.id, "consent", { operationShipId: another.id }, owner);
  await change(other.id, "withdrawConsent", { operationShipId: another.id }, owner);
  await change(op.id, "archiveSeat", { seatId: a.id, reason: "Seat requirement corrected" });
  await seat(op.id, { operationShipId: attached.id });
  assert.ok((await prisma.commandSeat.findUnique({ where: { id: a.id } })).archived);
});
test("simultaneous reservations of the same ship serialize across overlapping operations", async () => {
  const record = await ship(); const a = await operation({ ...raw, startLocal: "2099-06-02T10:00", endLocal: "2099-06-02T12:00" });
  const b = await operation({ ...raw, startLocal: "2099-06-02T11:00", endLocal: "2099-06-02T13:00" });
  const attached = [await attach(a.id, record.id), await attach(b.id, record.id)];
  const outcomes = await Promise.allSettled([a, b].map(async (op, index) => crew.mutate(owner, op.id, "consent", (await opRow(op.id)).crewRevision, { operationShipId: attached[index].id })));
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(outcomes.find((r) => r.status === "rejected").reason.code, "SHIP_OVERLAP");
  const reserved = await prisma.commandOperationShip.findMany({ where: { shipId: record.id, consentAt: { not: null } } }); assert.equal(reserved.length, 1);
  await change(reserved[0].operationId, "withdrawConsent", { operationShipId: reserved[0].id }, owner);
});
test("qualifications require independent officer evidence, expiry checks and audited revocation", async () => {
  const op = await operation(); const row = await seat(op.id, { role: "MEDIC", requiredCode: "MEDIC" });
  await operations.signup(member, op.id, "COMMITTED", "Self-reported medic");
  await assert.rejects(change(op.id, "assign", { seatId: row.id, userId: member }), (e) => e.code === "QUALIFICATION_REQUIRED");
  await assert.rejects(fleet.qualification(officer, "issue", { userId: officer, code: "MEDIC", evidence: "Self" }), (e) => e.status === 403);
  const expired = await prisma.commandQualification.create({ data: { guildId, userId: member, code: "MEDIC", issuerId: officer, evidence: "Imported old credential", expiresAt: new Date("2000-01-01") } });
  await assert.rejects(change(op.id, "assign", { seatId: row.id, userId: member }), (e) => e.code === "QUALIFICATION_REQUIRED");
  const qualification = await fleet.qualification(officer, "issue", { userId: member, code: "MEDIC", evidence: "Officer reviewed course evidence", expiresAt: "2100-01-01T00:00:00Z" });
  assert.ok((await prisma.commandQualification.findUnique({ where: { id: expired.id } })).revokedAt);
  await change(op.id, "assign", { seatId: row.id, userId: member });
  await fleet.qualification(officer, "revoke", { id: qualification.id, reason: "Evidence corrected" });
  assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: op.id, releasedAt: null } }), 0);
  assert.equal((await fleet.list(owner)).qualifications.some((q) => q.id === qualification.id), false);
});
test("member overlap and reschedule conflicts are rejected; cancellation preserves release history", async () => {
  const a = await operation(), b = await operation({ ...raw, startLocal: "2099-06-01T13:00", endLocal: "2099-06-01T15:00" });
  const one = await seat(a.id), two = await seat(b.id);
  for (const op of [a, b]) await operations.signup(member, op.id, "COMMITTED", "Ground");
  await change(a.id, "assign", { seatId: one.id, userId: member }); await change(b.id, "assign", { seatId: two.id, userId: member });
  await assert.rejects(operations.mutate(officer, b.id, "save", b.revision, { ...raw, startLocal: "2099-06-01T11:00", endLocal: "2099-06-01T14:00" }), (e) => e.code === "MEMBER_OVERLAP");
  const concurrent = await operation(); const third = await seat(concurrent.id); await operations.signup(member, concurrent.id, "COMMITTED", "Ground");
  await assert.rejects(change(concurrent.id, "assign", { seatId: third.id, userId: member }), (e) => e.code === "MEMBER_OVERLAP");
  await operations.mutate(officer, a.id, "cancel", a.revision);
  assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: a.id, releasedAt: null } }), 0);
  await operations.mutate(officer, b.id, "cancel", b.revision);
});
test("other officers, stale revisions, wrong guilds, forged role labels and suspended members cannot assign", async () => {
  const op = await operation(); const row = await seat(op.id); await operations.signup(visitor, op.id, "COMMITTED", "PILOT");
  await assert.rejects(change(op.id, "assign", { seatId: row.id, userId: visitor }), (e) => e.status === 403);
  await assert.rejects(change(op.id, "addSeat", { label: "Unauthorized", role: "GROUND" }, secondOfficer), (e) => e.status === 403);
  await assert.rejects(crew.mutate(officer, op.id, "addSeat", -1, { label: "Stale", role: "GROUND" }), (e) => e.code === "STALE_CREW_REVISION");
  await assert.rejects(crew.mutate(officer, op.id, "addSeat", (await opRow(op.id)).crewRevision, null), (e) => e.status === 422);
  const wrong = createCrewService({ prisma, authorize: async () => ({ id: officer, guildId: "other-guild", roleIds: [PERSONNEL_ROLES.lieutenant] }) });
  await assert.rejects(wrong.view(officer, op.id), (e) => e.status === 404);
  await operations.signup(member, op.id, "COMMITTED", "Ground"); await prisma.user.update({ where: { id: member }, data: { isActive: false } });
  await assert.rejects(change(op.id, "assign", { seatId: row.id, userId: member }), (e) => e.status === 403);
  await prisma.user.update({ where: { id: member }, data: { isActive: true } });
  const revoked = createCrewService({ prisma, authorize: async (id, options) => { if (options?.officer) throw new CommandError(403, "REVOKED", "Revoked"); return authorize(id); } });
  await assert.rejects(revoked.mutate(officer, op.id, "addSeat", (await opRow(op.id)).crewRevision, { label: "Revoked", role: "GROUND" }), (e) => e.status === 403);
});
test("role revoked immediately before commit rolls back the seat, revision and audit", async () => {
  const op = await operation(); let checks = 0;
  const guarded = createCrewService({ prisma, authorize: async (id, options) => {
    if (id === officer && options?.officer && ++checks === 3) throw new CommandError(403, "REVOKED", "Revoked");
    return authorize(id, options);
  } });
  const before = await prisma.auditLog.count({ where: { targetId: op.id } });
  await assert.rejects(guarded.mutate(officer, op.id, "addSeat", 0, { label: "Must rollback", role: "GROUND" }), (e) => e.status === 403);
  assert.equal(await prisma.commandSeat.count({ where: { operationId: op.id } }), 0);
  assert.equal((await opRow(op.id)).crewRevision, 0);
  assert.equal(await prisma.auditLog.count({ where: { targetId: op.id } }), before);
});
test("one member cannot hold two active seats and qualification expiry blocks a rescheduled end", async () => {
  const op = await operation();
  const a = await seat(op.id, { requiredCode: "PILOT" }), b = await seat(op.id);
  await fleet.qualification(officer, "issue", { userId: member, code: "PILOT", evidence: "Officer verified flight certification", expiresAt: "2099-06-01T12:30:00Z" });
  await operations.signup(member, op.id, "COMMITTED", "Pilot"); await change(op.id, "assign", { seatId: a.id, userId: member });
  await assert.rejects(change(op.id, "assign", { seatId: b.id, userId: member }), (e) => e.code === "MEMBER_OVERLAP");
  await assert.rejects(prisma.commandCrewAssignment.create({ data: { operationId: op.id, seatId: b.id, userId: member, assignedById: officer } }), (e) => e.code === "P2002");
  await assert.rejects(operations.mutate(officer, op.id, "save", op.revision, { ...raw, endLocal: "2099-06-01T13:00" }), (e) => e.code === "QUALIFICATION_REQUIRED");
  await operations.signup(member, op.id, "TENTATIVE", "Availability changed");
  assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: op.id, releasedAt: null } }), 0);
});
test("operational fleet and qualification evidence are private to the correct member/officers", async () => {
  await assert.rejects(fleet.list(visitor), (e) => e.status === 403);
  const record = await ship();
  assert.deepEqual((await fleet.list(member)).ships, [], "No ships load until an owner is selected");
  const publicRead = await fleet.list(member, owner);
  const visibleShip = publicRead.ships.find((s) => s.id === record.id);
  assert.ok(visibleShip, "Another member can see the selected owner's verified ship");
  assert.equal(visibleShip.evidence, undefined);
  assert.ok(publicRead.qualifications.every((q) => q.userId === member));
  const ownRead = await fleet.list(owner, owner);
  const ownShip = ownRead.ships.find((s) => s.id === record.id);
  assert.ok(ownShip, "The owner can see their selected inventory");
  assert.ok(ownShip.evidence);
  const op = await operation(); await assert.rejects(crew.view(visitor, op.id), (e) => e.status === 403);
  await seat(op.id);
  assert.ok((await crew.view(officer, op.id)).audit.length);
  assert.equal((await crew.view(member, op.id)).audit.length, 0);
});
