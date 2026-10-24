import { randomUUID } from "node:crypto";
import { CommandError, isOfficer, mayManageOperation } from "./access.js";
import { lockOperation } from "./operations.js";
import { crewMember, credentialCode, scheduleTransaction, staffingWindow, textField, uuid, validCredential } from "./staffingPolicy.js";
import { assertReserveAvailability, createCommitmentPolicy, expandOccurrences, scheduleReminders, templateInput, validatePlan } from "./planningPolicy.js";
import { buildAssignmentPreview } from "./assignmentPlanner.js";

const visible = (actor, op) => op && (isOfficer(actor.roleIds) || (op.state !== "DRAFT" && op.input.visibility === "GUILD"));
const names = { id: true, name: true, discordDisplayName: true, discordUsername: true };
const memberName = (user) => user.discordDisplayName || user.name || user.discordUsername;
/** @param {any} adapters */
export function createOperationsManagement(adapters) {
  const { prisma, authorize, crewService, reminderChannel = "", validateReminderChannel = async () => {} } = adapters;
  const commitments = createCommitmentPolicy({ authorize });
  async function manage(tx, actor, id) {
    if (!uuid(id)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
    const op = await lockOperation(tx, id, actor.guildId);
    if (!mayManageOperation(actor, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Only this operation's current managers or Clan Warlord may change its plan.");
    return op;
  }
  async function audit(tx, actor, op, action, metadata = {}) {
    const fresh = await authorize(actor.id, { officer: true });
    if (!mayManageOperation(fresh, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Your operation authority changed.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: `COMMAND_PLANNING_${action}`, targetType: "CommandOperation", targetId: op.id, metadata } });
  }
  return {
    async view(userId, id) {
      const actor = await authorize(userId);
      if (!uuid(id)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const op = await prisma.commandOperation.findFirst({ where: { id, guildId: actor.guildId } });
      if (!visible(actor, op)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const canManage = mayManageOperation(actor, op);
      const [plan, counts, queue, wings, reserves, candidates, reminders, series, assignments, seats] = await Promise.all([
        prisma.commandOperationPlan.findUnique({ where: { operationId: id } }),
        prisma.commandSignup.groupBy({ by: ["status"], where: { operationId: id }, _count: true }),
        prisma.commandOperationWaitlist.findMany({ where: { operationId: id }, orderBy: [{ queuedAt: "asc" }, { userId: "asc" }], select: { userId: true } }),
        canManage ? prisma.commandWing.findMany({ where: { operationId: id }, include: { seats: true }, orderBy: { name: "asc" } }) : [],
        canManage ? prisma.commandReserveCrew.findMany({ where: { operationId: id }, include: { user: { select: names }, seat: { select: { label: true } }, wing: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }) : [],
        canManage ? prisma.commandSignup.findMany({ where: { operationId: id, status: { in: ["COMMITTED", "RESERVE"] }, user: { isActive: true } }, include: { user: { select: names } }, take: 500 }) : [],
        canManage ? prisma.commandOperationReminder.findMany({ where: { operationId: id }, orderBy: { dueAt: "desc" }, take: 20 }) : [],
        prisma.commandSeriesOccurrence.findUnique({ where: { operationId: id }, include: { series: { include: { seriesOccurrences: { include: { operation: { select: { id: true, input: true, state: true } } }, orderBy: { ordinal: "asc" } } } } } }),
        canManage ? prisma.commandCrewAssignment.findMany({ where: { operationId: id, releasedAt: null }, include: { user: { select: names } } }) : [],
        canManage ? prisma.commandSeat.findMany({ where: { operationId: id, archived: false }, orderBy: { label: "asc" } }) : [],
      ]);
      const position = queue.findIndex((row) => row.userId === actor.id);
      return { canManage, userId: actor.id, state: op.state, revision: plan?.revision ?? 0, crewRevision: op.crewRevision, operationRevision: op.revision, timezone: op.input.timezone,
        capacity: plan?.capacity ?? null, waitlistEnabled: plan?.waitlistEnabled ?? true, reminderMinutes: plan?.reminderMinutes ?? [],
        committed: counts.find((row) => row.status === "COMMITTED")?._count ?? 0, waiting: queue.length, waitlistPosition: position < 0 ? null : position + 1,
        wings, reserves: reserves.map((row) => ({ id: row.id, userId: row.userId, name: memberName(row.user), seatId: row.seatId, seatLabel: row.seat?.label ?? "General reserve", wingName: row.wing?.name ?? null, releasedAt: row.releasedAt, releaseReason: row.releaseReason })),
        candidates: candidates.map((row) => ({ userId: row.userId, name: memberName(row.user), status: row.status })), reminders: reminders.map(({ id, dueAt, minutes, status, errorCode }) => ({ id, dueAt, minutes, status, errorCode })),
        assignments: assignments.map((row) => ({ id: row.id, seatId: row.seatId, name: memberName(row.user) })), seats,
        occurrences: (series?.series.seriesOccurrences || []).filter((row) => visible(actor, row.operation)).map((row) => ({ id: row.operation.id, ordinal: row.ordinal, start: row.operation.input.start, state: row.operation.state })),
      };
    },
    async templates(userId) {
      const actor = await authorize(userId, { officer: true });
      return prisma.commandOperationTemplate.findMany({ where: { guildId: actor.guildId }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, input: true, revision: true, creatorId: true } });
    },
    async deleteTemplate(userId, id, revision) {
      const actor = await authorize(userId, { officer: true });
      if (!uuid(id)) throw new CommandError(404, "NOT_FOUND", "Template not found.");
      return prisma.$transaction(async (tx) => {
        const row = await tx.commandOperationTemplate.findFirst({ where: { id, guildId: actor.guildId } });
        if (!row) throw new CommandError(404, "NOT_FOUND", "Template not found.");
        const source = { guildId: actor.guildId, creatorId: row.creatorId, managerIds: [] };
        if (!mayManageOperation(actor, source) || row.revision !== revision) throw new CommandError(403, "TEMPLATE_OWNER_REQUIRED", "Only the current template owner or Clan Warlord may delete this version.");
        await tx.commandOperationTemplate.delete({ where: { id } });
        if (!mayManageOperation(await authorize(userId, { officer: true }), source)) throw new CommandError(403, "PERMISSION_CHANGED", "Template permissions changed.");
        await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_TEMPLATE_DELETED", targetType: "CommandOperationTemplate", targetId: id } });
        return { deleted: true };
      }, { timeout: 20000 });
    },
    async mutate(userId, id, action, revision, raw = {}) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CommandError(422, "INVALID_INPUT", "Submit planning fields as an object.");
      if (action === "applyAssignments" || action === "activateReserve" || action === "transfer") {
        return crewService.mutate(userId, id, action === "applyAssignments" ? "assignMany" : action, raw.crewRevision, raw);
      }
      const actor = await authorize(userId, { officer: true });
      return scheduleTransaction(prisma, actor, async (tx) => {
        const op = await manage(tx, actor, id);
        if (action === "saveTemplate") {
          const name = textField(raw.name, "Template name", 80);
          const template = await tx.commandOperationTemplate.create({ data: { guildId: actor.guildId, creatorId: actor.id, name, input: templateInput(op.input) } });
          await audit(tx, actor, op, "TEMPLATE_SAVED", { templateId: template.id }); return { templateId: template.id };
        }
        if (!["DRAFT", "PUBLISHED", "ACTIVE"].includes(op.state)) throw new CommandError(409, "PLANNING_CLOSED", "This operation is closed for planning changes.");
        const plan = await tx.commandOperationPlan.findUnique({ where: { operationId: id } });
        if (!Number.isInteger(revision) || revision !== (plan?.revision ?? 0)) throw new CommandError(409, "STALE_PLAN", "The plan changed. Reload before saving.");
        if (action === "previewAssignments") return buildAssignmentPreview(tx, op, raw.wingId || null);
        let result = {};
        if (action === "savePlan") {
          const data = validatePlan(raw);
          if (data.reminderMinutes.length) {
            const settings = await tx.siteSetting.findUnique({ where: { key: `command:${actor.guildId}:settings` } });
            const channel = settings?.value?.channels?.reminders || reminderChannel;
            if (!channel) throw new CommandError(422, "REMINDERS_UNCONFIGURED", "Configure a Discord reminders channel in Organization settings first.");
            await validateReminderChannel(actor.guildId, channel);
          }
          const committed = await tx.commandSignup.count({ where: { operationId: id, status: "COMMITTED" } });
          if (data.capacity !== null && data.capacity < committed) throw new CommandError(409, "BELOW_COMMITTED", "Capacity cannot be lower than the current committed count.");
          await tx.commandOperationPlan.upsert({ where: { operationId: id }, create: { operationId: id, ...data, revision: 1, updatedById: actor.id }, update: { ...data, revision: { increment: 1 }, updatedById: actor.id } });
          await commitments.promote(tx, actor, op);
          await scheduleReminders(tx, op, actor.id);
          await audit(tx, actor, op, "PLAN_SAVED", data); return { saved: true };
        } else if (action === "createWing") {
          result = await tx.commandWing.create({ data: { operationId: id, name: textField(raw.name, "Wing name", 60) } });
        } else if (action === "linkWingSeat") {
          if (!uuid(raw.seatId) || !await tx.commandSeat.findFirst({ where: { id: raw.seatId, operationId: id, archived: false } })) throw new CommandError(404, "NOT_FOUND", "Seat not found.");
          if (raw.wingId) {
            if (!uuid(raw.wingId) || !await tx.commandWing.findFirst({ where: { id: raw.wingId, operationId: id } })) throw new CommandError(404, "NOT_FOUND", "Wing not found.");
            await tx.commandWingSeat.upsert({ where: { seatId: raw.seatId }, create: { seatId: raw.seatId, operationId: id, wingId: raw.wingId }, update: { wingId: raw.wingId } });
          } else await tx.commandWingSeat.deleteMany({ where: { seatId: raw.seatId, operationId: id } });
        } else if (action === "addReserve") {
          const window = staffingWindow(op.input);
          if (window.end <= Date.now() || !["PUBLISHED", "ACTIVE"].includes(op.state) || !uuid(raw.userId)) throw new CommandError(422, "INVALID_RESERVE", "Choose a member for a published, unfinished operation.");
          if (!crewMember(await authorize(raw.userId))) throw new CommandError(403, "MEMBER_INELIGIBLE", "A current eligible member is required.");
          const signup = await tx.commandSignup.findUnique({ where: { operationId_userId: { operationId: id, userId: raw.userId } } });
          if (!signup || !["COMMITTED", "RESERVE"].includes(signup.status)) throw new CommandError(422, "COMMITMENT_REQUIRED", "The member must explicitly commit or choose reserve first.");
          const seat = raw.seatId ? await tx.commandSeat.findFirst({ where: { id: raw.seatId, operationId: id, archived: false } }) : null;
          if (raw.seatId && !seat) throw new CommandError(404, "NOT_FOUND", "Seat not found.");
          if (seat?.requiredCode) {
            credentialCode(seat.requiredCode);
            const credentials = await tx.commandQualification.findMany({ where: { guildId: actor.guildId, userId: raw.userId, code: seat.requiredCode, revokedAt: null } });
            if (!credentials.some((row) => validCredential(row, seat.requiredCode, window.end))) throw new CommandError(422, "QUALIFICATION_REQUIRED", "The reserve requires the seat's verified qualification through operation end.");
          }
          if (raw.wingId && (!uuid(raw.wingId) || !await tx.commandWing.findFirst({ where: { id: raw.wingId, operationId: id } }))) throw new CommandError(404, "NOT_FOUND", "Wing not found.");
          await assertReserveAvailability(tx, op, raw.userId);
          result = await tx.commandReserveCrew.create({ data: { operationId: id, userId: raw.userId, seatId: seat?.id ?? null, wingId: raw.wingId || null, assignedById: actor.id, reason: textField(raw.reason, "Reserve reason", 500) } });
          if (!crewMember(await authorize(raw.userId))) throw new CommandError(403, "MEMBER_INELIGIBLE", "Reserve eligibility changed.");
        } else if (action === "releaseReserve") {
          const row = uuid(raw.reserveId) ? await tx.commandReserveCrew.findFirst({ where: { id: raw.reserveId, operationId: id, releasedAt: null } }) : null;
          if (!row) throw new CommandError(404, "NOT_FOUND", "Active reserve not found.");
          await tx.commandReserveCrew.update({ where: { id: row.id }, data: { releasedAt: new Date(), releaseReason: textField(raw.reason, "Release reason", 500) } });
        } else if (action === "createSeries") {
          if (op.state !== "DRAFT" || op.nativeEventId || await tx.commandSeriesOccurrence.findFirst({ where: { OR: [{ operationId: id }, { seriesId: id }] } })) throw new CommandError(409, "SERIES_DRAFT_REQUIRED", "Expand a new unpublished draft. Published native series are kept unchanged.");
          const inputs = expandOccurrences(op.input, raw.count, raw.intervalDays);
          const occurrences = [];
          for (const [index, input] of inputs.entries()) {
            const child = index === 0 ? await tx.commandOperation.update({ where: { id }, data: { input, revision: { increment: 1 } } }) : await tx.commandOperation.create({ data: { id: randomUUID(), guildId: actor.guildId, creatorId: actor.id, managerIds: [...new Set([op.creatorId, ...op.managerIds])].filter((member) => member !== actor.id), input, requestKey: `series:${id}:${index + 1}` } });
            await tx.commandSeriesOccurrence.create({ data: { operationId: child.id, seriesId: id, ordinal: index + 1, intervalDays: raw.intervalDays } });
            if (index && plan) await tx.commandOperationPlan.create({ data: { operationId: child.id, capacity: plan.capacity, waitlistEnabled: plan.waitlistEnabled, reminderMinutes: plan.reminderMinutes, updatedById: actor.id } });
            occurrences.push(child.id);
          }
          result = { occurrences };
        } else throw new CommandError(422, "INVALID_ACTION", "Choose a supported planning action.");
        await tx.commandOperationPlan.upsert({ where: { operationId: id }, create: { operationId: id, revision: 1, updatedById: actor.id }, update: { revision: { increment: 1 }, updatedById: actor.id } });
        if (["addReserve", "releaseReserve", "linkWingSeat"].includes(action)) await tx.commandOperation.update({ where: { id }, data: { crewRevision: { increment: 1 } } });
        await audit(tx, actor, op, action.toUpperCase()); return result;
      });
    },
  };
}
