import { randomUUID } from "node:crypto";
import { CommandError, mayManageOperation } from "../lib/command/access.js";
import { validateTextDestination } from "../lib/command/channels.js";
import { lockOperation } from "../lib/command/operations.js";
import { operationBriefingUrl } from "../lib/command/commitmentComponents.js";

/** Durable reminders use the existing worker transport. Tests inject a fake Discord adapter. */
export function createOperationReminderWorker({ prisma, authorize, discord, guildId, env = process.env }) {
  let running = false;
  async function claim() {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT r.id FROM command_operation_reminders r JOIN command_operations o ON o.id=r."operationId"
        WHERE o."guildId"=${guildId} AND r."dueAt" <= now() AND ((r.status='PENDING' AND r."availableAt" <= now()) OR (r.status='PROCESSING' AND r."leaseUntil" < now()))
        ORDER BY r."dueAt", r.id FOR UPDATE OF r SKIP LOCKED LIMIT 1`;
      return rows.length ? tx.commandOperationReminder.update({ where: { id: rows[0].id }, data: { status: "PROCESSING", attempts: { increment: 1 }, leaseToken: randomUUID(), leaseUntil: new Date(Date.now() + 180000) } }) : null;
    });
  }
  async function processJob(job) {
    let attempted = false;
    try {
      await prisma.$transaction(async (tx) => {
        const op = await lockOperation(tx, job.operationId, guildId);
        const current = await tx.commandOperationReminder.findUnique({ where: { id: job.id } });
        if (current?.leaseToken !== job.leaseToken || current.status !== "PROCESSING") return;
        if (current.dueAt && current.dueAt.getTime() > Date.now()) { await tx.commandOperationReminder.update({ where: { id: job.id }, data: { status: "PENDING", leaseUntil: null } }); return; }
        if (job.sendingAt) throw new CommandError(409, "AMBIGUOUS", "Review the reminders channel before retrying an interrupted send.");
        if (op.revision !== job.revision || op.state !== "PUBLISHED" || op.input.visibility !== "GUILD" || Date.parse(op.input.start) <= Date.now()) {
          await tx.commandOperationReminder.update({ where: { id: job.id }, data: { status: "SUPERSEDED", leaseUntil: null } }); return;
        }
        const actor = await authorize(job.actorId, { officer: true });
        if (!mayManageOperation(actor, op)) throw new CommandError(403, "MANAGER_REQUIRED", "The reminder author no longer manages this operation.");
        const setting = await tx.siteSetting.findUnique({ where: { key: `command:${guildId}:settings` } });
        const channelId = setting?.value?.channels?.reminders || env.DISCORD_OPERATION_REMINDERS_CHANNEL_ID;
        await validateTextDestination({ guildId, channelId, discord: discord.get });
        if (!mayManageOperation(await authorize(job.actorId, { officer: true }), op)) throw new CommandError(403, "MANAGER_REQUIRED", "Reminder authority changed.");
        const url = operationBriefingUrl(op.id, env.NEXTAUTH_URL || env.AUTH_URL);
        // Persist intent outside the transaction so a crash after Discord accepts the POST cannot become a blind retry.
        await prisma.commandOperationReminder.updateMany({ where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING" }, data: { sendingAt: new Date() } });
        attempted = true;
        const sent = await discord.post(`/channels/${channelId}/messages`, {
          content: `Operation reminder: ${op.input.title.replace(/@/g, "@\u200b")}\nStarts <t:${Math.floor(Date.parse(op.input.start) / 1000)}:R>\n${url}`,
          allowed_mentions: { parse: [] }, nonce: job.id.replaceAll("-", "").slice(0, 25), enforce_nonce: true,
        });
        await tx.commandOperationReminder.update({ where: { id: job.id }, data: { status: "POSTED", messageId: sent.id, leaseUntil: null, errorCode: null } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_REMINDER_POSTED", targetType: "CommandOperation", targetId: op.id, metadata: { reminderId: job.id, channelId, messageId: sent.id } } });
      }, { timeout: 90000 });
    } catch (error) {
      const ambiguous = error.code === "AMBIGUOUS" || (attempted && ![400, 401, 403, 404, 422, 429].includes(error.status));
      const status = ambiguous ? "AMBIGUOUS" : [401, 403, 404, 409, 422].includes(error.status) ? "BLOCKED" : job.attempts >= 6 ? "FAILED" : "PENDING";
      await prisma.commandOperationReminder.updateMany({ where: { id: job.id, leaseToken: job.leaseToken }, data: {
        status, errorCode: String(error.code || `DISCORD_${error.status || "UNAVAILABLE"}`).slice(0, 80), leaseUntil: null,
        ...(!ambiguous ? { sendingAt: null } : {}), availableAt: new Date(Date.now() + Math.max(Number(error.retry_after || 0) * 1000, Math.min(300000, 2000 * 2 ** job.attempts))),
      } });
    }
  }
  return { claim, processJob, async tick() {
    if (running || env.COMMAND_ADVANCED_OPERATIONS_ENABLED !== "true" || env.COMMAND_DISCORD_DELIVERY_ENABLED !== "true" || env.COMMAND_DASHBOARD_ENABLED !== "true") return;
    running = true;
    try { for (let i = 0; i < 10; i++) { const job = await claim(); if (!job) break; await processJob(job); } }
    catch { console.error("command.reminders.unavailable"); }
    finally { running = false; }
  } };
}
