import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BadgeCheck, Clock3, KeyRound, Shield, UserCircle2 } from "lucide-react";
import { deriveUserPermissions } from "@/lib/derive-permissions";
import { RANK_PRIORITY } from "@/lib/role-constants";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function discordColorToHex(color?: number | null) {
  if (color === null || color === undefined) {
    return null;
  }

  return `#${color.toString(16).padStart(6, "0")}`;
}

function formatDate(date: Date | null) {
  if (!date) return "First time here";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

// Rank priority moved to lib/role-constants.ts

export default async function DashboardHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        include: {
          discordRole: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const roles = [...user.roles].sort(
    (a, b) => {
      const posDiff = (b.discordRole.position ?? 0) - (a.discordRole.position ?? 0);
      if (posDiff !== 0) return posDiff;
      return a.discordRole.name.localeCompare(b.discordRole.name);
    }
  );

  // Build permissions map with descriptions
  const permissionsMap = new Map<string, string | null>();

  // Add database-defined permissions with their descriptions
  user.roles.forEach(({ discordRole }) => {
    discordRole.permissions.forEach(({ permission }) => {
      permissionsMap.set(permission.key, permission.description);
    });
  });

  // Add special permissions (these don't have database descriptions)
  const userPermissions = deriveUserPermissions(user.roles);
  userPermissions.forEach((key) => {
    if (!permissionsMap.has(key)) {
      // Add default descriptions for special permissions
      const descriptions: Record<string, string> = {
        SITE_ADMIN: "Site administrator",
        MARKETPLACE_ADMIN: "Marketplace administrator",
        DOSSIER_ADMIN: "Dossier administrator",
      };
      permissionsMap.set(key, descriptions[key] || null);
    }
  });

  const permissions = Array.from(permissionsMap.entries()).map(
    ([key, description]) => ({ key, description })
  );

  const displayName = user.discordDisplayName || user.name || user.discordUsername;
  const avatarUrl =
    user.avatarUrl ||
    user.image ||
    "https://cdn.discordapp.com/embed/avatars/0.png";
  const lastLogin = formatDate(user.lastLoginAt);
  const accountCreated = formatDate(user.createdAt ?? user.lastLoginAt);
  const roleNamesForRank = new Set(roles.map((r) => r.discordRole.name));
  const rank = RANK_PRIORITY.find((rankName) => roleNamesForRank.has(rankName));

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-60 bg-gradient-to-r from-[var(--accent-soft)]/10 via-transparent to-[var(--accent-strong)]/15" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative">
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-[var(--border-strong)] shadow-[var(--shadow-soft)]">
                <Image
                  src={avatarUrl}
                  alt={`${displayName}'s avatar`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[var(--accent-strong)] text-[var(--graphite-50)] rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-md">
                You
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {rank && (
                <p className="text-sm text-[var(--foreground-muted)] uppercase tracking-[0.08em]">
                  {rank}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] leading-tight truncate">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--foreground-muted)]">
                <span className="flex items-center gap-2">
                  <UserCircle2 size={16} />
                  @{user.discordUsername}
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="flex items-center gap-2">
                  <Clock3 size={16} />
                  Account created:{" "}
                  <span className="text-[var(--foreground)]">{accountCreated}</span>
                </span>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                <BadgeCheck size={16} className="text-[var(--accent-main)]" />
                <span className="uppercase tracking-[0.08em] text-xs">
                  Synced Discord Roles
                </span>
              </div>
              <div className="text-2xl font-semibold text-[var(--foreground)]">
                {roles.length}
              </div>
              <p className="text-xs text-[var(--foreground-muted)]">
                Highest rank first, pulled from Discord
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-strong)]/15 border border-[var(--border)] flex items-center justify-center">
                <Shield className="text-[var(--accent-strong)]" size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                  Roles
                </p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {roles.length}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">In role order</p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-main)]/15 border border-[var(--border)] flex items-center justify-center">
                <KeyRound className="text-[var(--accent-main)]" size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                  Site Permissions
                </p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {permissions.length}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Derived from roles</p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)]/15 border border-[var(--border)] flex items-center justify-center">
                <Clock3 className="text-[var(--accent-soft)]" size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                  Last Login
                </p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {lastLogin}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">UTC timestamp</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
                House Wolf
              </p>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Discord Roles
              </h2>
            </div>
            <Shield className="text-[var(--accent-strong)]" size={20} />
          </div>

          <div className="space-y-3">
            {roles.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                No Discord roles are synced to your account yet.
              </p>
            ) : (
              roles.map((userRole, index) => {
                const colorHex = discordColorToHex(userRole.discordRole.color);
                return (
                  <div
                    key={userRole.discordRole.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 px-3 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-[var(--foreground-muted)] w-8 text-center">
                        #{index + 1}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
                          style={
                            colorHex
                              ? { backgroundColor: colorHex, borderColor: colorHex }
                              : { backgroundColor: "var(--accent-main)" }
                          }
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--foreground)] truncate">
                            {userRole.discordRole.name}
                          </p>
                          <p className="text-xs text-[var(--foreground-muted)]">
                            Position {userRole.discordRole.position ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <BadgeCheck
                      className="text-[var(--accent-main)] shrink-0"
                      size={18}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
                Site Permissions
              </p>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Capabilities Unlocked
              </h2>
            </div>
            <KeyRound className="text-[var(--accent-main)]" size={20} />
          </div>

          {permissions.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">
              No permissions have been granted yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissions.map((permission) => (
                <div
                  key={permission.key}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 p-3 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-main)]">
                    {permission.key}
                  </p>
                  <p className="text-sm text-[var(--foreground)] mt-1">
                    {permission.description || "No description provided."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
