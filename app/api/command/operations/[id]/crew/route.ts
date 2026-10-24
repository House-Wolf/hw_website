import { NextRequest } from "next/server";
import { commandHttp, commandBody } from "@/lib/command/http";
import { crewService, requireStaffingEnabled } from "@/lib/command/staffingServer";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export function GET(request: NextRequest, context: Context) { return commandHttp(request, false, async (userId) => { requireStaffingEnabled(); return crewService.view(userId, (await context.params).id); }); }
export function POST(request: NextRequest, context: Context) {
  return commandHttp(request, true, async (userId) => { requireStaffingEnabled(); const body = await commandBody(request); return crewService.mutate(userId, (await context.params).id, body.action, body.crewRevision, body.input); });
}
