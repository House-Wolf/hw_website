import fs from "node:fs";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const database = process.env.COMMAND_TEST_DATABASE_URL || "postgresql://command_test:command_test@127.0.0.1:15432/housewolf_command_test";
const parsed = new URL(database);
if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) || parsed.pathname !== "/housewolf_command_test") throw new Error("Use the named disposable loopback database only.");
const environment = { ...process.env };
// Defined empty values prevent Next/Prisma from loading local production secrets.
for (const name of fs.readdirSync(".").filter((name) => name.startsWith(".env") && fs.statSync(name).isFile()))
  for (const key of Object.keys(dotenv.parse(fs.readFileSync(name)))) environment[key] = "";
Object.assign(environment, {
  CI: "true", COMMAND_BUILD_FIXTURES: "1", DATABASE_URL: database, COMMAND_TEST_DATABASE_URL: database,
  NODE_ENV: "production", COMMAND_DASHBOARD_ENABLED: "false", COMMAND_DISCORD_DELIVERY_ENABLED: "false",
  ONBOARDING_ENABLED: "false", PERSONNEL_ENABLED: "false", BOT_HTTP_ENABLED: "false",
  NEXTAUTH_URL: "http://127.0.0.1:3000", AUTH_URL: "http://127.0.0.1:3000",
  AUTH_SECRET: "disposable-build-secret-not-for-production", NEXTAUTH_SECRET: "disposable-build-secret-not-for-production",
  DISCORD_CLIENT_ID: "fixture-not-a-live-id", DISCORD_CLIENT_SECRET: "fixture-not-a-live-secret",
  DISCORD_BOT_TOKEN: "fixture-not-a-live-token", DISCORD_GUILD_ID: "fixture-not-a-live-guild",
  BUYER_ROLE_ID: "fixture-not-a-live-role", MARKETPLACE_CHANNEL_ID: "fixture-not-a-live-channel",
  R2_ACCOUNT_ID: "fixture", R2_ACCESS_KEY_ID: "fixture", R2_SECRET_ACCESS_KEY: "fixture", R2_BUCKET: "fixture", R2_BUCKET_NAME: "fixture", R2_PUBLIC_URL: "https://example.invalid",
  NODE_OPTIONS: `--import=${new URL("./command-build-fixtures.mjs", import.meta.url).href}`,
});
const groups = {
  check: [["lint"], ["typecheck"], ["exec", "prisma", "validate"], ["test:bot"], ["test"]],
  migrate: [["exec", "prisma", "migrate", "deploy"]],
  integration: [["test:command:db"]],
  build: [["build"]],
  drift: [["exec", "prisma", "migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--script"]],
};
const mode = process.argv[2] || "check";
if (!Object.hasOwn(groups, mode)) throw new Error("Use check, migrate, integration or build.");
for (const args of groups[mode]) {
  console.log(`Verification: pnpm ${args.join(" ")} (disposable configuration)`);
  const result = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, { env: environment, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
