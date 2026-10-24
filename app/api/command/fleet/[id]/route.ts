import { NextRequest } from "next/server";
import { commandHttp, commandBody } from "@/lib/command/http";
import { fleetService, requireStaffingEnabled } from "@/lib/command/staffingServer";
export const dynamic = "force-dynamic";
export function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return commandHttp(request, true, async (userId) => { requireStaffingEnabled();
    const body = await commandBody(request);
    return fleetService.update(userId, (await context.params).id, body.action, body.revision, body.input);
  });
}
