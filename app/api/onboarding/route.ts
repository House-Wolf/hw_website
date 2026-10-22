import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { needsWelcomeAfterRejoin, ONBOARDING_RULES_VERSION, validateOnboardingChoices } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { PERSONNEL_ROLES } from "@/lib/personnel/policy.js";
import { createRateLimitHeaders, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Connect your Discord account to finish onboarding." }, { status: 401 });
  }
  if (session.user.isActive === false) {
    return NextResponse.json({ error: "Your account cannot complete onboarding. Please contact a moderator." }, { status: 403 });
  }
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const limit = await rateLimit(`onboarding:${session.user.id}`, { maxRequests: 5, windowMs: 60_000 });
  const headers = createRateLimitHeaders(limit);
  if (!limit.success) {
    return NextResponse.json({ error: "Please wait a moment before trying again." }, { status: 429, headers });
  }
  const input = await request.json().catch(() => null);
  const choices = validateOnboardingChoices(input);
  if (!choices || input?.rulesAccepted !== true || input?.rulesVersion !== ONBOARDING_RULES_VERSION) {
    return NextResponse.json({ error: "Choose an interest or another game, then accept the current rules." }, { status: 400, headers });
  }
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const visitorRoleId = process.env.VISITOR_ROLE_ID || PERSONNEL_ROLES.visitor;
  const buyerRoleId = process.env.BUYER_ROLE_ID;
  if (process.env.ONBOARDING_ENABLED !== "true" || !guildId || !botToken || !visitorRoleId || !buyerRoleId || !process.env.GENERAL_CHANNEL_ID || visitorRoleId === buyerRoleId) {
    return NextResponse.json({ error: "Onboarding is not open yet. Please check back or contact a moderator." }, { status: 503, headers });
  }

  let guestClaim: { id: number; token: string } | undefined;
  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isActive: true } });
    if (!user?.isActive) {
      return NextResponse.json({ error: "Your account cannot complete onboarding. Please contact a moderator." }, { status: 403, headers });
    }
    const memberUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${session.user.discordId}`;
    const authorization = { Authorization: `Bot ${botToken}` };
    const memberResponse = await fetch(memberUrl, { headers: authorization, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!memberResponse.ok) {
      return NextResponse.json({ code: memberResponse.status === 404 ? "membership_required" : "membership_unavailable", error: memberResponse.status === 404 ? "Connect Discord to join the House Wolf server, then finish onboarding." : "We couldn’t verify your Discord membership. Please try again." }, { status: memberResponse.status === 404 ? 403 : 502, headers });
    }
    const member = await memberResponse.json() as { roles: string[]; joined_at?: string };
    // Explicitly completing community onboarding converts temporary buyers.
    // Use the same lease as the expiry worker before changing their roles.
    const guest = await prisma.marketplaceGuest.findUnique({ where: { discordUserId_guildId: { discordUserId: session.user.discordId, guildId } } });
    if (guest) {
      const token = randomUUID();
      const now = new Date();
      const claim = await prisma.marketplaceGuest.updateMany({
        where: { id: guest.id, OR: [{ processingUntil: null }, { processingUntil: { lt: now } }] },
        data: { processingToken: token, processingUntil: new Date(now.getTime() + 120_000) },
      });
      if (!claim.count) {
        return NextResponse.json({ error: "Your marketplace access is being updated. Please retry onboarding in a moment." }, { status: 409, headers });
      }
      guestClaim = { id: guest.id, token };
    }
    if (member.roles.includes(buyerRoleId)) {
      const removeBuyer = await fetch(`${memberUrl}/roles/${buyerRoleId}`, {
        method: "DELETE",
        headers: { ...authorization, "X-Audit-Log-Reason": "Member chose regular House Wolf onboarding instead of temporary marketplace access" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!removeBuyer.ok) {
        return NextResponse.json({ error: "We couldn't switch your Buyer access to community membership. Please retry or contact a moderator." }, { status: 502, headers });
      }
    }
    if (guestClaim) {
      await prisma.marketplaceGuest.deleteMany({ where: { id: guestClaim.id, processingToken: guestClaim.token } });
    }
    const saved = await prisma.onboardingProfile.findUnique({ where: { userId: session.user.id } });
    const rejoined = needsWelcomeAfterRejoin(member.joined_at, saved?.welcomeMessageId);
    if (rejoined) {
      const reset = await prisma.onboardingProfile.updateMany({
        where: { userId: session.user.id, welcomeMessageId: saved!.welcomeMessageId },
        data: { completedAt: null, welcomeMessageId: null, welcomeClaimedAt: null, welcomeLastError: null },
      });
      if (!reset.count) return NextResponse.json({ error: "Your welcome is being updated. Please retry onboarding in a moment." }, { status: 409, headers });
    }
    const discordUrl = `https://discord.com/channels/${guildId}`;
    if (!rejoined && saved?.completedAt && saved.rulesVersion === ONBOARDING_RULES_VERSION && member.roles.includes(visitorRoleId) && !member.roles.includes(buyerRoleId)) {
      return NextResponse.json({ success: true, discordUrl }, { headers });
    }
    const data = { interests: choices.interests, otherGame: choices.otherGame || null, rulesVersion: ONBOARDING_RULES_VERSION, rulesAcceptedAt: new Date(), completedAt: null };
    await prisma.onboardingProfile.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id, ...data }, update: data });
    const roleResponse = await fetch(`${memberUrl}/roles/${visitorRoleId}`, {
      method: "PUT",
      headers: { ...authorization, "X-Audit-Log-Reason": "Completed House Wolf custom onboarding and accepted server rules" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!roleResponse.ok) {
      console.error("Onboarding Visitor role assignment failed", { status: roleResponse.status });
      return NextResponse.json({ error: "Your answers are saved, but we couldn’t assign your Visitor role. Please retry or contact a moderator." }, { status: 502, headers });
    }
    await prisma.onboardingProfile.update({ where: { userId: session.user.id }, data: { completedAt: new Date() } });
    return NextResponse.json({ success: true, discordUrl }, { headers });
  } catch (error) {
    console.error("Custom onboarding failed", error);
    return NextResponse.json({ error: "We couldn’t finish onboarding. Please try again. Your selections are still available on this page." }, { status: 500, headers });
  } finally {
    if (guestClaim) {
      await prisma.marketplaceGuest.updateMany({
        where: { id: guestClaim.id, processingToken: guestClaim.token },
        data: { processingToken: null, processingUntil: null },
      }).catch(() => console.error("Could not release onboarding marketplace claim; it will expire automatically"));
    }
  }
}
