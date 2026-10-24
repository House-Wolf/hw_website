import { randomUUID } from "node:crypto";
import { REST } from "discord.js";
import { createAuthorizer, CommandError, mayManageOperation } from "../lib/command/access.js";
import { nativePreflight } from "../lib/command/nativePreflight.js";
import { validateTextDestination } from "../lib/command/channels.js";
import { deliverNative, reconcileNative } from "../lib/command/nativeDelivery.js";
import { lockOperation } from "../lib/command/operations.js";

export function createCommandWorker({ prisma, client, env = process.env }) {
  let timer, stopped = false, running = false;
  const guildId = env.DISCORD_GUILD_ID;
  const rest = env.DISCORD_BOT_TOKEN ? new REST({ version: "10", timeout: 15000, retries: 0, rejectOnRateLimit: () => true }).setToken(env.DISCORD_BOT_TOKEN) : client.rest;
  async function remoteCall(method, path, body) {
    try { return await rest[method](path, ...(body === undefined ? [] : [{ body }])); }
    catch (error) {
      if (error.name === "RateLimitError") throw Object.assign(new Error("Discord rate limited"), { status: 429, retry_after: Math.max(error.retryAfter || 0, error.timeToReset || 0) / 1000 });
      throw error;
    }
  }
  const discord = {
    async get(path) { try { return await remoteCall("get", path); } catch (error) { if (error.status === 404) return null; throw error; } },
    post: (path, body) => remoteCall("post", path, body),
    patch: (path, body) => remoteCall("patch", path, body),
  };
  const authorize = createAuthorizer({ guildId,
    loadAccount: (id) => prisma.user.findUnique({ where: { id }, select: { id: true, discordId: true, isActive: true } }),
    async loadMember(guild, user) { const member = await discord.get(`/guilds/${guild}/members/${user}`); return member ? { guildId: guild, userId: member.user.id, roleIds: member.roles } : null; },
  });
  async function claim() {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT d.id FROM command_deliveries d JOIN command_operations o ON o.id=d."operationId" WHERE o."guildId"=${guildId} AND ((d.status='PENDING' AND d."availableAt" <= now()) OR (d.status='PROCESSING' AND d."leaseUntil" < now())) ORDER BY d."createdAt" FOR UPDATE OF d SKIP LOCKED LIMIT 1`;
      if (!rows.length) return null;
      return tx.commandDelivery.update({ where: { id: rows[0].id }, data: { status: "PROCESSING", attempts: { increment: 1 }, leaseToken: randomUUID(), leaseUntil: new Date(Date.now() + 180000) } });
    });
  }
  async function processJob(job) {
    const recoveredSending = !!job.sendingAt;
    try {
      // Commit intent BEFORE any remote write; loss after send cannot become a blind POST.
      await prisma.commandDelivery.updateMany({ where: { id: job.id, leaseToken: job.leaseToken }, data: { sendingAt: new Date() } });
      await prisma.$transaction(async (tx) => {
        const op = await lockOperation(tx, job.operationId, guildId);
        if (op.revision !== job.revision) {
          // An interrupted older create may have succeeded before a newer revision was queued.
          if (recoveredSending && !op.nativeEventId && job.kind === "NATIVE") {
            const marker = new URL(`/dashboard/operations/${op.id}`, env.NEXTAUTH_URL).href;
            const matches = (await discord.get(`/guilds/${guildId}/scheduled-events`)).filter((e) => e.description?.includes(marker));
            if (matches.length === 1) await tx.commandOperation.update({ where: { id: op.id }, data: { nativeEventId: matches[0].id, nativeSnapshot: (await import("../lib/command/eventInput.js")).nativeSnapshot(matches[0]) } });
            else throw new CommandError(409, "AMBIGUOUS", "An interrupted older create requires operator review.");
          }
          await tx.commandDelivery.update({ where: { id: job.id }, data: { status: "SUPERSEDED", leaseUntil: null } }); return;
        }
        if (job.kind === "NATIVE") {
          const unresolved = !op.nativeEventId && await tx.commandDelivery.count({ where: { operationId: op.id, kind: "NATIVE", status: "AMBIGUOUS", id: { not: job.id } } });
          if (unresolved) throw new CommandError(409, "AMBIGUOUS", "An older uncertain native creation must be reconciled first.");
          const result = await deliverNative({ operation: op, job: { ...job, recoveredSending }, authorize, discord, preflight: (guild, input) => nativePreflight(guild, input, discord.get), baseUrl: env.NEXTAUTH_URL });
          await tx.commandOperation.update({ where: { id: op.id }, data: result });
          await tx.commandDelivery.update({ where: { id: job.id }, data: { status: result.syncState === "CLEAN" ? "POSTED" : "BLOCKED", errorCode: result.syncState === "CLEAN" ? null : result.syncState, leaseUntil: null } });
        } else {
          const actor = await authorize(job.actorId, { officer: true });
          if (!mayManageOperation(actor, op) || op.input.visibility !== "GUILD") throw new CommandError(403, "ANNOUNCEMENT_BLOCKED", "Announcement authority or audience invalid.");
          const native = await tx.commandDelivery.findUnique({ where: { operationId_revision_kind: { operationId: op.id, revision: op.revision, kind: "NATIVE" } } });
          if (native?.status !== "POSTED") throw new CommandError(503, "NATIVE_PENDING", "Native delivery is not confirmed.");
          const channelId = op.announcementChannelId || env.DISCORD_EVENTS_CHANNEL_ID;
          await validateTextDestination({ guildId, channelId, discord: discord.get });
          const marker = new URL(`/dashboard/operations/${op.id}`, env.NEXTAUTH_URL).href;
          let messageId = op.announcementId;
          const body = { content: `${op.input.title}\nStatus: ${op.state}\n${marker}${op.nativeEventId ? `\nhttps://discord.com/events/${guildId}/${op.nativeEventId}` : ""}\nInterested is not a confirmed commitment. Sign up on the dashboard.`, allowed_mentions: { parse: [] } };
          await authorize(job.actorId, { officer: true });
          if (messageId) await discord.patch(`/channels/${channelId}/messages/${messageId}`, body);
          else {
            if (recoveredSending) throw new CommandError(409, "AMBIGUOUS", "Review the channel for an earlier announcement before retrying.");
            const message = await discord.post(`/channels/${channelId}/messages`, { ...body, nonce: job.id.replaceAll("-", "").slice(0, 25), enforce_nonce: true });
            messageId = message.id;
          }
          await tx.commandOperation.update({ where: { id: op.id }, data: { announcementId: messageId, announcementChannelId: channelId } });
          await tx.commandDelivery.update({ where: { id: job.id }, data: { status: "POSTED", leaseUntil: null, errorCode: null } });
        }
      }, { timeout: 90000 });
    } catch (error) {
      const code = error.code || `DISCORD_${error.status || "UNAVAILABLE"}`;
      const blocked = [401, 403, 404, 409, 422].includes(error.status);
      const ambiguous = code === "AMBIGUOUS" || (!error.status && job.kind === "NATIVE");
      const rejected = (error instanceof CommandError && code !== "AMBIGUOUS") || [400, 401, 403, 404, 422, 429].includes(error.status);
      const status = ambiguous ? "AMBIGUOUS" : blocked ? "BLOCKED" : job.attempts >= 6 ? "FAILED" : "PENDING";
      // No brief, tokens or provider error payloads are logged/stored.
      await prisma.commandDelivery.updateMany({ where: { id: job.id, leaseToken: job.leaseToken }, data: { status, errorCode: String(code).slice(0, 80), leaseUntil: null, ...(rejected ? { sendingAt: null } : {}), availableAt: new Date(Date.now() + Math.max(Number(error.retry_after || 0) * 1000, Math.min(300000, 2000 * 2 ** job.attempts))) } });
    }
  }
  async function reconcile() {
    const operations = await prisma.commandOperation.findMany({ where: { guildId, nativeEventId: { not: null }, syncState: "CLEAN", state: { in: ["PUBLISHED", "ACTIVE"] } }, take: 100, orderBy: { updatedAt: "asc" } });
    for (const item of operations) {
      if (stopped) break;
      await prisma.$transaction(async (tx) => {
        const op = await lockOperation(tx, item.id, guildId);
        const pending = await tx.commandDelivery.count({ where: { operationId: op.id, revision: op.revision, status: { in: ["PENDING", "PROCESSING", "AMBIGUOUS"] } } });
        if (!pending && op.syncState === "CLEAN" && op.nativeEventId) {
          const result = await reconcileNative(op, discord);
          if (result) {
            await tx.commandOperation.update({ where: { id: op.id }, data: result });
            await tx.auditLog.create({ data: { action: "COMMAND_REMOTE_CHANGED", targetType: "CommandOperation", targetId: op.id, metadata: { syncState: result.syncState } } });
          }
        }
      }, { timeout: 20000 });
    }
  }
  async function tick() {
    if (running || stopped) return;
    running = true;
    try { for (let i = 0; i < 10 && !stopped; i++) { const job = await claim(); if (!job) break; await processJob(job); } await reconcile(); }
    catch { console.error("command.worker.unavailable"); }
    finally { running = false; }
  }
  return { tick, processJob, reconcile,
    start() { if (env.COMMAND_DISCORD_DELIVERY_ENABLED !== "true" || env.COMMAND_DASHBOARD_ENABLED !== "true") return; stopped = false; timer = setInterval(() => void tick(), 15000); timer.unref(); void tick(); },
    async stop() { stopped = true; clearInterval(timer); while (running) await new Promise((resolve) => setTimeout(resolve, 50)); },
  };
}
