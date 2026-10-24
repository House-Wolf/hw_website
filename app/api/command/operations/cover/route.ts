import { NextRequest } from "next/server";
import { commandHttp, boundedCommandBytes } from "@/lib/command/http";
import { authorize } from "@/lib/command/server";
import { normalizeEventCoverBytes } from "@/lib/command/cover";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return commandHttp(request, true, async (userId) => {
    await authorize(userId, { officer: true });
    const bytes = await boundedCommandBytes(request, 4 * 1024 * 1024);
    const imageData = await normalizeEventCoverBytes(bytes);
    await authorize(userId, { officer: true });
    return { imageData };
  });
}
