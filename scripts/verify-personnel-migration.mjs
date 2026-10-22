import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const environment = process.env.NODE_ENV || "development";
dotenv.config({ path: [`.env.${environment}.local`, ".env.local", `.env.${environment}`, ".env"].map(path => fileURLToPath(new URL(`../${path}`, import.meta.url))), quiet: true });
const prisma = new PrismaClient();
const guildId = `migration-verification-${randomUUID()}`;
const rollback = new Error("Verification complete; roll back all test rows");

try {
  const indexes = await prisma.$queryRaw`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'personnel_role_assignments_one_pending_member'`;
  assert.equal(indexes.length, 1, "The pending-member unique index must exist");
  assert.match(indexes[0].indexdef, /CREATE UNIQUE INDEX/);
  for (const status of ["PENDING", "EXECUTING", "RETRY"]) assert.ok(indexes[0].indexdef.includes(status));
  await assert.rejects(prisma.$transaction(async transaction => {
    const data = { guildId, discordId: "test-member", actorId: "test-actor", commandKey: "test-command", roleId: "test-role", action: "ADD" };
    await transaction.personnelRoleAssignment.create({ data });
    for (const status of ["PENDING", "EXECUTING", "RETRY"]) {
      await transaction.$executeRawUnsafe("SAVEPOINT verify_unique");
      await assert.rejects(transaction.personnelRoleAssignment.create({ data: { ...data, status } }), error => error.code === "P2002");
      await transaction.$executeRawUnsafe("ROLLBACK TO SAVEPOINT verify_unique");
    }
    for (const status of ["COMPLETED", "CANCELLED"]) await transaction.personnelRoleAssignment.create({ data: { ...data, status } });
    // A separate member may have a pending assignment at the same time.
    await transaction.personnelRoleAssignment.create({ data: { ...data, discordId: "other-member" } });
    for (const invalid of [{ action: "INVALID" }, { status: "INVALID" }]) {
      await transaction.$executeRawUnsafe("SAVEPOINT verify_check");
      const constraint = `personnel_role_assignments_${Object.keys(invalid)[0]}_check`;
      await assert.rejects(transaction.personnelRoleAssignment.create({ data: { ...data, discordId: randomUUID(), ...invalid } }), error => error.message.includes('code: "23514"') && error.message.includes(constraint));
      await transaction.$executeRawUnsafe("ROLLBACK TO SAVEPOINT verify_check");
    }
    throw rollback;
  }, { timeout: 30_000 }), error => error === rollback);
  assert.equal(await prisma.personnelRoleAssignment.count({ where: { guildId } }), 0, "Verification must leave no test rows behind");
  console.log("Personnel migration verified: pending-job uniqueness, terminal history, action/status constraints, and clean rollback.");
} finally {
  await prisma.$disconnect();
}
