import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { CommandError } from "../lib/command/access.js";
import * as settings from "../lib/command/settings.js";

const raw = process.env.COMMAND_TEST_DATABASE_URL;
if (!raw) throw new Error("COMMAND_TEST_DATABASE_URL is required. No environment files are loaded.");
const url = new URL(raw);
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/housewolf_command_test")
  throw new Error("Refusing integration tests outside the named loopback disposable database.");
const prisma = new PrismaClient({ datasources: { db: { url: raw } } });
const code = ts.transpileModule(readFileSync(new URL("../lib/command/settingsRepository.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(name) { if (name === "./access.js") return { CommandError }; if (name === "./settings.js") return settings; throw new Error("Unexpected dependency " + name); } });
const repository = loaded.exports.createSettingsRepository(prisma);
const actorId = randomUUID(), guild = `integration-${randomUUID()}`;
before(async () => { await prisma.user.create({ data: { id: actorId, discordId: `test-${actorId}`, discordUsername: "Disposable integration actor" } }); });
after(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId } });
  await prisma.siteSetting.deleteMany({ where: { key: { startsWith: `command:${guild}` } } });
  await prisma.user.deleteMany({ where: { id: actorId } });
  await prisma.$disconnect();
});

test("actual PostgreSQL transaction persists revision, actor audit and separate guild scope", async () => {
  const saved = await repository.save(guild, settings.defaultCommandSettings(), actorId, async () => {});
  assert.equal(saved.revision, 1);
  assert.equal((await repository.read(guild)).revision, 1);
  assert.equal((await repository.read(guild + "-other")).revision, 0);
  const audit = await prisma.auditLog.findFirst({ where: { actorId, targetId: `command:${guild}:settings` } });
  assert.equal(audit.action, "COMMAND_SETTINGS_UPDATED");
  assert.equal(audit.metadata.revision, 1);
});
test("revoked authority rolls back both settings and audit before commit", async () => {
  const current = await repository.read(guild);
  const before = await prisma.auditLog.count({ where: { actorId } });
  await assert.rejects(repository.save(guild, current, actorId, async () => { throw new CommandError(403, "REVOKED", "Revoked"); }), (error) => error.status === 403);
  assert.equal((await repository.read(guild)).revision, current.revision);
  assert.equal(await prisma.auditLog.count({ where: { actorId } }), before);
});
test("simultaneous writes cannot overwrite the same revision", async () => {
  for (let iteration = 0; iteration < 10; iteration++) {
  const current = await repository.read(guild);
  const outcomes = await Promise.allSettled([
    repository.save(guild, { ...current, skillWeight: 30, preferenceWeight: 70 }, actorId, async () => {}),
    repository.save(guild, { ...current, skillWeight: 70, preferenceWeight: 30 }, actorId, async () => {}),
  ]);
  assert.equal(outcomes.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(outcomes.find((row) => row.status === "rejected").reason.status, 409);
  assert.equal((await repository.read(guild)).revision, current.revision + 1);
  }
});
