import { randomUUID } from "node:crypto";
import { CommandError, isOfficer, mayManageOperation } from "./access.js";
import { validateEventInput, editableInput, nativePayload, nativeSnapshot as snapshotNative, transition } from "./eventInput.js";
import { lockSchedule, releaseAssignments, assertNoScheduleConflicts } from "./staffingPolicy.js";
const conflict = () => { throw new CommandError(409, "STALE_REVISION", "This operation changed. Reload before saving."); };
export async function lockOperation(tx, id, guildId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
  await tx.$queryRaw`SELECT id FROM command_operations WHERE id = ${id}::uuid AND "guildId" = ${guildId} FOR UPDATE`;
  const operation = await tx.commandOperation.findFirst({ where: { id, guildId } });
  if (!operation) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
  return operation;
}
/** @param {any} adapters */
export function createOperationService(adapters) {
  const { prisma, authorize, preflight, baseUrl, announcementChannel = "", staffingEnabled = false, commitmentPolicy = null, operationChanged = null, reserveScheduleCheck = null, resolveVoiceChannelName = /** @type {(guildId: string, channelId: string) => Promise<string | null>} */ (async () => null), validateVoice = /** @type {null | ((guildId: string, channelId: string) => Promise<unknown>)} */ (null), readNative = /** @type {(guild: string) => Promise<any[]>} */ (async () => { throw new CommandError(503, "RECONCILIATION_UNAVAILABLE", "Remote reconciliation is unavailable."); }) } = adapters;
  const checkVoice = (guildId, input) => validateVoice ? validateVoice(guildId, input.channelId) : preflight(guildId, { ...input, visibility: "GUILD" });
  const managed = async (actor, op) => {
    if (!mayManageOperation(actor, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Only a current qualifying creator, co-manager or Clan Warlord can manage this operation.");
  };
  const audit = (tx, actor, op, action, previousNativeEventId = null) => tx.auditLog.create({ data: { actorId: actor.id, action: `COMMAND_OPERATION_${action}`, targetType: "CommandOperation", targetId: op.id, metadata: { revision: op.revision, guildId: op.guildId, nativeEventId: op.nativeEventId, previousNativeEventId } } });
  const enqueue = async (tx, op, actor) => {
    const setting = await tx.siteSetting.findUnique({ where: { key: `command:${op.guildId}:settings` } });
    const channelId = op.announcementChannelId || setting?.value?.channels?.events || announcementChannel;
    if (channelId && !op.announcementChannelId) await tx.commandOperation.update({ where: { id: op.id }, data: { announcementChannelId: channelId } });
    for (const kind of ["NATIVE", ...(channelId ? ["ANNOUNCEMENT"] : [])])
      await tx.commandDelivery.create({ data: { operationId: op.id, revision: op.revision, kind, actorId: actor.id } });
  };
  return {
    async list(userId) {
      const actor = await authorize(userId);
      return prisma.commandOperation.findMany({ where: { guildId: actor.guildId, ...(!isOfficer(actor.roleIds) ? { state: { not: "DRAFT" }, input: { path: ["visibility"], equals: "GUILD" } } : {}) }, orderBy: { createdAt: "desc" }, take: 100,
        select: { id: true, input: true, state: true, revision: true, nativeEventId: true, syncState: true, guildId: true, creatorId: true, managerIds: true, deliveries: { orderBy: { createdAt: "desc" }, take: 2 } } });
    },
    async detail(userId, id) {
      const actor = await authorize(userId);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const op = await prisma.commandOperation.findFirst({ where: { id, guildId: actor.guildId }, include: { deliveries: { orderBy: { createdAt: "desc" }, take: 10 }, signups: { where: { userId: actor.id } } } });
      if (!op || ((op.input.visibility !== "GUILD" || op.state === "DRAFT") && !isOfficer(actor.roleIds))) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      let voiceChannelName = null;
      if (op.input.entityType === "VOICE") {
        try { voiceChannelName = await resolveVoiceChannelName(op.guildId, op.input.channelId); }
        catch { /* The briefing stays available when Discord cannot resolve a name. */ }
      }
      return { ...op, voiceChannelName, nativeEventUrl: op.nativeEventId ? `https://discord.com/events/${op.guildId}/${op.nativeEventId}` : null, canManage: mayManageOperation(actor, op) };
    },
    async create(userId, raw, requestKey) {
      const actor = await authorize(userId, { officer: true });
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey || "")) throw new CommandError(422, "IDEMPOTENCY_REQUIRED", "A valid request key is required.");
      const input = validateEventInput(raw);
      if (input.entityType === "VOICE") await checkVoice(actor.guildId, input);
      return prisma.$transaction(async (tx) => {
        // Serialize concurrent retries before their unique insert.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${actor.guildId + actor.id + requestKey}))::text`;
        const prior = await tx.commandOperation.findUnique({ where: { guildId_creatorId_requestKey: { guildId: actor.guildId, creatorId: actor.id, requestKey } } });
        if (prior) { await authorize(userId, { officer: true }); return prior; }
        const op = await tx.commandOperation.create({ data: { id: randomUUID(), guildId: actor.guildId, creatorId: actor.id, requestKey, input } });
        await audit(tx, actor, op, "CREATED");
        await authorize(userId, { officer: true });
        return op;
      }, { timeout: 20000 });
    },
    async mutate(userId, id, action, revision, raw) {
      const actor = await authorize(userId, { officer: true });
      return prisma.$transaction(async (tx) => {
        if (staffingEnabled) await lockSchedule(tx, actor.guildId);
        let op = await lockOperation(tx, id, actor.guildId);
        const previousNativeEventId = op.nativeEventId;
        await managed(actor, op);
        if (op.revision !== revision) conflict();
        const ambiguous = await tx.commandDelivery.count({ where: { operationId: id, kind: "NATIVE", status: "AMBIGUOUS" } });
        if (ambiguous && !op.nativeEventId && action !== "reconcile") throw new CommandError(409, "AMBIGUOUS", "Reconcile the uncertain native event before another mutation; automatic recreation is blocked.");
        if (op.state === "ARCHIVED") throw new CommandError(409, "ARCHIVED", "Archived operations are read-only.");
        let input = op.input, state = op.state, syncState = op.syncState;
        let nativeEventId = op.nativeEventId, nativeSnapshot = undefined, remoteSnapshot = undefined;
        if (action === "reconcile") {
          if (!ambiguous || op.nativeEventId) throw new CommandError(409, "NOT_AMBIGUOUS", "No uncertain native creation to reconcile.");
          const marker = new URL(`/dashboard/operations/${id}`, baseUrl).href;
          const matches = (await readNative(actor.guildId)).filter((event) => event.description?.includes(marker));
          if (matches.length !== 1) throw new CommandError(409, "AMBIGUOUS", "No unique Discord event matches the operation link. Creation remains blocked; an operator must review the native event history.");
          nativeEventId = matches[0].id; nativeSnapshot = snapshotNative(matches[0]); remoteSnapshot = nativeSnapshot; syncState = "CONFLICT";
          await tx.commandDelivery.updateMany({ where: { operationId: id, kind: "NATIVE", status: "AMBIGUOUS" }, data: { status: "SUPERSEDED" } });
        } else if (action === "save") {
          if (!["DRAFT", "PUBLISHED"].includes(state)) throw new CommandError(409, "READ_ONLY", "Only draft and scheduled operations can be edited.");
          if (syncState !== "CLEAN") throw new CommandError(409, "SYNC_CONFLICT", "Resolve the Discord conflict before editing.");
          input = validateEventInput(raw);
          if (input.entityType === "VOICE") await checkVoice(actor.guildId, input);
          if (op.state === "PUBLISHED" && op.input.end && !input.end) throw new CommandError(422, "END_REQUIRED", "An existing Discord end time cannot be cleared. Choose a new end time.");
        } else if (action === "reapply") {
          if (syncState !== "CONFLICT" || !nativeEventId) throw new CommandError(409, "NO_CONFLICT", "No remote conflict to resolve.");
          nativeSnapshot = op.remoteSnapshot; syncState = "CLEAN";
        } else if (action === "adopt") {
          if (syncState !== "CONFLICT" || !op.remoteSnapshot) throw new CommandError(409, "NO_CONFLICT", "No supported remote edit to adopt.");
          const r = op.remoteSnapshot;
          const frequency = r.recurrence?.frequency;
          if (frequency != null && (frequency !== 2 || ![1, 2].includes(r.recurrence.interval))) throw new CommandError(422, "UNSUPPORTED_RECURRENCE", "Remote recurrence cannot be adopted. Review and reapply the dashboard version.");
          if (![1, 2, 3, 4].includes(r.status)) throw new CommandError(422, "REMOTE_LIFECYCLE", "Unsupported Discord lifecycle status.");
          input = validateEventInput({ ...editableInput(input), title: r.name, description: (r.description || "").split("\n\nHouse Wolf signup & briefing:")[0], entityType: r.entity_type === 2 ? "VOICE" : "EXTERNAL", channelId: r.channel_id, location: r.location, timezone: "UTC", startLocal: r.start.slice(0, 16), endLocal: r.end?.slice(0, 16) || "", recurrence: !r.recurrence ? "NONE" : r.recurrence.interval === 2 ? "FORTNIGHTLY" : "WEEKLY" }, { future: false });
          state = { 1: "PUBLISHED", 2: "ACTIVE", 3: "COMPLETED", 4: "CANCELLED" }[r.status];
          input.imageBehavior = "PRESERVE"; input.imageData = null;
          nativeSnapshot = r; syncState = "CLEAN";
        } else if (action === "recreate") {
          if (syncState !== "DELETED") throw new CommandError(409, "NOT_DELETED", "Only a confirmed externally deleted event can be explicitly recreated.");
          nativeEventId = null; syncState = "CLEAN";
        } else if (action === "retry") {
          if (syncState !== "CLEAN") throw new CommandError(409, "SYNC_CONFLICT", "Resolve the remote conflict before retrying.");
          const jobs = await tx.commandDelivery.findMany({ where: { operationId: id, revision } });
          if (jobs.some((j) => j.status === "AMBIGUOUS")) throw new CommandError(409, "AMBIGUOUS", "Delivery outcome is ambiguous. Reconcile before another creation attempt.");
          await tx.commandDelivery.updateMany({ where: { operationId: id, revision, status: { in: ["FAILED", "BLOCKED"] } }, data: { status: "PENDING", attempts: 0, availableAt: new Date(), errorCode: null } });
          await audit(tx, actor, op, "RETRIED"); await authorize(userId, { officer: true }); return op;
        } else state = transition(state, action);
        if (state !== "DRAFT" && !["archive", "adopt", "reconcile"].includes(action)) {
          nativePayload({ ...op, input }, baseUrl);
          if (state === "PUBLISHED") { validateEventInput(editableInput(input)); await preflight(actor.guildId, input); }
        }
        if (staffingEnabled && ["CANCELLED", "COMPLETED"].includes(state)) await releaseAssignments(tx, { operationId: id }, actor.id, `Operation ${state.toLowerCase()}`);
        else if (staffingEnabled && ["DRAFT", "PUBLISHED", "ACTIVE"].includes(state)) { await assertNoScheduleConflicts(tx, op, input); if (reserveScheduleCheck) await reserveScheduleCheck(tx, op, input); }
        op = await tx.commandOperation.update({ where: { id }, data: { input, state, revision: { increment: 1 }, syncState, nativeEventId, ...(nativeSnapshot ? { nativeSnapshot } : {}), ...(remoteSnapshot ? { remoteSnapshot } : {}) } });
        if (operationChanged) await operationChanged(tx, op, actor.id);
        // A remote adoption changes the dashboard snapshot only and cannot bounce back to Discord.
        if (state !== "DRAFT" && !["archive", "adopt", "reconcile"].includes(action)) await enqueue(tx, op, actor);
        await audit(tx, actor, op, action.toUpperCase(), previousNativeEventId);
        await managed(await authorize(userId, { officer: true }), op);
        return op;
      }, { timeout: 25000 });
    },
    async signup(userId, id, status, preferences) {
      const actor = await authorize(userId);
      if (!["COMMITTED", "TENTATIVE", "RESERVE", "WITHDRAWN"].includes(status) || typeof preferences !== "string" || preferences.length > 500) throw new CommandError(422, "INVALID_SIGNUP", "Select a commitment and enter at most 500 characters of preferences.");
      return prisma.$transaction(async (tx) => {
        if (staffingEnabled) await lockSchedule(tx, actor.guildId);
        const op = await lockOperation(tx, id, actor.guildId);
        if (op.input.visibility !== "GUILD" || !["PUBLISHED", "ACTIVE"].includes(op.state)) throw new CommandError(403, "SIGNUP_CLOSED", "This operation is not open for signup.");
        if (commitmentPolicy) status = await commitmentPolicy.before(tx, actor, op, status);
        if (staffingEnabled && status !== "COMMITTED") await releaseAssignments(tx, { operationId: id, userId }, actor.id, `Member changed commitment to ${status.toLowerCase()}`);
        const signup = await tx.commandSignup.upsert({ where: { operationId_userId: { operationId: id, userId } }, create: { operationId: id, userId, status, preferences, source: "WEBSITE" }, update: { status, preferences, source: "WEBSITE" } });
        if (commitmentPolicy) await commitmentPolicy.promote(tx, actor, op);
        await authorize(userId); return commitmentPolicy ? await tx.commandSignup.findUnique({ where: { operationId_userId: { operationId: id, userId } } }) || signup : signup;
      }, { timeout: 15000 });
    },
  };
}
