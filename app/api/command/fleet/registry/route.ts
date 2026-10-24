import { NextRequest } from "next/server";
import { commandHttp } from "@/lib/command/http";
import { fleetRegistryService, requireStaffingEnabled } from "@/lib/command/staffingServer";
export const dynamic = "force-dynamic";
export function POST(request: NextRequest) {
  return commandHttp(request, true, userId => {
    requireStaffingEnabled();
    return fleetRegistryService.sync(userId);
  });
}
