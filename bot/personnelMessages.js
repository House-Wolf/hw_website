import { createHash } from "node:crypto";
import { evaluatePromotionVotes, formatVerseDate, SERVICE_RANKS } from "../lib/personnel/policy.js";
import { renderWelcomeBanner } from "./onboardingWelcome.js";
import { bannerMessage } from "./bannerMessage.js";

export function safeDiscordText(value) {
  return String(value).replace(/[\\`*_{}[\]()<>#+.!|~]/g, "\\$&").replace(/@/g, "＠");
}

export function promotionReviewMessage(request, member) {
  const source = SERVICE_RANKS.find((rank) => rank.roleId === request.sourceRankRoleId);
  const target = SERVICE_RANKS.find((rank) => rank.roleId === request.targetRankRoleId);
  const tally = evaluatePromotionVotes(request.votes || [], request.approvalsRequired);
  const pending = request.status === "REVIEW";
  const progress = "▰".repeat(Math.min(Math.max(tally.score, 0), request.approvalsRequired)) + "▱".repeat(Math.max(request.approvalsRequired - Math.max(tally.score, 0), 0));
  return {
    allowedMentions: { parse: [] },
    nonce: createHash("sha256").update(`review:${request.id}`).digest("hex").slice(0, 24), enforceNonce: true,
    embeds: [{
      color: request.status === "VETOED" ? 0x8a2727 : 0x114e62,
      author: { name: "HOUSE WOLF  /  OFFICER CORPS" },
      title: `${safeDiscordText(member.displayName)} · Promotion Review`,
      description: `**${source?.name || "Applicant"} → ${target?.name || "Unknown rank"}**\n\nA Dragoon has reached the required term of service. Officers, weigh this advancement against the standards of the House.`,
      thumbnail: { url: member.user.displayAvatarURL({ extension: "png", size: 256 }) },
      fields: [
        { name: "WARRIOR", value: `<@${member.id}>`, inline: true },
        { name: "TIME IN RANK", value: `Since <t:${Math.floor(new Date(request.rankSince).getTime() / 1000)}:D>`, inline: true },
        { name: "ELIGIBLE", value: `<t:${Math.floor(new Date(request.eligibleAt).getTime() / 1000)}:D>`, inline: true },
        { name: "OFFICER BALLOT", value: `${progress || "—"}  **${tally.score} / ${request.approvalsRequired} net approvals**\n${tally.approvals} approval(s) · ${tally.rejections} rejection(s)` },
        { name: "STANDING ORDERS", value: "One ballot per officer. Ordinary rejections subtract from approvals. The Clan Warlord can veto a pending review by rejecting it. Once approved, the decision is final." },
        ...(pending && request.nextReviewReminderAt ? [{ name: "NEXT REVIEW REMINDER", value: `<t:${Math.floor(new Date(request.nextReviewReminderAt).getTime() / 1000)}:D> · Ordinary rejection only. The Clan Warlord’s veto is never reopened automatically.` }] : []),
        { name: "STATUS", value: request.status.replaceAll("_", " ") },
        ...(request.lastError ? [{ name: "RECONCILIATION NOTICE", value: safeDiscordText(request.lastError).slice(0, 1000) }] : []),
      ],
      footer: { text: `Personnel order ${request.id} · Strength, Honor, Death` },
      timestamp: new Date(request.createdAt).toISOString(),
    }],
    components: [{ type: 1, components: [
      { type: 2, style: 3, label: "Approve advancement", custom_id: `hw:promotion:APPROVE:${request.id}`, disabled: !pending },
      { type: 2, style: 4, label: "Reject / Warlord veto", custom_id: `hw:promotion:REJECT:${request.id}`, disabled: !pending },
    ] }],
  };
}

export async function promotionAnnouncement(request, member) {
  const target = SERVICE_RANKS.find((rank) => rank.roleId === request.targetRankRoleId);
  const source = SERVICE_RANKS.find((rank) => rank.roleId === request.sourceRankRoleId);
  if (!target) throw new Error("Unknown announcement rank");
  let avatar;
  try {
    const response = await fetch(member.user.displayAvatarURL({ extension: "png", size: 256 }), { signal: AbortSignal.timeout(8_000) });
    if (response.ok) avatar = Buffer.from(await response.arrayBuffer());
  } catch {}
  const banner = await renderWelcomeBanner(member.displayName, avatar, { title: target.name, kicker: "BY ORDER OF HOUSE WOLF COMMAND", footer: "STRENGTH. HONOR. DEATH.", caption: "HONOR THE OATH" });
  const effectiveDate = formatVerseDate(request.completedAt);
  const salutation = target.key === "foundling"
    ? `With application accepted and RSI organization membership confirmed, <@${member.id}> is received beneath our banner as a **Foundling**, effective **${effectiveDate}**.`
    : `By recorded approval of the Officer Corps, <@${member.id}> advances from **${source?.name}** to **${target.name}**, effective **${effectiveDate}**.`;
  return bannerMessage({
    content: `Attention Dragoons — honor the advancement of <@${member.id}>.`,
    allowedMentions: { parse: [], users: [member.id] },
    nonce: createHash("sha256").update(`promotion:${request.id}`).digest("hex").slice(0, 24), enforceNonce: true,
    files: [{ attachment: banner, name: "house-wolf-promotion.png" }],
    image: { url: "attachment://house-wolf-promotion.png" },
    body: {
      color: 0x114e62, author: { name: "HOUSE WOLF  /  PERSONNEL ORDERS" },
      title: `${target.name.toUpperCase()} · THE NEXT CHAPTER`,
      description: `**Attention Dragoons,**\n\n${salutation}\n\n${target.key === "foundling" ? "The first oath is the beginning of service. The House offers training, fellowship, and the chance to earn a lasting place among its warriors." : "The required term of service has been completed and the necessary officer votes recorded. This advancement carries a greater obligation to the clan, its contracts, and the warriors who fight beneath our banner."}`,
      fields: [
        { name: "THE CHARGE", value: target.duty },
        { name: "THE OATH", value: target.charge },
        { name: "STAND WITH YOUR FELLOW DRAGOON", value: `Join us in recognizing **${safeDiscordText(member.displayName)}**. Wear this rank with pride. Let strength guide your actions, honor bind your word, and resolve carry you through the ’Verse.` },
        { name: "FOR THE CLAN. FOR HONOR. FOR VICTORY.", value: "House Wolf Command\nThe Officer Corps · Home of the Dragoons" },
      ],
      footer: { text: `Order ${request.id} · Effective ${effectiveDate}` },
    },
  });
}
