import "server-only";
import { prisma } from "@/lib/prisma";
import { authorize } from "./server";
import { createAttendanceService } from "./attendanceService.js";
import { CommandError } from "./access.js";

export function requireAttendanceEnabled() {
  if (process.env.COMMAND_ATTENDANCE_ENABLED !== "true") throw new CommandError(503, "ATTENDANCE_DISABLED", "Attendance and reports are not enabled yet.");
}
export const attendanceService = createAttendanceService({ prisma, authorize });
