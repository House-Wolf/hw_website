import { ApplicationCommandPermissionType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
import { ACTIVITY_RECIPIENTS } from "./discordActivity.js";

export const HISTORY_ROLE_IDS = [PERSONNEL_ROLES.warlord, PERSONNEL_ROLES.hand];

export function historyCommandDefinition() {
  return new SlashCommandBuilder().setName("history")
    .setDescription("Command: DM activity history and a new RSI membership review to both commanders")
    .setDefaultMemberPermissions(0).toJSON();
}

export async function registerHistoryCommand(client, guildId, permissionsToken) {
  const guild = await client.guilds.fetch(guildId);
  const commands = await guild.commands.fetch();
  const existing = commands.find(command => command.name === "history");
  const command = existing ? await guild.commands.edit(existing.id, historyCommandDefinition()) : await guild.commands.create(historyCommandDefinition());
  if (permissionsToken) {
    await guild.commands.permissions.set({ command: command.id, token: permissionsToken, permissions: [
      { id: guildId, type: ApplicationCommandPermissionType.Role, permission: false },
      ...HISTORY_ROLE_IDS.map(id => ({ id, type: ApplicationCommandPermissionType.Role, permission: true })),
    ] });
  }
  return command;
}

export function attachActivityInteractions(client, service, { guildId, logger = console }) {
  const handler = async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "history") return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (interaction.guildId !== guildId) throw new Error("Activity history is restricted to the House Wolf server.");
      const result = await service.requestReport({ actorId: interaction.user.id, requestedAt: new Date(interaction.createdTimestamp) });
      const names = ["CutterWolf", "Sentinel_Wolf"];
      const statuses = ACTIVITY_RECIPIENTS.map((id, index) => `**${names[index]}:** ${result.pendingRecipientIds.includes(id) ? "Delivery queued; the bot will retry automatically." : "DM delivered."}`);
      await interaction.editReply({ allowedMentions: { parse: [] }, embeds: [{ color: 0x114e62,
        author: { name: "HOUSE WOLF  /  COMMAND" }, title: "ACTIVITY HISTORY · DISPATCH",
        description: statuses.join("\n"), fields: [{ name: "REPORT CONTENTS", value: "Discord activity summary, RSI membership review, and the complete CSV roster." },
          { name: "NEXT QUARTERLY REPORT", value: `<t:${Math.floor(new Date(result.nextReportAt).getTime() / 1000)}:f> · Schedule unchanged.` }],
        footer: { text: "Strength, Honor, Death · House Wolf Command" } }] });
    } catch (error) {
      logger.error("Activity history command failed:", error.message);
      const denied = /Only the Clan Warlord|restricted to the House Wolf/.test(error.message);
      const content = denied ? error.message : "The activity review could not be completed. Please try again shortly; command can check the bot logs if this continues.";
      try {
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content, allowedMentions: { parse: [] } });
        else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      } catch (replyError) { logger.error("Could not acknowledge activity history:", replyError.message); }
    }
  };
  client.on("interactionCreate", handler);
  return () => client.off("interactionCreate", handler);
}
