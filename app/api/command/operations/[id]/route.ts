import { NextRequest } from "next/server";
import { commandHttp, commandBody } from "@/lib/command/http";
import { operationService } from "@/lib/command/operationServer";
import { normalizeEventCover } from "@/lib/command/cover";
import { authorize } from "@/lib/command/server";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export function GET(request: NextRequest, context: Context) {
  return commandHttp(request, false, async (userId) => ({ ...await operationService.detail(userId, (await context.params).id), attendanceEnabled: process.env.COMMAND_ATTENDANCE_ENABLED === "true", staffingEnabled: process.env.COMMAND_STAFFING_ENABLED === "true", advancedEnabled: (process.env.COMMAND_ADVANCED_OPERATIONS_ENABLED === "true" && process.env.COMMAND_STAFFING_ENABLED === "true") }));
}
export function PATCH(request: NextRequest, context: Context) {
  return commandHttp(request, true, async (userId) => {
    await authorize(userId, { officer: true });
    const body = await commandBody(request);
    if (body.input?.imageData) body.input.imageData = await normalizeEventCover(body.input.imageData);
    return operationService.mutate(userId, (await context.params).id, body.action, body.revision, body.input);
  });
}
export function POST(request: NextRequest, context: Context) {
  return commandHttp(request, true, async (userId) => {
    const body = await commandBody(request);
    return operationService.signup(userId, (await context.params).id, body.status, body.preferences);
  });
}
