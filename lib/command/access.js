import { OFFICER_ROLE_IDS, PERSONNEL_ROLES } from "../personnel/policy.js";

export class CommandError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const officerIds = new Set(OFFICER_ROLE_IDS);
export function isOfficer(roleIds) { return roleIds.some((id) => officerIds.has(id)); }
export function mayManageOperation(actor, operation) {
  return actor.guildId === operation.guildId && isOfficer(actor.roleIds)
    && (actor.roleIds.includes(PERSONNEL_ROLES.warlord) || operation.creatorId === actor.id || operation.managerIds.includes(actor.id));
}

/** Injected adapters are shared by HTTP/server actions and future worker dispatch. */
export function createAuthorizer({ guildId, loadAccount, loadMember, loadPermissions = /** @type {(roles: string[]) => Promise<string[]>} */ (async () => []) }) {
  return async function authorize(userId, { officer = false, permission = null } = {}) {
    if (!userId) throw new CommandError(401, "UNAUTHENTICATED", "Sign in with Discord first.");
    const account = await loadAccount(userId);
    if (!account || !account.isActive) throw new CommandError(403, "ACCOUNT_INACTIVE", "Your account is unavailable or suspended.");
    if (!guildId) throw new CommandError(503, "GUILD_UNCONFIGURED", "Guild verification is not configured. Try again later.");
    let member;
    try { member = await loadMember(guildId, account.discordId); }
    catch (error) {
      if (error instanceof CommandError) throw error;
      throw new CommandError(503, "DISCORD_UNAVAILABLE", "Discord could not verify your current membership. Please retry.");
    }
    if (!member || member.guildId !== guildId || member.userId !== account.discordId)
      throw new CommandError(403, "NOT_GUILD_MEMBER", "Current House Wolf guild membership is required.");
    if (!Array.isArray(member.roleIds) || member.roleIds.some((id) => typeof id !== "string"))
      throw new CommandError(503, "INVALID_PROVIDER_RESPONSE", "Discord returned an invalid membership response. Please retry.");
    const roleIds = [...new Set(member.roleIds)];
    if (officer && !isOfficer(roleIds)) throw new CommandError(403, "OFFICER_REQUIRED", "A current Lieutenant-or-above Discord role is required.");
    const permissions = await loadPermissions(roleIds);
    if (permission && !permissions.includes(permission)) throw new CommandError(403, "PERMISSION_REQUIRED", "Your current roles do not grant this action.");
    return Object.freeze({ id: account.id, discordId: account.discordId, guildId, roleIds: Object.freeze(roleIds), permissions: Object.freeze(permissions) });
  };
}

export function assertMutationOrigin(request, trustedOrigin) {
  const origin = request.headers.get("origin");
  let allowed;
  try { allowed = new URL(trustedOrigin || request.url).origin; } catch { throw new CommandError(503, "ORIGIN_UNCONFIGURED", "Website origin is not configured."); }
  if (!origin || origin !== allowed || request.headers.get("sec-fetch-site") === "cross-site")
    throw new CommandError(403, "ORIGIN_DENIED", "Use the dashboard on this website to make changes.");
}
