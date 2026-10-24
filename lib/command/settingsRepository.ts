import type { PrismaClient } from "@prisma/client";
import { CommandError } from "./access.js";
import { defaultCommandSettings, validateCommandSettings } from "./settings.js";

export function createSettingsRepository(prisma: PrismaClient) {
  return {
    async read(guildId: string) {
      const row = await prisma.siteSetting.findUnique({ where: { key: `command:${guildId}:settings` } });
      return row ? validateCommandSettings(row.value) : defaultCommandSettings();
    },
    async save(guildId: string, input: ReturnType<typeof validateCommandSettings>, actorId: string, recheck: () => Promise<void>) {
      const key = `command:${guildId}:settings`;
      try {
        return await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT key FROM site_settings WHERE key = ${key} FOR UPDATE`;
          const row = await tx.siteSetting.findUnique({ where: { key } });
          const current = row ? validateCommandSettings(row.value) : defaultCommandSettings();
          if (current.revision !== input.revision) throw new CommandError(409, "STALE_REVISION", "Settings changed. Reload the latest version before saving.");
          const value = { ...input, revision: current.revision + 1 };
          await tx.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
          await tx.auditLog.create({ data: { actorId, action: "COMMAND_SETTINGS_UPDATED", targetType: "COMMAND_SETTINGS", targetId: key, metadata: { revision: value.revision, fields: ["channels", "skillWeight", "preferenceWeight"] } } });
          await recheck();
          return value;
        }, { isolationLevel: "Serializable", timeout: 15_000 });
      } catch (error) {
        if (error instanceof CommandError) throw error;
        if (error && typeof error === "object" && "code" in error && ["P2002", "P2034"].includes(String(error.code)))
          throw new CommandError(409, "STALE_REVISION", "Settings changed concurrently. Reload and retry.");
        throw new CommandError(503, "SETTINGS_UNAVAILABLE", "Settings could not be saved. Please retry.");
      }
    },
  };
}
