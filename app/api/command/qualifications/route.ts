import { NextRequest } from "next/server";
import { commandHttp, commandBody } from "@/lib/command/http";
import { fleetService, requireStaffingEnabled } from "@/lib/command/staffingServer";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { return commandHttp(request, false, (userId) => { requireStaffingEnabled(); return fleetService.directory(userId, request.nextUrl.searchParams.get("q") || ""); }); }
export function POST(request: NextRequest) {
  return commandHttp(request, true, async (userId) => { requireStaffingEnabled(); const body = await commandBody(request); return fleetService.qualification(userId, body.action, body.input); });
}
