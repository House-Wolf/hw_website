import { getRequestCommandActor } from "@/lib/command/server";
import { isOfficer } from "@/lib/command/access.js";
import OperationsDashboard from "./OperationsDashboard";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  let actor;
  try { actor = await getRequestCommandActor(); }
  catch { return <p role="alert">Current House Wolf membership could not be verified. Please retry.</p>; }
  const params = await searchParams;
  return <OperationsDashboard canCreate={isOfficer(actor.roleIds)} view={params.view === "operations" ? "operations" : "overview"} />;
}
