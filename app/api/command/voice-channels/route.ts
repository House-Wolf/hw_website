import { NextRequest } from "next/server";
import { commandHttp } from "@/lib/command/http";
import { authorize, discordRead } from "@/lib/command/server";
import { CommandError } from "@/lib/command/access.js";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return commandHttp(request, false, async (userId) => {
    const actor = await authorize(userId, { officer: true });
    const channels = await discordRead(`/guilds/${actor.guildId}/channels`);
    if (!Array.isArray(channels)) throw new CommandError(503, "INVALID_PROVIDER_RESPONSE", "Voice channels could not be loaded.");
    return channels.filter((row) => row.guild_id === actor.guildId && row.type === 2).map((row) => ({ id: row.id, name: row.name })).sort((a, b) => a.name.localeCompare(b.name));
  });
}
