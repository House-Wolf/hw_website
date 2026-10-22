import { EmbedBuilder } from "discord.js";

export async function welcomeOnboardingMember(member) {
  if (process.env.ONBOARDING_ENABLED !== "true" || member.user.bot || member.guild.id !== process.env.DISCORD_GUILD_ID) return;
  if (!process.env.BUYER_ROLE_ID || !process.env.NEXTAUTH_URL) {
    console.error("Custom onboarding requires BUYER_ROLE_ID and NEXTAUTH_URL");
    return;
  }
  try {
    const current = await member.fetch();
    if (current.roles.cache.has(process.env.BUYER_ROLE_ID)) return;
    const onboardingUrl = new URL("/onboarding", process.env.NEXTAUTH_URL);
    if (!["https:", "http:"].includes(onboardingUrl.protocol)) throw new Error("Invalid onboarding URL");
    const embed = new EmbedBuilder()
      .setColor(0x470000)
      .setTitle("A place in the pack.")
      .setDescription("Welcome to **House Wolf**, home of the Dragoons. Tell us what you enjoy playing, read the code, and take your first step with the pack.")
      .addFields({ name: "Your next step", value: `[Begin your House Wolf onboarding](${onboardingUrl.toString()})` })
      .setFooter({ text: "Strength. Honor. Brotherhood." });
    await current.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Could not deliver onboarding welcome to ${member.id}:`, error.message);
  }
}
