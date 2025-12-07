import NextAuth, { Profile } from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { deriveUserPermissions } from "@/lib/deriveUserpermissions";

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

type DiscordGuildRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

interface DiscordProfile extends Profile {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
}

type DiscordMember = {
  roles: string[];
};

/**
 * @function syncGuildRolesMetadata
 * @description Syncs Discord guild roles metadata into the database.
 * @param {string} guildId - The ID of the Discord guild.
 * @param {string | undefined} botToken - The Discord bot token for authentication.
 * @returns {Promise<void>}
 * @author House Wolf Dev Team
 */
async function syncGuildRolesMetadata(guildId: string, botToken?: string) {
  if (!botToken) {
    console.warn("DISCORD_BOT_TOKEN missing; cannot sync role metadata");
    return;
  }
  
  const resp = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!resp.ok) {
    console.error("Failed to fetch guild roles for metadata sync");
    return;
  }

  const roles: DiscordGuildRole[] = await resp.json();

  for (const role of roles) {
    await prisma.discordRole.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        color: role.color,
        position: role.position,
        isManaged: role.managed,
      },
      create: {
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        isManaged: role.managed,
      },
    });
  }
}

/**
 * @module Auth
 * @description - NextAuth configuration for Discord OAuth and user session management.
 * @author House Wolf Dev Team
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds guilds.members.read",
        },
      },
      profile(profile: DiscordProfile) {
        return {
          id: profile.id,
          name: profile.global_name ?? profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
          discordId: profile.id,
          discordUsername: profile.username,
          discordDisplayName: profile.global_name ?? null,
          avatarUrl: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
        };
      },
    }),
  ],

  callbacks: {
    // 1) Gate by House Wolf guild membership
    async signIn({ account }) {
      if (!account?.access_token) return false;

      try {
        const guildsResponse = await fetch(
          "https://discord.com/api/users/@me/guilds",
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }
        );

        if (!guildsResponse.ok) {
          console.error("Failed to fetch guilds");
          return false;
        }

        const guilds: DiscordGuild[] = await guildsResponse.json();
        const guildId = process.env.DISCORD_GUILD_ID;

        const isMember = guilds.some((guild) => guild.id === guildId);
        if (!isMember) {
          console.log("User is not a member of the House Wolf Discord");
        }

        return isMember;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    // 2) JWT – hydrate with user data, roles, permissions, rank on sign-in
    async jwt({ token, user, trigger }) {
      const isInitialSignIn = user && (trigger === "signIn" || !("initialized" in token));

      if (isInitialSignIn) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
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
            mercenaryProfiles: {
              include: { rank: true },
            },
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.discordId = dbUser.discordId;
          token.discordUsername = dbUser.discordUsername;
          token.discordDisplayName = dbUser.discordDisplayName;
          token.avatarUrl = dbUser.avatarUrl;
          token.isActive = dbUser.isActive;

          token.roles = dbUser.roles.map((r) => ({
            discordRoleId: r.discordRoleId,
            name: r.discordRole.name,
          }));

          const primaryProfile = dbUser.mercenaryProfiles[0];
          token.rankName = primaryProfile?.rank?.name ?? null;

          const permSet = deriveUserPermissions(dbUser.roles);
          token.permissions = Array.from(permSet);

          (token as any).initialized = true;
        }
      }

      return token;
    },

    // 3) Session – just mirror JWT into session.user (no DB hits)
    async session({ session, token }) {
      if (!session.user) return session;

      session.user.id = (token.id as string) ?? session.user.id;
      session.user.discordId =
        (token.discordId as string) ?? session.user.discordId;
      session.user.discordUsername =
        (token.discordUsername as string) ?? session.user.discordUsername;
      session.user.discordDisplayName =
        (token.discordDisplayName as string | null) ??
        session.user.discordDisplayName ??
        null;
      session.user.avatarUrl =
        (token.avatarUrl as string | null) ?? session.user.avatarUrl ?? null;
      session.user.isActive =
        (token.isActive as boolean) ?? session.user.isActive;

      session.user.roles =
        (token.roles as { discordRoleId: string; name?: string }[]) ??
        session.user.roles ??
        [];

      session.user.rankName =
        (token.rankName as string | null) ?? session.user.rankName ?? null;

      session.user.permissions =
        (token.permissions as string[]) ?? session.user.permissions ?? [];

      return session;
    },
  },

  // 4) Events – sync roles & update lastLoginAt
  events: {
    async signIn({ user, account, profile }) {
      if (!account?.access_token || !user?.id) return;
      const discordProfile = profile as DiscordProfile | undefined;

      try {
        // Refresh Discord profile + last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: discordProfile?.id ?? undefined,
            discordUsername: discordProfile?.username ?? undefined,
            discordDisplayName: discordProfile?.global_name ?? null,
            avatarUrl: discordProfile?.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : undefined,
            lastLoginAt: new Date(),
          },
        });

        const guildId = process.env.DISCORD_GUILD_ID;
        if (!guildId) return;

        await syncGuildRolesMetadata(guildId, process.env.DISCORD_BOT_TOKEN);

        const memberResponse = await fetch(
          `https://discord.com/api/users/@me/guilds/${guildId}/member`,
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }
        );

        if (!memberResponse.ok) {
          console.error("Failed to fetch guild member for role sync");
          return;
        }

        const member: DiscordMember = await memberResponse.json();
        const roleIds: string[] = member.roles ?? [];

        await prisma.$transaction(async (tx) => {
          await tx.userRole.deleteMany({ where: { userId: user.id } });

          for (const roleId of roleIds) {
            await tx.discordRole.upsert({
              where: { id: roleId },
              update: {},
              create: {
                id: roleId,
                name: "Unknown Role",
              },
            });

            await tx.userRole.create({
              data: {
                userId: user.id,
                discordRoleId: roleId,
              },
            });
          }
        });
      } catch (error) {
        console.error("Error syncing Discord data on signIn event:", error);
      }
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
  },
});