import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ONBOARDING_RULES_VERSION, validateOnboardingChoices } from "@/lib/onboarding";
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

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isActive: true } });
    if (!user?.isActive) {
      return NextResponse.json({ error: "Your account cannot complete onboarding. Please contact a moderator." }, { status: 403, headers });
    }
    const memberUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${session.user.discordId}`;
    const authorization = { Authorization: `Bot ${botToken}` };
    const memberResponse = await fetch(memberUrl, { headers: authorization, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!memberResponse.ok) {
      return NextResponse.json({ error: memberResponse.status === 404 ? "Join the House Wolf Discord server before completing onboarding." : "We couldn’t verify your Discord membership. Please try again." }, { status: memberResponse.status === 404 ? 403 : 502, headers });
    }
    const member = await memberResponse.json() as { roles: string[] };
    if (member.roles.includes(buyerRoleId)) {
      return NextResponse.json({ error: "Marketplace buyers skip onboarding and keep their Buyer role. Contact a moderator if you’d like to join the community." }, { status: 403, headers });
    }
    const saved = await prisma.onboardingProfile.findUnique({ where: { userId: session.user.id } });
    const discordUrl = `https://discord.com/channels/${guildId}`;
    if (saved?.completedAt && saved.rulesVersion === ONBOARDING_RULES_VERSION) {
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
  }
}
