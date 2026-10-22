import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { COMMAND_DEFINITIONS, SERVICE_RANKS } from "../lib/personnel/policy.js";

export function personnelCommandDefinition() {
  const command = new SlashCommandBuilder().setName("personnel").setDescription("House Wolf service records, promotions, and command assignments");
  command.addSubcommand((subcommand) => subcommand.setName("accept-application").setDescription("Record accepted application and a verified Discord-to-RSI identity")
    .addUserOption((option) => option.setName("member").setDescription("Discord member whose RSI identity you have verified").setRequired(true))
    .addStringOption((option) => option.setName("rsi-handle").setDescription("Verified RSI handle, not just a matching Discord name").setRequired(true).setMaxLength(60))
    .addStringOption((option) => option.setName("evidence").setDescription("Application acceptance and identity verification evidence").setRequired(true).setMinLength(10).setMaxLength(1000))
    .addBooleanOption((option) => option.setName("rsi-confirmed").setDescription("You have also confirmed actual CUTTERWOLF membership on RSI")));
  command.addSubcommand((subcommand) => subcommand.setName("service-history").setDescription("Warlord: import a verified start date for a member's existing rank")
    .addUserOption((option) => option.setName("member").setDescription("Existing member").setRequired(true))
    .addStringOption((option) => option.setName("rank").setDescription("Must match their current Discord rank").setRequired(true).addChoices(...SERVICE_RANKS.map((rank) => ({ name: rank.name, value: rank.roleId }))))
    .addStringOption((option) => option.setName("since").setDescription("Actual date this rank began, YYYY-MM-DD").setRequired(true))
    .addStringOption((option) => option.setName("evidence").setDescription("Source of the historical service date").setRequired(true).setMinLength(10).setMaxLength(1000)));
  command.addSubcommand((subcommand) => subcommand.setName("initialize-commands").setDescription("Warlord: map the four command groups from exact Discord role names"));
  command.addSubcommand((subcommand) => subcommand.setName("assign-role").setDescription("Captain: assign or remove a specialist role within your own command")
    .addStringOption((option) => option.setName("command").setDescription("Your command").setRequired(true).addChoices(...COMMAND_DEFINITIONS.map((definition) => ({ name: definition.name, value: definition.key }))))
    .addUserOption((option) => option.setName("member").setDescription("House Wolf member").setRequired(true))
    .addStringOption((option) => option.setName("role").setDescription("An approved specialist role in your command").setRequired(true).setAutocomplete(true))
    .addStringOption((option) => option.setName("action").setDescription("Add or remove this specialist role").setRequired(true).addChoices({ name: "Assign", value: "ADD" }, { name: "Remove", value: "REMOVE" })));
  return command.toJSON();
}

export async function registerPersonnelCommand(client, guildId) {
  const guild = await client.guilds.fetch(guildId);
  const commands = await guild.commands.fetch();
  const existing = commands.find((command) => command.name === "personnel");
  if (existing) await guild.commands.edit(existing.id, personnelCommandDefinition());
  else await guild.commands.create(personnelCommandDefinition());
}

export function attachPersonnelInteractions(client, service, config) {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isAutocomplete() && interaction.commandName === "personnel") {
      try {
        if (interaction.guildId !== config.guildId || interaction.options.getSubcommand() !== "assign-role" || interaction.options.getFocused(true).name !== "role") {
          await interaction.respond([]);
          return;
        }
        const choices = await service.commandRoleChoices(interaction.options.getString("command"), interaction.options.getFocused());
        await interaction.respond(choices);
      } catch (error) {
        console.error("Personnel role suggestions failed:", error.message);
        try { await interaction.respond([]); } catch {}
      }
      return;
    }
    const promotionButton = interaction.isButton() && interaction.customId.startsWith("hw:promotion:");
    const personnelCommand = interaction.isChatInputCommand() && interaction.commandName === "personnel";
    if (!promotionButton && !personnelCommand) return;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (interaction.guildId !== config.guildId) throw new Error("Personnel orders are restricted to the House Wolf server.");
      if (promotionButton) {
        const match = /^hw:promotion:(APPROVE|REJECT):([0-9a-f-]{36})$/.exec(interaction.customId);
        if (!match) throw new Error("Invalid personnel order button.");
        const result = await service.castVote({ requestId: match[2], decision: match[1], actorId: interaction.user.id, messageId: interaction.message.id, channelId: interaction.channelId });
        await interaction.editReply(result.status === "VETOED" ? "Clan Warlord veto recorded. This advancement is rejected." : result.status === "APPROVED" ? "Promotion approved. Role reconciliation and the announcement are queued; failures will be retried." : `Ballot recorded: ${result.approvals} approval(s), ${result.rejections} rejection(s), ${result.score} net approval(s).`);
        return;
      }
      const action = interaction.options.getSubcommand();
      if (action === "accept-application") {
        const record = await service.acceptApplication({ actorId: interaction.user.id, discordId: interaction.options.getUser("member", true).id, rsiHandle: interaction.options.getString("rsi-handle", true), evidence: interaction.options.getString("evidence", true), rsiConfirmed: interaction.options.getBoolean("rsi-confirmed") === true });
        await interaction.editReply(record.membershipConfirmedAt ? "Acceptance and RSI identity/membership confirmation recorded. Foundling reconciliation is queued automatically; no officer ballot is required." : "Application acceptance and RSI identity recorded. Foundling remains blocked until organization membership is confirmed. Configure the membership API or submit confirmed RSI evidence.");
      } else if (action === "service-history") {
        await service.recordHistory({ actorId: interaction.user.id, discordId: interaction.options.getUser("member", true).id, rankRoleId: interaction.options.getString("rank", true), since: interaction.options.getString("since", true), evidence: interaction.options.getString("evidence", true) });
        await interaction.editReply("Verified time in rank recorded. If the required term is complete, the officer review is queued.");
      } else if (action === "initialize-commands") {
        await interaction.editReply((await service.initializeCommands(interaction.user.id)).join("\n"));
      } else if (action === "assign-role") {
        const assignment = await service.assignCommandRole({ actorId: interaction.user.id, discordId: interaction.options.getUser("member", true).id, commandKey: interaction.options.getString("command", true), roleId: interaction.options.getString("role", true), action: interaction.options.getString("action", true) });
        await interaction.editReply(assignment.status === "COMPLETED" ? "Specialist assignment confirmed and entered into the command log." : assignment.status === "CANCELLED" ? "Assignment cancelled because membership or command authority changed. The website has been reconciled with Discord." : "Specialist assignment saved. Discord and website reconciliation is pending and will retry automatically.");
      }
    } catch (error) {
      console.error("Personnel interaction failed:", error.message);
      const content = String(error.message).replace(/@/g, "＠").slice(0, 1500);
      try {
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content, allowedMentions: { parse: [] } });
        else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      } catch (replyError) { console.error("Could not report personnel interaction:", replyError.message); }
    }
  });
}

