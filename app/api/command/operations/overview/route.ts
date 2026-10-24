import { NextRequest } from "next/server";
import { commandHttp } from "@/lib/command/http";
import { getOperationsOverview } from "@/lib/command/overviewServer";

export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return commandHttp(request, false, userId => getOperationsOverview(userId));
}
