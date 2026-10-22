import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { acquireCommandAssignmentLock } from "../bot/personnelService.js";

const environment = process.env.NODE_ENV || "development";
dotenv.config({ path: [`.env.${environment}.local`, ".env.local", `.env.${environment}`, ".env"].map(path => fileURLToPath(new URL(`../${path}`, import.meta.url))), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

// Synthetic identifiers keep this check separate from every real member's lock.
// No application tables or Discord APIs are modified.
const guildId = "lock-verification";
const discordId = randomUUID();
const lockKey = `personnel-command:${guildId}:${discordId}`;
const holder = new PrismaClient();
const observer = new PrismaClient();
let release;
const released = new Promise(resolve => { release = resolve; });
let ready;
const acquired = new Promise(resolve => { ready = resolve; });
let holding;

async function canAcquire() {
  return observer.$transaction(async transaction => {
    const [result] = await transaction.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${lockKey}, 0)) AS "acquired"`;
    return result.acquired;
  });
}

try {
  holding = holder.$transaction(async transaction => {
    await acquireCommandAssignmentLock(transaction, guildId, discordId);
    ready();
    await released;
  }, { timeout: 20_000 });
  // Propagate connection/query failures instead of waiting forever for ready().
  await Promise.race([acquired, holding]);
  assert.equal(await canAcquire(), false, "A second transaction must not acquire an assignment lock already held.");
  release();
  await holding;
  assert.equal(await canAcquire(), true, "Commit must release the transaction lock.");

  const rollback = new Error("Expected rollback probe");
  await assert.rejects(holder.$transaction(async transaction => {
    await acquireCommandAssignmentLock(transaction, guildId, discordId);
    throw rollback;
  }), error => error === rollback);
  assert.equal(await canAcquire(), true, "Rollback must release the transaction lock.");
  console.log("Assignment lock verified against PostgreSQL: Prisma-compatible result, mutual exclusion, commit and rollback release. No member data or Discord roles changed.");
} finally {
  release();
  if (holding) await holding.catch(() => {});
  await Promise.all([holder.$disconnect(), observer.$disconnect()]);
}
