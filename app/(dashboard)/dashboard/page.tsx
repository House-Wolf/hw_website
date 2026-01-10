"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BadgeCheck, Clock3, KeyRound, Shield, UserCircle2 } from "lucide-react";
import { RANK_PRIORITY } from "@/lib/role-constants";

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

type UserRole = {
  discordRole: {
    id: string;
    name: string;
    color: number | null;
    position: number | null;
    permissions: Array<{
      permission: {
        key: string;
        description: string | null;
      };
    }>;
  };
};

type Permission = {
  key: string;
  description: string | null;
};

type UserData = {
  id: string;
  name: string | null;
  discordUsername: string;
  discordDisplayName: string | null;
  avatarUrl: string | null;
  image: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  roles: UserRole[];
  permissions: Permission[];
};

export default function DashboardHomePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-[var(--text-secondary)]">Failed to load user data.</p>
      </div>
    );
  }

  const roles = [...user.roles].sort(
    (a, b) => {
      const posDiff = (b.discordRole.position ?? 0) - (a.discordRole.position ?? 0);
      if (posDiff !== 0) return posDiff;
      return a.discordRole.name.localeCompare(b.discordRole.name);
    }
  );

  const permissions = user.permissions;

  const displayName = user.discordDisplayName || user.name || user.discordUsername;
  const avatarUrl =
    user.avatarUrl ||
    user.image ||
    "https://cdn.discordapp.com/embed/avatars/0.png";
  const lastLogin = formatDate(user.lastLoginAt ? new Date(user.lastLoginAt) : null);
  const accountCreated = formatDate(user.createdAt ? new Date(user.createdAt) : (user.lastLoginAt ? new Date(user.lastLoginAt) : null));
  const roleNamesForRank = new Set(roles.map((r) => r.discordRole.name));
  const rank = RANK_PRIORITY.find((rankName) => roleNamesForRank.has(rankName));

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-60 bg-gradient-to-r from-[var(--accent-secondary)]/10 via-transparent to-[var(--accent-primary)]/15" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative">
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-[var(--border-strong)] shadow-[var(--shadow-md)]">
                <Image
                  src={avatarUrl}
                  alt={`${displayName}'s avatar`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[var(--accent-primary)] text-[var(--text-primary)] rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-md">
                You
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {rank && (
                <p className="text-sm text-[var(--text-secondary)] uppercase tracking-[0.08em]">
                  {rank}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-tight truncate">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="flex items-center gap-2">
                  <UserCircle2 size={16} />
                  @{user.discordUsername}
                </span>
                <span className="text-[var(--border-default)]">|</span>
                <span className="flex items-center gap-2">
                  <Clock3 size={16} />
                  Account created:{" "}
                  <span className="text-[var(--text-primary)]">{accountCreated}</span>
                </span>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <BadgeCheck size={16} className="text-[var(--accent-primary)]" />
                <span className="uppercase tracking-[0.08em] text-xs">
                  Synced Discord Roles
                </span>
              </div>
              <div className="text-2xl font-semibold text-[var(--text-primary)]">
                {roles.length}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Highest rank first, pulled from Discord
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="group rounded-lg border p-4 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02]"
              style={{
                borderColor: 'var(--border-crimson)',
                backgroundColor: 'var(--background-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-crimson)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-crimson)';
              }}
            >
              <div className="w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300"
                style={{
                  borderColor: 'var(--accent-primary)',
                  backgroundColor: 'rgba(var(--accent-primary-rgb), 0.15)',
                  boxShadow: '0 0 12px rgba(var(--accent-primary-rgb), 0.3)'
                }}
              >
                <Shield className="text-[var(--accent-primary)]" size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  Roles
                </p>
                <p className="text-xl font-bold text-[var(--accent-primary)]">
                  {roles.length}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">In role order</p>
              </div>
            </div>

            <div className="group rounded-lg border p-4 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02]"
              style={{
                borderColor: 'var(--border-crimson)',
                backgroundColor: 'var(--background-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-crimson)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-crimson)';
              }}
            >
              <div className="w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300"
                style={{
                  borderColor: 'var(--accent-primary)',
                  backgroundColor: 'rgba(var(--accent-primary-rgb), 0.15)',
                  boxShadow: '0 0 12px rgba(var(--accent-primary-rgb), 0.3)'
                }}
              >
                <KeyRound className="text-[var(--accent-primary)]" size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  Site Permissions
                </p>
                <p className="text-xl font-bold text-[var(--accent-primary)]">
                  {permissions.length}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Derived from roles</p>
              </div>
            </div>

            <div className="group rounded-lg border p-4 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02]"
              style={{
                borderColor: 'var(--border-teal)',
                backgroundColor: 'var(--background-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-teal)';
                e.currentTarget.style.borderColor = 'var(--accent-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-teal)';
              }}
            >
              <div className="w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300"
                style={{
                  borderColor: 'var(--accent-secondary)',
                  backgroundColor: 'rgba(var(--accent-secondary-rgb), 0.15)',
                  boxShadow: '0 0 12px rgba(var(--accent-secondary-rgb), 0.3)'
                }}
              >
                <Clock3 className="text-[var(--accent-secondary)]" size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  Last Login
                </p>
                <p className="text-xl font-bold text-[var(--accent-secondary)]">
                  {lastLogin}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">UTC timestamp</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                House Wolf
              </p>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Discord Roles
              </h2>
            </div>
            <Shield className="text-[var(--accent-primary)]" size={20} />
          </div>

          <div className="space-y-3">
            {roles.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No Discord roles are synced to your account yet.
              </p>
            ) : (
              roles.map((userRole, index) => {
                const colorHex = discordColorToHex(userRole.discordRole.color);
                const roleColor = colorHex || 'var(--accent-primary)';
                return (
                  <div
                    key={userRole.discordRole.id}
                    className="group relative flex items-center justify-between rounded-lg border px-4 py-4 transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      borderColor: colorHex ? `${colorHex}40` : 'var(--border-default)',
                      backgroundColor: colorHex ? `${colorHex}08` : 'var(--background-elevated)',
                      boxShadow: `0 0 0 0 ${roleColor}00`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 20px ${colorHex}40, 0 4px 12px rgba(0,0,0,0.3)`;
                      e.currentTarget.style.borderColor = colorHex || 'var(--border-strong)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 0 0 ${roleColor}00`;
                      e.currentTarget.style.borderColor = colorHex ? `${colorHex}40` : 'var(--border-default)';
                    }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-300"
                        style={{
                          borderColor: roleColor,
                          backgroundColor: `${roleColor}15`,
                          boxShadow: `0 0 12px ${roleColor}30`
                        }}
                      >
                        <span className="text-xs font-bold" style={{ color: colorHex || 'var(--accent-primary)' }}>
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="relative flex items-center justify-center h-6 w-6 rounded-full border-2 transition-all duration-300"
                          style={{
                            backgroundColor: roleColor,
                            borderColor: colorHex ? '#ffffff' : 'var(--border-strong)',
                            boxShadow: `0 0 16px ${roleColor}80, inset 0 0 8px ${roleColor}40`
                          }}
                        >
                          <div className="absolute inset-0 rounded-full animate-pulse"
                            style={{ backgroundColor: `${roleColor}30` }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-base truncate transition-colors duration-300"
                            style={{ color: colorHex || 'var(--text-primary)' }}
                          >
                            {userRole.discordRole.name}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Shield size={12} className="opacity-70" />
                              Position {userRole.discordRole.position ?? "N/A"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <BadgeCheck
                        className="transition-all duration-300 group-hover:scale-110"
                        style={{ color: colorHex || 'var(--accent-primary)' }}
                        size={24}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Site Permissions
              </p>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Capabilities Unlocked
              </h2>
            </div>
            <KeyRound className="text-[var(--accent-primary)]" size={20} />
          </div>

          {permissions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No permissions have been granted yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissions.map((permission) => (
                <div
                  key={permission.key}
                  className="group relative rounded-lg border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  style={{
                    borderColor: 'var(--border-crimson)',
                    backgroundColor: 'var(--background-elevated)',
                    boxShadow: '0 0 0 0 transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-crimson), 0 4px 12px rgba(0,0,0,0.3)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
                    e.currentTarget.style.borderColor = 'var(--border-crimson)';
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-300"
                      style={{
                        borderColor: 'var(--accent-primary)',
                        backgroundColor: 'rgba(var(--accent-primary-rgb), 0.1)',
                      }}
                    >
                      <KeyRound size={18} className="text-[var(--accent-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] mb-1.5 transition-colors duration-300"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {permission.key}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {permission.description || "No description provided."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
