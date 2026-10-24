import { getRequestCommandActor } from "@/lib/command/server";
import { OperationDetail } from "../OperationsPanel";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  try { await getRequestCommandActor(); }
  catch { return <p role="alert">Current House Wolf membership could not be verified. Please retry.</p>; }
  return <OperationDetail id={(await params).id} />;
}
