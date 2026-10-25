import { randomUUID } from "node:crypto";
import { CommandError, mayManageOperation } from "../lib/command/access.js";
import { lockOperation } from "../lib/command/operations.js";
import { validateTextDestination } from "../lib/command/channels.js";
import { aarMessage } from "../lib/command/aarDelivery.js";
import { aarContext, aarFooter } from "../lib/command/aarPresentation.js";
import { attendanceTotals } from "../lib/command/attendanceService.js";
import { operationBriefingUrl } from "../lib/command/commitmentComponents.js";

export function createOperationAarWorker({ prisma, authorize, discord, guildId, env = process.env }) {
  let running = false;
  async function claim() {
    return prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw`SELECT d.id FROM command_aar_deliveries d JOIN command_operations o ON o.id=d."operationId"
        WHERE o."guildId"=${guildId} AND ((d.status='PENDING' AND d."availableAt" <= now()) OR (d.status='PROCESSING' AND d."leaseUntil" < now()))
        ORDER BY d."availableAt", d.id FOR UPDATE OF d SKIP LOCKED LIMIT 1`;
      return rows.length ? tx.commandAarDelivery.update({ where: { id: rows[0].id }, data: { status: "PROCESSING", attempts: { increment: 1 }, leaseToken: randomUUID(), leaseUntil: new Date(Date.now() + 180000) } }) : null;
    });
  }
  async function processJob(job) {
    let attempted = false, creating = !job.messageId, uncertainRecovery = !!job.sendingAt && !job.messageId;
    try {
      await prisma.$transaction(async tx => {
        const op = await lockOperation(tx, job.operationId, guildId);
        const current = await tx.commandAarDelivery.findUnique({ where: { id: job.id } });
        if (current?.leaseToken !== job.leaseToken || current.status !== "PROCESSING") return;
        // Never load private officer notes or participant notes for a Discord payload.
        const report = await tx.commandDebrief.findUnique({ where: { operationId: op.id }, select: { summary: true, reportState: true, authorId: true, reviewerId: true, reviewedAt: true, finalizedAt: true } });
        if (!report || report.reportState !== "REVIEWED" || report.reviewedAt?.getTime() !== job.reviewedAt.getTime() || !["COMPLETED", "ARCHIVED"].includes(op.state)) {
          await tx.commandAarDelivery.update({ where: { id: job.id }, data: { status: "SUPERSEDED", leaseUntil: null } }); return;
        }
        if (op.input.visibility !== "GUILD") throw new CommandError(403, "PRIVATE_REPORT", "Private reports cannot be posted to a guild channel.");
        const checkAuthority = async () => {
          const author = await authorize(report.authorId, { officer: true });
          await authorize(report.reviewerId, { officer: true });
          const actor = await authorize(job.actorId, { officer: true });
          if (!mayManageOperation(author, op) || (actor.id !== report.reviewerId && !mayManageOperation(actor, op))) throw new CommandError(403, "AAR_AUTHORITY_CHANGED", "Report authority changed before Discord delivery.");
        };
        await checkAuthority();
        const setting = await tx.siteSetting.findUnique({ where: { key: `command:${guildId}:settings` } });
        const channelId = setting?.value?.channels?.aar || env.DISCORD_AAR_CHANNEL_ID;
        if (!channelId) throw new CommandError(422, "AAR_CHANNEL_REQUIRED", "Configure the AAR channel before sending a report.");
        if (current.channelId && current.channelId !== channelId && (current.messageId || current.sendingAt)) throw new CommandError(409, "AAR_CHANNEL_CHANGED", "The previous AAR channel must be reviewed before moving this report.");
        await validateTextDestination({ guildId, channelId, discord: discord.get, requireHistory: true });
        const context = aarContext(op), baseUrl = env.NEXTAUTH_URL || env.AUTH_URL;
        const attendance = report.finalizedAt ? attendanceTotals(await tx.commandAttendance.findMany({ where: { operationId: op.id }, select: { status: true } })) : null;
        const payload = aarMessage({ operationId: op.id, ...context, summary: report.summary, reviewRevision: job.reviewRevision, baseUrl, attendance });
        const files = context.bannerUrl?.startsWith("data:") ? [{ name: "operation-banner.jpg", data: Buffer.from(context.bannerUrl.split(",")[1], "base64"), contentType: "image/jpeg" }] : undefined;
        let messageId = current.messageId;
        if (current.sendingAt && !messageId) {
          const bot = await discord.get("/users/@me");
          const messages = await discord.get(`/channels/${channelId}/messages?limit=100`);
          const matches = Array.isArray(messages) ? messages.filter(message => message.author?.id === bot.id && message.embeds?.some(embed => embed.footer?.text === aarFooter(op.id) && embed.url === operationBriefingUrl(op.id, baseUrl))) : [];
          if (matches.length !== 1) throw new CommandError(409, "AAR_AMBIGUOUS", "An interrupted AAR send needs channel review; no duplicate was posted.");
          messageId = matches[0].id;
        }
        creating = !messageId;
        await checkAuthority();
        // Commit intent separately; a POST accepted before a crash cannot be blindly repeated.
        const intent = await prisma.commandAarDelivery.updateMany({ where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING" }, data: { sendingAt: new Date(), channelId, ...(messageId ? { messageId } : {}) } });
        if (intent.count !== 1) throw new CommandError(409, "AAR_LEASE_CHANGED", "AAR delivery changed before sending.");
        if (messageId) uncertainRecovery = false;
        attempted = true;
        const sent = messageId ? await discord.patch(`/channels/${channelId}/messages/${messageId}`, payload, files)
          : await discord.post(`/channels/${channelId}/messages`, { ...payload, nonce: job.id.replaceAll("-", "").slice(0, 25), enforce_nonce: true }, files);
        const savedMessageId = sent?.id || messageId;
        if (!savedMessageId) throw new CommandError(503, "AAR_RESPONSE_INVALID", "Discord did not confirm the report message.");
        await tx.commandAarDelivery.update({ where: { id: job.id }, data: { status: "POSTED", messageId: savedMessageId, channelId, sendingAt: null, leaseUntil: null, errorCode: null } });
        await tx.auditLog.create({ data: { actorId: job.actorId, action: "COMMAND_AAR_POSTED", targetType: "CommandOperation", targetId: op.id, metadata: { reviewRevision: job.reviewRevision, channelId, messageId: savedMessageId } } });
      }, { timeout: 90000 });
    } catch (error) {
      const statusCode = error.status;
      const ambiguous = uncertainRecovery || error.code === "AAR_AMBIGUOUS" || (attempted && creating && ![400, 401, 403, 404, 422, 429].includes(statusCode));
      const status = ambiguous ? "AMBIGUOUS" : [400, 401, 403, 404, 409, 422].includes(statusCode) ? "BLOCKED" : job.attempts >= 6 ? "FAILED" : "PENDING";
      await prisma.commandAarDelivery.updateMany({ where: { id: job.id, leaseToken: job.leaseToken }, data: { status, errorCode: String(error.code || `DISCORD_${statusCode || "UNAVAILABLE"}`).slice(0, 80), leaseUntil: null,
        ...(!ambiguous ? { sendingAt: null } : {}), availableAt: new Date(Date.now() + Math.max(Number(error.retry_after || 0) * 1000, Math.min(300000, 2000 * 2 ** job.attempts))) } });
    }
  }
  return { claim, processJob, async tick() {
    if (running || env.COMMAND_AAR_DELIVERY_ENABLED !== "true" || env.COMMAND_ATTENDANCE_ENABLED !== "true" || env.COMMAND_DISCORD_DELIVERY_ENABLED !== "true" || env.COMMAND_DASHBOARD_ENABLED !== "true") return;
    running = true;
    try { for (let i = 0; i < 5; i++) { const job = await claim(); if (!job) break; await processJob(job); } }
    catch { console.error("command.aar.unavailable"); }
    finally { running = false; }
  } };
}
