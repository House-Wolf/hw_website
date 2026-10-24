import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limit";
import { CommandError, assertMutationOrigin } from "./access.js";

export async function commandHttp(request: NextRequest, write: boolean, callback: (userId: string) => Promise<unknown>) {
  const correlationId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new CommandError(401, "UNAUTHENTICATED", "Sign in with Discord first.");
    if (process.env.COMMAND_DASHBOARD_ENABLED !== "true") throw new CommandError(503, "FEATURE_DISABLED", "Operations are disabled pending operator configuration.");
    if (write) {
      assertMutationOrigin(request, process.env.NEXTAUTH_URL || process.env.AUTH_URL);
      const limited = await rateLimit(`command-operation:${session.user.id}`, RATE_LIMITS.API_WRITE);
      if (!limited.success) return NextResponse.json({ error: "Too many changes. Please retry.", correlationId }, { status: 429, headers: createRateLimitHeaders(limited) });
    }
    return NextResponse.json({ data: await callback(session.user.id), correlationId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const known = error instanceof CommandError;
    if (!known) console.error("command.http.failed", { correlationId });
    return NextResponse.json({ error: known ? error.message : "Operation service is unavailable. Please retry.", code: known ? error.code : "SERVICE_UNAVAILABLE", correlationId }, { status: known ? error.status : 503 });
  }
}
export async function boundedCommandBytes(request: NextRequest, limit: number) {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  if (reader) for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new CommandError(400, "BODY_TOO_LARGE", "Request is too large."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function commandBody(request: NextRequest) {
  const raw = (await boundedCommandBytes(request, 800000)).toString("utf8");
  try { return JSON.parse(raw); } catch { throw new CommandError(400, "INVALID_JSON", "Submit valid JSON."); }
}
