import { NextRequest } from "next/server";
import { commandHttp, commandBody } from "@/lib/command/http";
import { operationService } from "@/lib/command/operationServer";
import { normalizeEventCover } from "@/lib/command/cover";
import { authorize } from "@/lib/command/server";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { return commandHttp(request, false, (userId) => operationService.list(userId)); }
export function POST(request: NextRequest) {
  return commandHttp(request, true, async (userId) => {
    await authorize(userId, { officer: true });
    const body = await commandBody(request);
    if (body.input?.imageData) body.input.imageData = await normalizeEventCover(body.input.imageData);
    return operationService.create(userId, body.input, body.requestKey);
  });
}
