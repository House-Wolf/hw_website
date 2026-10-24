import { NextRequest } from "next/server";
import { commandBody, commandHttp } from "@/lib/command/http";
import { operationsManagement, requireAdvancedOperations } from "@/lib/command/planningServer";
type Context = { params: Promise<{ id: string }> };
export function GET(request: NextRequest, context: Context) {
  return commandHttp(request, false, async (userId) => { requireAdvancedOperations(); return operationsManagement.view(userId, (await context.params).id); });
}
export function POST(request: NextRequest, context: Context) {
  return commandHttp(request, true, async (userId) => {
    requireAdvancedOperations(); const body = await commandBody(request);
    return operationsManagement.mutate(userId, (await context.params).id, body.action, body.revision, body.input);
  });
}
