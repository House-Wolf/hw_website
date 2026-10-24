import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { commandSettings } from "@/lib/command/server";
import { CommandError, assertMutationOrigin } from "@/lib/command/access.js";
import { rateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
function failure(error: unknown, correlationId: string) {
  const known = error instanceof CommandError;
  if (!known) console.error("command.settings.failed", { correlationId });
  return NextResponse.json({ error: known ? error.message : "Command settings are unavailable. Please retry.", code: known ? error.code : "SERVICE_UNAVAILABLE", correlationId }, { status: known ? error.status : 503 });
}

export async function GET() {
  const correlationId = randomUUID();
  try {
    const session = await auth();
    return NextResponse.json({ settings: await commandSettings.read(session?.user?.id), enabled: process.env.COMMAND_DASHBOARD_ENABLED === "true", deliveryEnabled: process.env.COMMAND_DISCORD_DELIVERY_ENABLED === "true", correlationId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error, correlationId); }
}

export async function PUT(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new CommandError(401, "UNAUTHENTICATED", "Sign in with Discord first.");
    assertMutationOrigin(request, process.env.NEXTAUTH_URL);
    const limited = await rateLimit(`command-settings:${session.user.id}`, RATE_LIMITS.API_WRITE);
    if (!limited.success) return NextResponse.json({ error: "Too many changes. Please retry.", correlationId }, { status: 429, headers: createRateLimitHeaders(limited) });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 8_192) throw new CommandError(400, "BODY_TOO_LARGE", "Settings request is too large.");
    let input;
    try { input = JSON.parse(raw); } catch { throw new CommandError(400, "INVALID_JSON", "Submit valid JSON settings."); }
    return NextResponse.json({ settings: await commandSettings.save(session.user.id, input), deliveryEnabled: process.env.COMMAND_DISCORD_DELIVERY_ENABLED === "true", correlationId });
  } catch (error) { return failure(error, correlationId); }
}
