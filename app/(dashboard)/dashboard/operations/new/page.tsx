import { getRequestCommandActor } from "@/lib/command/server";
import { NewOperation } from "../OperationsPanel";
export const dynamic = "force-dynamic";
export default async function Page() {
  try { await getRequestCommandActor(true); }
  catch { return <p role="alert">A current Lieutenant-or-above Discord role is required. If Discord is unavailable, retry later.</p>; }
  return <NewOperation />;
}
