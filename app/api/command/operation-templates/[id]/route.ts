import { NextRequest } from "next/server";
import { commandBody, commandHttp } from "@/lib/command/http";
import { operationsManagement, requireAdvancedOperations } from "@/lib/command/planningServer";
export function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return commandHttp(request, true, async (userId) => { requireAdvancedOperations(); const body = await commandBody(request); return operationsManagement.deleteTemplate(userId, (await context.params).id, body.revision); });
}
