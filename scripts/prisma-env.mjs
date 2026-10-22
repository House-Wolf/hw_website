import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Match the bot/Next.js environment precedence without overriding platform envs.
const root = fileURLToPath(new URL("../", import.meta.url));
const environment = process.env.NODE_ENV || "development";
dotenv.config({ path: [`.env.${environment}.local`, ".env.local", `.env.${environment}`, ".env"].map(path => fileURLToPath(new URL(path, new URL("../", import.meta.url)))), quiet: true });
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...process.argv.slice(2)], { cwd: root, env: process.env, stdio: "inherit" });
if (result.error) {
  console.error(`Could not start Prisma: ${result.error.code || "unknown error"}`);
}
process.exit(result.status ?? 1);
