import { auth } from "@/lib/auth";
import { getFreshCommandActor } from "@/lib/command/server";
import { CommandError } from "@/lib/command/access.js";
import type { Permission } from "./permissionKeys";
export { PERMISSIONS, type Permission } from "./permissionKeys";

async function currentPermissions() {
  try { return (await getFreshCommandActor()).permissions; }
  catch (error) {
    if (error instanceof CommandError && [401, 403].includes(error.status)) return [];
    throw error;
  }
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  return (await currentPermissions()).includes(permission);
}
export async function hasAnyPermission(permissions: Permission[]): Promise<boolean> {
  const current = await currentPermissions();
  return permissions.some((permission) => current.includes(permission));
}
export async function hasAllPermissions(permissions: Permission[]): Promise<boolean> {
  const current = await currentPermissions();
  return permissions.every((permission) => current.includes(permission));
}
export async function requireAuth() {
  const session = await auth();
  const actor = await getFreshCommandActor();
  if (!session?.user) throw new CommandError(401, "UNAUTHENTICATED", "Sign in with Discord first.");
  return { ...session, user: { ...session.user, isActive: true, permissions: [...actor.permissions] } };
}
export async function requirePermission(permission: Permission) {
  if (!await hasPermission(permission)) throw new CommandError(403, "PERMISSION_REQUIRED", "Your current roles do not grant this action.");
}
