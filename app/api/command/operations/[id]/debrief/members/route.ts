import { NextRequest } from "next/server";
import { commandHttp } from "@/lib/command/http";
import { attendanceService, requireAttendanceEnabled } from "@/lib/command/attendanceServer";

export function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return commandHttp(request, false, async (userId) => {
    requireAttendanceEnabled();
    const { id } = await context.params;
    return attendanceService.directory(userId, id, request.nextUrl.searchParams.get("q") || "");
  });
}
