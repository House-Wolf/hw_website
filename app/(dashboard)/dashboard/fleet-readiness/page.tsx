import { getRequestCommandActor } from "@/lib/command/server";
import FleetReadiness from "./FleetReadiness";
export const dynamic = "force-dynamic";
export default async function Page() {
  try { await getRequestCommandActor(); }
  catch { return <p role="alert">Current guild membership could not be verified. Please sign in or retry.</p>; }
  if (process.env.COMMAND_STAFFING_ENABLED !== "true") return <p>Fleet readiness is not available yet. Your officers will announce when it is enabled.</p>;
  return <FleetReadiness />;
}
