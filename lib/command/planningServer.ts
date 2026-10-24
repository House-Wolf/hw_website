import "server-only";
import { prisma } from "@/lib/prisma";
import { authorize, discordRead } from "./server";
import { validateTextDestination } from "./channels.js";
import { crewService } from "./staffingServer";
import { createOperationsManagement } from "./operationsManagement.js";
import { CommandError, isOfficer } from "./access.js";

export function requireAdvancedOperations() {
  if (process.env.COMMAND_ADVANCED_OPERATIONS_ENABLED !== "true" || process.env.COMMAND_STAFFING_ENABLED !== "true") throw new CommandError(503, "ADVANCED_DISABLED", "Advanced operation planning is not enabled yet.");
}
export const operationsManagement = createOperationsManagement({ prisma, authorize, crewService, reminderChannel: process.env.DISCORD_OPERATION_REMINDERS_CHANNEL_ID || "", validateReminderChannel: (guildId: string, channelId: string) => validateTextDestination({ guildId, channelId, discord: discordRead }) });

export async function browseOperations(userId: string, params: URLSearchParams) {
  const actor = await authorize(userId);
  const q = (params.get("q") || "").trim();
  const state = params.get("state") || "ALL", entityType = params.get("type") || "ALL";
  const page = Number(params.get("page") || "1"), pageSize = Number(params.get("pageSize") || "12");
  const fromRaw = params.get("from") || "", toRaw = params.get("to") || "";
  if ((fromRaw || toRaw) && (!Number.isFinite(Date.parse(fromRaw)) || !Number.isFinite(Date.parse(toRaw)))) throw new CommandError(422, "INVALID_RANGE", "Choose valid start and end dates.");
  const from = fromRaw ? new Date(fromRaw).toISOString() : "", to = toRaw ? new Date(toRaw).toISOString() : "";
  if (q.length > 100 || !["ALL", "DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"].includes(state) || !["ALL", "VOICE", "EXTERNAL"].includes(entityType) || !Number.isInteger(page) || page < 1 || page > 100000 || ![12, 24, 100, 500].includes(pageSize)) throw new CommandError(422, "INVALID_FILTER", "Choose valid operation filters.");
  if ((from || to) && (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(to) <= Date.parse(from) || Date.parse(to) - Date.parse(from) > 93 * 86400000)) throw new CommandError(422, "INVALID_RANGE", "Choose a date range of up to 93 days.");
  const leadership = isOfficer(actor.roleIds), pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const [items, totals] = await Promise.all([
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT id, input - 'imageData' AS input, state, revision, "guildId", "nativeEventId", "syncState"
      FROM command_operations WHERE "guildId" = ${actor.guildId}
        AND (${leadership} OR (state <> 'DRAFT' AND input->>'visibility' = 'GUILD'))
        AND (${state} = 'ALL' OR state = ${state})
        AND (${entityType} = 'ALL' OR input->>'entityType' = ${entityType})
        AND (${q} = '' OR input->>'title' ILIKE ${pattern})
        AND (${from} = '' OR input->>'start' >= ${from}) AND (${to} = '' OR input->>'start' < ${to})
      ORDER BY input->>'start' ASC, id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM command_operations WHERE "guildId" = ${actor.guildId}
        AND (${leadership} OR (state <> 'DRAFT' AND input->>'visibility' = 'GUILD'))
        AND (${state} = 'ALL' OR state = ${state})
        AND (${entityType} = 'ALL' OR input->>'entityType' = ${entityType})
        AND (${q} = '' OR input->>'title' ILIKE ${pattern})
        AND (${from} = '' OR input->>'start' >= ${from}) AND (${to} = '' OR input->>'start' < ${to})`,
  ]);
  return { items, total: Number(totals[0]?.count || 0), page, pageSize, advancedEnabled: (process.env.COMMAND_ADVANCED_OPERATIONS_ENABLED === "true" && process.env.COMMAND_STAFFING_ENABLED === "true") };
}
