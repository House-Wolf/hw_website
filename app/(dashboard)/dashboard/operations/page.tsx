import { getRequestCommandActor } from "@/lib/command/server";
import { isOfficer } from "@/lib/command/access.js";
import { OperationsList } from "./OperationsPanel";
export const dynamic = "force-dynamic";
export default async function Page() {
  let actor;
  try { actor = await getRequestCommandActor(); }
  catch { return <p role="alert">Current House Wolf membership could not be verified. Please retry.</p>; }
  return <OperationsList canCreate={isOfficer(actor.roleIds)} />;
}
