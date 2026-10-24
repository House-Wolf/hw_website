import { CommandError } from "../lib/command/access.js";

export function createOperationCommitmentHandler({ prisma, operations, guildId }) {
  return async function handle(interaction) {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("hwop:")) return false;
    await interaction.deferReply({ flags: 64 });
    try {
      const parsed = /^hwop:([0-9a-f-]{36}):(\d{1,10}):(COMMITTED|TENTATIVE|RESERVE|WITHDRAWN)$/i.exec(interaction.customId);
      if (!parsed || interaction.guildId !== guildId) throw new CommandError(403, "WRONG_GUILD", "Use the current operation controls in the House Wolf server.");
      const op = await prisma.commandOperation.findFirst({ where: { id: parsed[1], guildId } });
      if (!op || op.announcementId !== interaction.message?.id || op.announcementChannelId !== interaction.channelId || op.revision !== Number(parsed[2]) || op.input.visibility !== "GUILD" || !["PUBLISHED", "ACTIVE"].includes(op.state)) throw new CommandError(409, "STALE_CONTROLS", "These operation controls are no longer current. Open the briefing for the latest status.");
      const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id }, select: { id: true, isActive: true } });
      if (!user?.isActive) throw new CommandError(403, "ACCOUNT_REQUIRED", "Sign in on the House Wolf website with this Discord account before committing.");
      const prior = await prisma.commandSignup.findUnique({ where: { operationId_userId: { operationId: op.id, userId: user.id } } });
      const result = await operations.signup(user.id, op.id, parsed[3].toUpperCase(), prior?.preferences || "");
      await interaction.editReply({ content: `Saved: ${result.status}. Open the briefing to see places, waitlist position and staffing. This does not record attendance.`, allowedMentions: { parse: [] } });
    } catch (error) {
      await interaction.editReply({ content: error instanceof CommandError ? error.message : "The commitment could not be saved. Please use the dashboard or retry shortly.", allowedMentions: { parse: [] } });
    }
    return true;
  };
}
