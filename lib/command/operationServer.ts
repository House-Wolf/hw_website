import "server-only";
import { prisma } from "@/lib/prisma";
import { authorize, discordRead } from "./server";
import { createOperationService } from "./operations.js";
import { nativePreflight, validateGuildVoiceChannel } from "./nativePreflight.js";
import { createCommitmentPolicy, scheduleReminders, assertReserveSchedule } from "./planningPolicy.js";
const advanced = (process.env.COMMAND_ADVANCED_OPERATIONS_ENABLED === "true" && process.env.COMMAND_STAFFING_ENABLED === "true");
export const operationService = createOperationService({ prisma, authorize,
  commitmentPolicy: advanced ? createCommitmentPolicy({ authorize }) : null,
  operationChanged: advanced ? scheduleReminders : null,
  reserveScheduleCheck: advanced ? assertReserveSchedule : null,
  staffingEnabled: process.env.COMMAND_STAFFING_ENABLED === "true",
  preflight: (guildId: string, input: Parameters<typeof nativePreflight>[1]) => nativePreflight(guildId, input, discordRead),
  baseUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL,
  announcementChannel: process.env.DISCORD_EVENTS_CHANNEL_ID || "",
  resolveVoiceChannelName: async (guildId: string, channelId: string) => {
    const channel = await validateGuildVoiceChannel(guildId, channelId, discordRead);
    return typeof channel.name === "string" ? channel.name : null;
  },
  readNative: (guildId: string) => discordRead(`/guilds/${guildId}/scheduled-events`),
  validateVoice: (guildId: string, channelId: string) => validateGuildVoiceChannel(guildId, channelId, discordRead),
});
