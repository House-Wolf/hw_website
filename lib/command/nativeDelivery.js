import { CommandError, mayManageOperation } from "./access.js";
import { nativePayload, nativeSnapshot, snapshotsEqual } from "./eventInput.js";

/** No in-memory collectors. All identities, snapshots and dispatch decisions are persisted. */
export async function deliverNative({ operation: op, job, authorize, discord, preflight, baseUrl }) {
  const actor = await authorize(job.actorId, { officer: true });
  if (!mayManageOperation(actor, op)) throw new CommandError(403, "OFFICER_REVOKED", "The initiating officer no longer manages this operation.");
  if (op.syncState !== "CLEAN") throw new CommandError(409, "SYNC_CONFLICT", "Resolve the remote conflict before delivery.");
  const route = `/guilds/${op.guildId}/scheduled-events`;
  const payload = nativePayload(op, baseUrl);
  let remote;
  if (op.nativeEventId) {
    remote = await discord.get(`${route}/${op.nativeEventId}`);
    if (!remote) return { syncState: "DELETED" };
    const snapshot = nativeSnapshot(remote);
    const desiredStatus = { PUBLISHED: 1, ACTIVE: 2, COMPLETED: 3, CANCELLED: remote.status === 2 ? 3 : 4 }[op.state];
    // A crash after PATCH is safe to reconcile: compare the authoritative fields.
    const desired = nativeSnapshot({ ...payload, image: remote.image, status: desiredStatus });
    const sameFields = snapshotsEqual({ ...snapshot, image: null }, { ...desired, image: null });
    const coverUnchanged = op.input.imageBehavior === "PRESERVE" || (op.input.imageBehavior === "REMOVE" && !remote.image);
    if (sameFields && coverUnchanged) return { nativeEventId: remote.id, nativeSnapshot: snapshot, syncState: "CLEAN" };
    if (op.nativeSnapshot && !snapshotsEqual(snapshot, op.nativeSnapshot)) return { remoteSnapshot: snapshot, syncState: "CONFLICT" };
    if (op.state === "CANCELLED" && [3, 4].includes(remote.status)) return { nativeSnapshot: snapshot, syncState: "CLEAN" };
    await preflight(op.guildId, op.input);
    await authorize(job.actorId, { officer: true });
    // Terminal status changes use only status; Discord disallows editing ended events.
    const body = op.state === "PUBLISHED" ? payload : { status: desiredStatus };
    remote = await discord.patch(`${route}/${remote.id}`, body);
  } else {
    if (op.state === "CANCELLED") return { syncState: "CLEAN" };
    if (op.state !== "PUBLISHED") throw new CommandError(409, "NATIVE_NOT_PUBLISHED", "Publish the native event before changing its lifecycle.");
    // Native POST has no nonce. Reconcile deterministic operation link before creating.
    const marker = new URL(`/dashboard/operations/${op.id}`, baseUrl).href;
    const matches = (await discord.get(route)).filter((event) => event.description?.includes(marker));
    if (matches.length === 1) return deliverNative({ operation: { ...op, nativeEventId: matches[0].id, nativeSnapshot: nativeSnapshot(matches[0]) }, job, authorize, discord, preflight, baseUrl });
    else if (matches.length > 1 || job.recoveredSending) throw new CommandError(409, "AMBIGUOUS", "An earlier native create may have succeeded. Review Discord; automatic recreation is blocked.");
    else {
      await preflight(op.guildId, op.input);
      await authorize(job.actorId, { officer: true });
      // POST types omit unset channel/metadata/recurrence; PATCH uses null to clear them.
      const createPayload = Object.fromEntries(Object.entries(payload).filter(([key, value]) => value !== null || key === "image"));
      remote = await discord.post(route, createPayload);
    }
  }
  return { nativeEventId: remote.id, nativeSnapshot: nativeSnapshot(remote), syncState: "CLEAN" };
}

export async function reconcileNative(op, discord) {
  const remote = await discord.get(`/guilds/${op.guildId}/scheduled-events/${op.nativeEventId}`);
  if (!remote) return { syncState: "DELETED" };
  const snapshot = nativeSnapshot(remote);
  return snapshotsEqual(snapshot, op.nativeSnapshot) ? null : { remoteSnapshot: snapshot, syncState: "CONFLICT" };
}
