import { NextRequest } from "next/server";
import { commandHttp, commandBody } from "@/lib/command/http";
import { fleetService, requireStaffingEnabled } from "@/lib/command/staffingServer";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { return commandHttp(request, false, (userId) => { requireStaffingEnabled(); return fleetService.list(userId); }); }
export function POST(request: NextRequest) { return commandHttp(request, true, async (userId) => { requireStaffingEnabled(); return fleetService.create(userId, await commandBody(request)); }); }
