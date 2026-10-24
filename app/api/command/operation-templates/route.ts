import { NextRequest } from "next/server";
import { commandHttp } from "@/lib/command/http";
import { operationsManagement, requireAdvancedOperations } from "@/lib/command/planningServer";
export function GET(request: NextRequest) { return commandHttp(request, false, (userId) => { requireAdvancedOperations(); return operationsManagement.templates(userId); }); }
