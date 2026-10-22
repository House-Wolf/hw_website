export function discordRsiHandleCandidates(member) {
  // Exact names only. Removing spaces, clan tags, or punctuation can identify
  // a different citizen; leave those cases for the officer to enter explicitly.
  return [...new Set([member.displayName, member.user.globalName, member.user.username]
    .filter(value => typeof value === "string")
    .map(value => value.trim().toLowerCase())
    .filter(value => /^[a-z0-9_-]{3,60}$/.test(value)))];
}

export async function checkPublicRsiMembership(handle, { apiKey, fetcher = fetch, now = new Date() }) {
  if (!apiKey) return { confirmed: false, reason: "API_NOT_CONFIGURED" };
  if (!/^[a-zA-Z0-9_-]{3,60}$/.test(handle)) throw new Error("Invalid RSI handle");
  const response = await fetcher(`https://apiv2.starcitizen-api.com/v2/users/${encodeURIComponent(handle)}?refresh=true`, {
    headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`RSI membership provider returned ${response.status}`);
  const payload = await response.json();
  const updatedAt = new Date(payload.updatedAt);
  if (payload.success !== true || payload.data?.profile?.handle?.toLowerCase() !== handle.toLowerCase()
    || !Number.isFinite(updatedAt.getTime()) || updatedAt.getTime() - now.getTime() > 300_000 || now.getTime() - updatedAt.getTime() > 3_600_000) {
    return { confirmed: false, reason: "UNVERIFIED_OR_STALE_RESPONSE" };
  }
  return { confirmed: payload.data?.organization?.sid === "CUTTERWOLF", evidence: `https://robertsspaceindustries.com/en/citizens/${handle}`, verifiedAt: updatedAt, reason: "PUBLIC_PRIMARY_ORGANIZATION" };
}
