import { NextRequest } from "next/server";
import { commandHttp } from "@/lib/command/http";
import { attendanceService, requireAttendanceEnabled } from "@/lib/command/attendanceServer";
export function GET(request: NextRequest) {
  return commandHttp(request, false, async (userId) => { requireAttendanceEnabled(); return attendanceService.statistics(userId); });
}
