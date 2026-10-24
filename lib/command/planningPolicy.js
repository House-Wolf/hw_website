import { CommandError } from "./access.js";
import { crewMember, overlaps, staffingWindow, validCredential } from "./staffingPolicy.js";

export function validatePlan(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => !["capacity", "waitlistEnabled", "reminderMinutes"].includes(key))) throw new CommandError(422, "INVALID_PLAN", "Submit capacity, waitlist and reminder settings.");
  const capacity = raw.capacity === null ? null : raw.capacity;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)) throw new CommandError(422, "INVALID_CAPACITY", "Capacity must be between 1 and 500, or unlimited.");
  if (typeof raw.waitlistEnabled !== "boolean" || !Array.isArray(raw.reminderMinutes) || raw.reminderMinutes.length > 6 || raw.reminderMinutes.some((n) => !Number.isInteger(n) || n < 1 || n > 10080)) throw new CommandError(422, "INVALID_REMINDERS", "Choose up to six reminder offsets, between 1 minute and 7 days before start.");
  return { capacity, waitlistEnabled: raw.waitlistEnabled, reminderMinutes: [...new Set(raw.reminderMinutes)].sort((a, b) => b - a) };
}

export function templateInput(input) {
  return Object.fromEntries(["title", "description", "entityType", "channelId", "location", "timezone", "visibility"].map((key) => [key, input[key] ?? ""]));
}

export function expandOccurrences(input, count, intervalDays) {
  if (!Number.isInteger(count) || count < 2 || count > 12 || ![7, 14].includes(intervalDays) || input.timezone !== "UTC") throw new CommandError(422, "INVALID_SERIES", "Create 2–12 weekly or fortnightly occurrences using UTC.");
  staffingWindow({ ...input, recurrence: "NONE" });
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(Date.parse(input.start) + index * intervalDays * 86400000).toISOString();
    const end = new Date(Date.parse(input.end) + index * intervalDays * 86400000).toISOString();
    return { ...input, start, end, startLocal: start.slice(0, 16), endLocal: end.slice(0, 16), recurrence: "NONE" };
  });
}

/** @param {any} adapters */
export function createCommitmentPolicy(adapters) {
  const { authorize } = adapters;
  async function promote(tx, actor, op) {
    if (!["PUBLISHED", "ACTIVE"].includes(op.state)) return;
    const plan = await tx.commandOperationPlan.findUnique({ where: { operationId: op.id } });
    let remaining = plan?.capacity == null ? 500 : plan.capacity - await tx.commandSignup.count({ where: { operationId: op.id, status: "COMMITTED" } });
    const queue = await tx.commandOperationWaitlist.findMany({ where: { operationId: op.id }, orderBy: [{ queuedAt: "asc" }, { userId: "asc" }], take: 500 });
    for (const row of queue) {
      if (remaining <= 0) break;
      let eligible;
      try { eligible = crewMember(await authorize(row.userId)); }
      catch (error) { if (!(error instanceof CommandError) || error.status >= 500) throw error; eligible = false; }
      const signup = await tx.commandSignup.findUnique({ where: { operationId_userId: { operationId: op.id, userId: row.userId } } });
      if (eligible && signup?.status === "RESERVE") {
        await tx.commandSignup.update({ where: { operationId_userId: { operationId: op.id, userId: row.userId } }, data: { status: "COMMITTED" } });
        if (!crewMember(await authorize(row.userId))) throw new CommandError(403, "MEMBER_INELIGIBLE", "Waitlisted membership changed. Please retry.");
        remaining--;
      }
      await tx.commandOperationWaitlist.delete({ where: { operationId_userId: { operationId: op.id, userId: row.userId } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: eligible ? "COMMAND_WAITLIST_PROMOTED" : "COMMAND_WAITLIST_INELIGIBLE", targetType: "CommandOperation", targetId: op.id, metadata: { userId: row.userId } } });
    }
  }
  return {
    promote,
    async before(tx, actor, op, requested) {
      if (!crewMember(actor)) throw new CommandError(403, "MEMBER_REQUIRED", "Current House Wolf membership is required to commit.");
      const key = { operationId: op.id, userId: actor.id };
      const prior = await tx.commandSignup.findUnique({ where: { operationId_userId: key } });
      const plan = await tx.commandOperationPlan.findUnique({ where: { operationId: op.id } });
      if (requested !== "COMMITTED") {
        await tx.commandOperationWaitlist.deleteMany({ where: key });
        if (!["COMMITTED", "RESERVE"].includes(requested)) await tx.commandReserveCrew.updateMany({ where: { ...key, releasedAt: null }, data: { releasedAt: new Date(), releaseReason: "Member changed commitment" } });
        return requested;
      }
      if (prior?.status === "COMMITTED" || plan?.capacity == null) {
        await tx.commandOperationWaitlist.deleteMany({ where: key }); return "COMMITTED";
      }
      const count = await tx.commandSignup.count({ where: { operationId: op.id, status: "COMMITTED" } });
      const waiting = await tx.commandOperationWaitlist.count({ where: { operationId: op.id } });
      if (count < plan.capacity && !waiting) return "COMMITTED";
      if (!plan.waitlistEnabled && !await tx.commandOperationWaitlist.findUnique({ where: { operationId_userId: key } })) throw new CommandError(409, "CAPACITY_FULL", "This operation is full and its waitlist is closed.");
      await tx.commandOperationWaitlist.upsert({ where: { operationId_userId: key }, create: key, update: {} });
      return "RESERVE";
    },
  };
}

export async function scheduleReminders(tx, op, actorId, now = Date.now()) {
  await tx.commandOperationReminder.updateMany({ where: { operationId: op.id, status: { in: ["PENDING", "PROCESSING"] } }, data: { status: "SUPERSEDED", leaseUntil: null } });
  if (["CANCELLED", "COMPLETED", "ARCHIVED"].includes(op.state)) {
    await tx.commandReserveCrew.updateMany({ where: { operationId: op.id, releasedAt: null }, data: { releasedAt: new Date(), releaseReason: `Operation ${op.state.toLowerCase()}` } });
  }
  if (op.state !== "PUBLISHED" || op.input.visibility !== "GUILD") return;
  const plan = await tx.commandOperationPlan.findUnique({ where: { operationId: op.id } });
  const data = (plan?.reminderMinutes || []).map((minutes) => ({ operationId: op.id, actorId, revision: op.revision, minutes, dueAt: new Date(Date.parse(op.input.start) - minutes * 60000) })).filter((row) => row.dueAt.getTime() > now);
  if (data.length) {
    await tx.commandOperationReminder.createMany({ data, skipDuplicates: true });
    await tx.commandOperationReminder.updateMany({ where: { operationId: op.id, revision: op.revision, minutes: { in: data.map((row) => row.minutes) }, status: "SUPERSEDED", sendingAt: null }, data: { status: "PENDING", leaseUntil: null, availableAt: new Date() } });
  }
}

export async function assertReserveAvailability(tx, op, userId, input = op.input, exceptReserveId = null) {
  const window = staffingWindow(input);
  const [active, reserves] = await Promise.all([
    tx.commandCrewAssignment.findMany({ where: { userId, releasedAt: null, operation: { guildId: op.guildId, state: { in: ["PUBLISHED", "ACTIVE"] } } }, include: { operation: true } }),
    tx.commandReserveCrew.findMany({ where: { userId, releasedAt: null, ...(exceptReserveId ? { id: { not: exceptReserveId } } : {}), operation: { guildId: op.guildId, state: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } } }, include: { operation: true } }),
  ]);
  if ([...active, ...reserves].some((row) => row.operationId === op.id || overlaps(window, staffingWindow(row.operation.input)))) throw new CommandError(409, "RESERVE_OVERLAP", "This member already has active or reserve duty in this time window.");
}

export async function assertReserveSchedule(tx, op, input = op.input) {
  const rows = await tx.commandReserveCrew.findMany({ where: { operationId: op.id, releasedAt: null }, include: { seat: true } });
  for (const row of rows) {
    await assertReserveAvailability(tx, op, row.userId, input, row.id);
    if (row.seat?.requiredCode) {
      const credentials = await tx.commandQualification.findMany({ where: { guildId: op.guildId, userId: row.userId, code: row.seat.requiredCode, revokedAt: null } });
      if (!credentials.some((credential) => validCredential(credential, row.seat.requiredCode, staffingWindow(input).end))) throw new CommandError(422, "QUALIFICATION_REQUIRED", "A reserve qualification expires before the revised operation end.");
    }
  }
}

function preferenceScore(preferences, role, weight) {
  const codes = [...new Set((preferences || "").toUpperCase().split(/[,;\n|]/).map((item) => item.trim()).filter((item) => ["PILOT", "COPILOT", "GUNNER", "ENGINEER", "MEDIC", "TRANSPORT", "MINING", "SALVAGE", "GROUND"].includes(item)))];
  const index = codes.indexOf(role);
  return index < 0 ? 0 : Math.round(weight * (codes.length - index) / codes.length);
}

/** Hungarian matching: maximize filled seats, then verified role skills/preferences; stable IDs break ties. */
export function assignmentPreview(seats, candidates, skillWeight = 50, preferenceWeight = 50) {
  const rows = [...seats].sort((a, b) => a.id.localeCompare(b.id));
  const people = [...candidates].sort((a, b) => a.userId.localeCompare(b.userId));
  if (rows.length > 50 || people.length > 200) throw new CommandError(422, "PREVIEW_LIMIT", "Preview up to 50 empty seats and 200 candidates at a time.");
  const n = rows.length, m = people.length + n;
  const weight = (seat, candidate) => {
    if (candidate.eligibleSeatIds && !candidate.eligibleSeatIds.includes(seat.id)) return -100000000;
    const preferred = preferenceScore(candidate.preferences, seat.role, preferenceWeight);
    const trained = candidate.qualificationCodes?.includes(seat.role) ? 1 : 0;
    return 100000 + preferred + trained * skillWeight;
  };
  const costs = rows.map((seat) => Array.from({ length: m }, (_, j) => j < people.length ? -weight(seat, people[j]) : 0));
  const u = Array(n + 1).fill(0), v = Array(m + 1).fill(0), p = Array(m + 1).fill(0), way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; const min = Array(m + 1).fill(Infinity), used = Array(m + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) {
        const current = costs[i0 - 1][j - 1] - u[i0] - v[j];
        if (current < min[j]) { min[j] = current; way[j] = j0; }
        if (min[j] < delta) { delta = min[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else min[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const assignments = [];
  for (let j = 1; j <= people.length; j++) if (p[j] && costs[p[j] - 1][j - 1] < 0) {
    const seat = rows[p[j] - 1], person = people[j - 1];
    assignments.push({ seatId: seat.id, userId: person.userId, score: -costs[p[j] - 1][j - 1] - 100000, reason: preferenceScore(person.preferences, seat.role, preferenceWeight) > 0 ? "Qualified; role preference matched" : "Qualified; fills an open seat" });
  }
  return { assignments: assignments.sort((a, b) => a.seatId.localeCompare(b.seatId)), unfilledSeatIds: rows.filter((seat) => !assignments.some((row) => row.seatId === seat.id)).map((seat) => seat.id) };
}
