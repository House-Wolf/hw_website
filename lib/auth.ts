import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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

        // Fetch guild member details to get roles
        const memberResponse = await fetch(
          `https://discord.com/api/users/@me/guilds/${guildId}/member`,
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }
        );

        if (!memberResponse.ok) {
          console.error("Failed to fetch guild member details");
          return true; // Allow login but without role sync
        }

        const member = await memberResponse.json();

        // Update or create user with Discord data
        await prisma.user.upsert({
          where: { discordId: profile.id as string },
          update: {
            discordUsername: profile.username as string,
            discordDisplayName: (profile as any).global_name || null,
            avatarUrl: profile.image || null,
            lastLoginAt: new Date(),
          },
          create: {
            discordId: profile.id as string,
            discordUsername: profile.username as string,
            discordDisplayName: (profile as any).global_name || null,
            avatarUrl: profile.image || null,
            email: profile.email || null,
            lastLoginAt: new Date(),
          },
        });

        // Sync Discord roles
        const dbUser = await prisma.user.findUnique({
          where: { discordId: profile.id as string },
        });

        if (dbUser && member.roles) {
          // Remove old role assignments
          await prisma.userRole.deleteMany({
            where: { userId: dbUser.id },
          });

          // Add current roles
          for (const roleId of member.roles) {
            // Ensure role exists in database
            await prisma.discordRole.upsert({
              where: { id: roleId },
              update: {},
              create: {
                id: roleId,
                name: "Unknown Role", // Will be updated later with proper sync
              },
            });

            // Create user-role assignment
            await prisma.userRole.create({
              data: {
                userId: dbUser.id,
                discordRoleId: roleId,
              },
            });
          }
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
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

          // Flatten permissions from all roles
          const permissions = new Set<string>();
          dbUser.roles.forEach((userRole) => {
            userRole.discordRole.permissions.forEach((rolePermission) => {
              permissions.add(rolePermission.permission.key);
            });
          });

          session.user.permissions = Array.from(permissions);
        }
      }

      return session;
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
