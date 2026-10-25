import { CommandError, isOfficer, mayManageOperation } from "./access.js";
import { lockOperation } from "./operations.js";
import { crewMember, displayMember, scheduleTransaction, textField, uuid } from "./staffingPolicy.js";

const names = { id: true, name: true, discordDisplayName: true, discordUsername: true };
const visible = (actor, op) => op && (isOfficer(actor.roleIds) || (op.state !== "DRAFT" && op.input.visibility === "GUILD"));
function reportText(value, field, optional = false) {
  if (typeof value !== "string" || value.length > 10000 || (!optional && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new CommandError(422, "INVALID_REPORT", `${field} must contain ${optional ? "up to" : "1 to"} 10,000 characters.`);
  return value.trim();
}
export function attendanceTotals(entries) {
  const present = entries.filter((row) => row.status === "PRESENT").length;
  const absent = entries.filter((row) => row.status === "ABSENT").length;
  const excused = entries.filter((row) => row.status === "EXCUSED").length;
  return { present, absent, excused, expected: present + absent, value: present + absent ? Math.round(100 * present / (present + absent)) : null };
}
export function validateAttendance(raw) {
  if (!Array.isArray(raw) || raw.length > 500) throw new CommandError(422, "INVALID_ATTENDANCE", "Record up to 500 participants.");
  const seen = new Set();
  return raw.map((row) => {
    if (!uuid(row?.userId) || seen.has(row.userId) || !["PRESENT", "ABSENT", "EXCUSED"].includes(row.status)) throw new CommandError(422, "INVALID_ATTENDANCE", "Each participant needs one attendance status.");
    seen.add(row.userId);
    return { userId: row.userId, status: row.status, note: textField(row.note || "", "Private attendance note", 1000, true) };
  });
}

/** @param {any} adapters */
export function createAttendanceService({ prisma, authorize }) {
  async function candidates(tx, operationId) {
    const [signups, crew] = await Promise.all([
      tx.commandSignup.findMany({ where: { operationId, status: "COMMITTED" }, include: { user: { select: names } } }),
      tx.commandCrewAssignment.findMany({ where: { operationId }, include: { user: { select: names } } }),
    ]);
    return [...new Map([...signups, ...crew].map((row) => [row.userId, { id: row.userId, name: displayMember(row.user) }])).values()];
  }
  return {
    async directory(userId, id, query = "") {
      const actor = await authorize(userId, { officer: true });
      if (!uuid(id)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const op = await prisma.commandOperation.findFirst({ where: { id, guildId: actor.guildId } });
      if (!op) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      if (!mayManageOperation(actor, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Only operation managers may find walk-in attendees.");
      const search = textField(query, "Member search", 80, true);
      return (await prisma.user.findMany({ where: { isActive: true, OR: ["discordUsername", "discordDisplayName", "name"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) }, select: names, take: 30, orderBy: { discordUsername: "asc" } })).map((user) => ({ id: user.id, name: displayMember(user) }));
    },
    async view(userId, id) {
      const actor = await authorize(userId);
      if (!crewMember(actor)) throw new CommandError(403, "MEMBER_REQUIRED", "Current membership is required.");
      if (!uuid(id)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const op = await prisma.commandOperation.findFirst({ where: { id, guildId: actor.guildId } });
      if (!visible(actor, op)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const officer = isOfficer(actor.roleIds), canManage = mayManageOperation(actor, op);
      // Explicit projections prevent private notes/draft summaries crossing the member boundary.
      const debrief = await prisma.commandDebrief.findUnique({ where: { operationId: id }, select: { revision: true, finalizedAt: true, reportState: true, authorId: true, reviewerId: true, reviewedAt: true, ...(officer ? { summary: true, privateNotes: true } : {}) } });
      let summary = officer ? debrief?.summary || "" : "";
      if (!officer && debrief?.reportState === "REVIEWED") summary = (await prisma.commandDebrief.findFirst({ where: { operationId: id, reportState: "REVIEWED" }, select: { summary: true } }))?.summary || "";
      const entries = officer || debrief?.finalizedAt ? await prisma.commandAttendance.findMany({ where: { operationId: id, ...(officer ? {} : { userId: actor.id }) }, select: { userId: true, status: true, user: { select: names }, ...(officer ? { note: true } : {}) }, orderBy: { userId: "asc" } }) : [];
      const history = officer ? await prisma.commandDebriefRevision.findMany({ where: { operationId: id }, orderBy: { revision: "desc" }, take: 50 }) : [];
      return { revision: debrief?.revision ?? 0, finalizedAt: debrief?.finalizedAt ?? null, reportState: debrief?.reportState ?? "DRAFT", summary,
        ...(officer ? { privateNotes: debrief?.privateNotes || "", history } : {}),
        officer, canManage, canReview: officer && !!debrief?.summary && debrief.reportState !== "REVIEWED" && debrief.authorId !== actor.id,
        editable: op.state === "ACTIVE" || op.state === "COMPLETED" || (op.state === "ARCHIVED" && !!debrief?.finalizedAt),
        canFinalize: op.state === "COMPLETED" || (op.state === "ARCHIVED" && !!debrief?.finalizedAt),
        entries: entries.map(({ user, ...row }) => ({ ...row, name: displayMember(user) })),
        candidates: canManage ? await candidates(prisma, id) : [], totals: attendanceTotals(entries),
      };
    },
    async mutate(userId, id, action, revision, raw = {}) {
      const actor = await authorize(userId, { officer: true });
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CommandError(422, "INVALID_INPUT", "Submit attendance fields as an object.");
      return scheduleTransaction(prisma, actor, async (tx) => {
        const op = await lockOperation(tx, id, actor.guildId);
        if (action !== "reviewReport" && !mayManageOperation(actor, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Only operation managers may record attendance or draft reports.");
        const prior = await tx.commandDebrief.findUnique({ where: { operationId: id }, include: { entries: true } });
        const liveDraft = op.state === "ACTIVE" && action === "saveAttendance" && !prior?.finalizedAt;
        if (!liveDraft && op.state !== "COMPLETED" && !(op.state === "ARCHIVED" && prior?.finalizedAt)) throw new CommandError(409, "OPERATION_NOT_COMPLETED", "During an active operation, save an attendance draft. Complete the operation before finalizing attendance or writing its report.");
        if (op.input.recurrence && op.input.recurrence !== "NONE") throw new CommandError(422, "OCCURRENCE_REQUIRED", "Record attendance against individual one-time occurrences.");
        if (!Number.isInteger(revision) || revision !== (prior?.revision ?? 0)) throw new CommandError(409, "STALE_DEBRIEF", "Attendance or report changed. Reload before saving.");
        const reason = textField(raw.reason, "Change reason", 500);
        let data = {};
        if (action === "saveAttendance" || action === "finalizeAttendance") {
          const entries = validateAttendance(raw.entries);
          const roster = await candidates(tx, id);
          const known = new Set([...roster.map((row) => row.id), ...(prior?.entries || []).map((row) => row.userId)]);
          for (const entry of entries) if (!known.has(entry.userId)) {
            const target = await authorize(entry.userId);
            if (target.guildId !== actor.guildId || !crewMember(target)) throw new CommandError(422, "INVALID_PARTICIPANT", "Walk-in attendees must be eligible members.");
          }
          const ids = new Set(entries.map((row) => row.userId));
          if (action === "finalizeAttendance" || prior?.finalizedAt) {
            if (!entries.length || [...known].some((key) => !ids.has(key))) throw new CommandError(422, "ATTENDANCE_INCOMPLETE", "Mark every committed, assigned and previously recorded participant before finalizing or correcting attendance.");
          }
          data = { finalizedAt: prior?.finalizedAt || (action === "finalizeAttendance" ? new Date() : null) };
          await tx.commandDebrief.upsert({ where: { operationId: id }, create: { operationId: id, ...data }, update: data });
          await tx.commandAttendance.deleteMany({ where: { operationId: id } });
          if (entries.length) await tx.commandAttendance.createMany({ data: entries.map((entry) => ({ ...entry, operationId: id })) });
        } else if (action === "saveReport") {
          data = { summary: reportText(raw.summary, "Member-visible summary"), privateNotes: reportText(raw.privateNotes || "", "Private officer notes", true), reportState: "DRAFT", authorId: actor.id, reviewerId: null, reviewedAt: null };
        } else if (action === "reviewReport") {
          if (!prior?.summary || prior.reportState === "REVIEWED") throw new CommandError(409, "REPORT_NOT_DRAFT", "Save a draft report before requesting review.");
          if (prior.authorId === actor.id) throw new CommandError(403, "INDEPENDENT_REVIEW", "Another current officer must review this report.");
          data = { reportState: "REVIEWED", reviewerId: actor.id, reviewedAt: new Date() };
        } else throw new CommandError(422, "INVALID_ACTION", "Choose an attendance or report action.");
        const nextRevision = (prior?.revision ?? 0) + 1;
        const saved = await tx.commandDebrief.upsert({ where: { operationId: id }, create: { operationId: id, ...data, revision: nextRevision }, update: { ...data, revision: nextRevision }, include: { entries: { include: { user: { select: names } } } } });
        const snapshot = JSON.parse(JSON.stringify(saved));
        snapshot.entries = saved.entries.map(({ user, ...entry }) => ({ ...entry, name: displayMember(user) }));
        await tx.commandDebriefRevision.create({ data: { operationId: id, revision: nextRevision, actorId: actor.id, action, reason, snapshot } });
        const fresh = await authorize(userId, { officer: true });
        if (action !== "reviewReport" && !mayManageOperation(fresh, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Your operation authority changed.");
        await tx.auditLog.create({ data: { actorId: actor.id, action: `COMMAND_DEBRIEF_${action}`, targetType: "CommandOperation", targetId: id, metadata: { revision: nextRevision, reason } } });
        return { revision: nextRevision };
      });
    },
    async statistics(userId) {
      const actor = await authorize(userId);
      if (!crewMember(actor)) throw new CommandError(403, "MEMBER_REQUIRED", "Current membership is required.");
      const leadership = isOfficer(actor.roleIds);
      const entries = await prisma.commandAttendance.findMany({ where: { ...(leadership ? {} : { userId: actor.id }), debrief: { finalizedAt: { not: null }, operation: { guildId: actor.guildId, state: { in: ["COMPLETED", "ARCHIVED"] }, ...(!leadership ? { input: { path: ["visibility"], equals: "GUILD" } } : {}) } } }, select: { operationId: true, userId: true, status: true, ...(leadership ? { user: { select: names } } : {}) } });
      const grouped = new Map();
      if (leadership) for (const entry of entries) {
        const person = grouped.get(entry.userId) || { id: entry.userId, name: displayMember(entry.user), entries: [] };
        person.entries.push(entry); grouped.set(entry.userId, person);
      }
      return { ...attendanceTotals(entries), operations: new Set(entries.map((row) => row.operationId)).size, participants: new Set(entries.map((row) => row.userId)).size,
        ...(leadership ? { members: [...grouped.values()].map((person) => ({ id: person.id, name: person.name, ...attendanceTotals(person.entries), operations: new Set(person.entries.map((row) => row.operationId)).size })).sort((a, b) => a.name.localeCompare(b.name)) } : {}),
      };
    },
  };
}
