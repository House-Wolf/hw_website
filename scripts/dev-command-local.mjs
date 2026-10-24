import dotenv from "dotenv";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function previewEnvironment(source) {
  const database = source.COMMAND_TEST_DATABASE_URL || "postgresql://command_test:command_test@127.0.0.1:15432/housewolf_command_test";
  const parsed = new URL(database);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) || parsed.pathname !== "/housewolf_command_test") {
    throw new Error("Preview requires the named disposable loopback database.");
  }
  return { ...source, NODE_ENV: "development", DATABASE_URL: database,
    NEXTAUTH_URL: "http://localhost:3000", AUTH_URL: "http://localhost:3000",
    COMMAND_DASHBOARD_ENABLED: "true", COMMAND_STAFFING_ENABLED: "true",
    COMMAND_DISCORD_DELIVERY_ENABLED: "false", BOT_HTTP_ENABLED: "false",
    ONBOARDING_ENABLED: "false", PERSONNEL_ENABLED: "false" };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  dotenv.config({ path: [".env.development.local", ".env.local", ".env.development", ".env"].map((file) => resolve(root, file)), quiet: true });
  const require = createRequire(import.meta.url);
  const environment = previewEnvironment(process.env);
  // Check the migrated local schema before starting; never migrate the configured remote DB.
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: environment.DATABASE_URL });
  try {
    if (!prisma.commandShip) throw new Error("Generate the current Prisma client first.");
    await prisma.commandShip.count();
    await prisma.commandOperation.findFirst({ select: { crewRevision: true } });
  } finally { await prisma.$disconnect(); }
  console.log("Local preview: http://localhost:3000/dashboard — disposable database, staffing enabled, no bot worker or Discord delivery.");
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3000"], { cwd: root, env: environment, stdio: "inherit" });
  child.on("error", () => { console.error("Could not start the local web preview."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
}
