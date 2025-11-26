import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { deriveUserPermissions } from "./derive-permissions";
import { ROLE_IDS, DOSSIER_ADMIN_RANKS } from "./role-constants";

type DiscordGuildRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

// Role constants moved to lib/role-constants.ts to avoid duplication

function normalizeName(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

async function syncGuildRolesMetadata(guildId: string, botToken?: string) {
  if (!botToken) {
    console.warn("DISCORD_BOT_TOKEN missing; cannot sync role metadata");
    return;
  }

  const resp = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: {
      Authorization: `Bot ${botToken}`,
    },
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
      profile(profile) {
        // Map Discord profile to NextAuth user format
        return {
          id: profile.id,
          name: profile.global_name ?? profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
          // Custom fields for our database
          discordId: profile.id,
          discordUsername: profile.username,
          discordDisplayName: profile.global_name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      try {
        // Fetch user's guilds to check membership
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

        const guilds = await guildsResponse.json();
        const guildId = process.env.DISCORD_GUILD_ID;

        // Check if user is member of the House Wolf Discord
        const isMember = guilds.some((guild: any) => guild.id === guildId);

        if (!isMember) {
          console.log("User is not a member of the House Wolf Discord");
          return false;
        }

        // Let NextAuth adapter handle user creation/linking
        // We'll sync Discord data and roles in the jwt/session callback after user is created
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    async jwt({ token, user, account, profile, trigger }) {
      // JWT callback is primarily for adding custom claims to the token
      // Role syncing is handled in the signIn event to avoid duplication
      return token;
    },

    async session({ session, user }) {
      if (session.user) {
        // Fetch user from database with roles
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
          },
        });

        if (dbUser) {
          // Add custom fields to session
          session.user.id = dbUser.id;
          session.user.discordId = dbUser.discordId;
          session.user.discordUsername = dbUser.discordUsername;
          session.user.isActive = dbUser.isActive;

          // Derive permissions using centralized logic
          const permissions = deriveUserPermissions(dbUser.roles);
          session.user.permissions = Array.from(permissions);
        }
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!account?.access_token || !user?.id) return;

      try {
        // Refresh Discord profile details and last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: (profile as any)?.id ?? undefined,
            discordUsername: (profile as any)?.username ?? undefined,
            discordDisplayName: (profile as any)?.global_name ?? null,
            avatarUrl: (profile as any)?.avatar
              ? `https://cdn.discordapp.com/avatars/${(profile as any).id}/${
                  (profile as any).avatar
                }.png`
              : undefined,
            lastLoginAt: new Date(),
          },
        });

        // Sync guild roles from Discord
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

        const member = await memberResponse.json();
        const roleIds: string[] = member.roles ?? [];

        // Replace role assignments with current Discord roles
        await prisma.userRole.deleteMany({ where: { userId: user.id } });

        for (const roleId of roleIds) {
          await prisma.discordRole.upsert({
            where: { id: roleId },
            update: {},
            create: {
              id: roleId,
              name: "Unknown Role",
            },
          });

          await prisma.userRole.create({
            data: {
              userId: user.id,
              discordRoleId: roleId,
            },
          });
        }
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
    strategy: "database",
  },
});
