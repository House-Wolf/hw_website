import { getRequestCommandActor } from "@/lib/command/server";
import { CommandError } from "@/lib/command/access.js";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";
export default async function OrganizationSettingsPage() {
  try { await getRequestCommandActor(true); }
  catch (error) {
    if (!(error instanceof CommandError)) throw error;
    return <section className="mx-auto max-w-4xl p-6"><h1 className="mb-4 text-3xl font-bold">Organization settings</h1><p role="alert">{error.message}</p></section>;
  }
  return <section className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8"><header><p className="mb-2 text-xs uppercase tracking-widest text-foreground-muted">House Wolf command</p><h1 className="text-3xl font-bold">Organization settings</h1></header><SettingsForm /></section>;
}
