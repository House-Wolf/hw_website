import { NextRequest } from "next/server";
import { commandBody, commandHttp } from "@/lib/command/http";
import { attendanceService, requireAttendanceEnabled } from "@/lib/command/attendanceServer";
type Context = { params: Promise<{ id: string }> };
export function GET(request: NextRequest, context: Context) {
  return commandHttp(request, false, async (userId) => { requireAttendanceEnabled(); return attendanceService.view(userId, (await context.params).id); });
}
export function POST(request: NextRequest, context: Context) {
  return commandHttp(request, true, async (userId) => {
    requireAttendanceEnabled(); const body = await commandBody(request);
    return attendanceService.mutate(userId, (await context.params).id, body.action, body.revision, body.input);
  });
}
