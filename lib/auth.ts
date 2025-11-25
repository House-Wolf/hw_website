import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Allow linking Discord account to existing email
  // This is safe since we verify guild membership
  allowDangerousEmailAccountLinking: true,
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
      // After sign in, sync Discord-specific data and roles
      if (trigger === "signIn" && account && profile) {
        try {
          // Find the user by email (created by adapter)
          const dbUser = await prisma.user.findUnique({
            where: { email: profile.email as string },
          });

          if (dbUser) {
            // Update Discord-specific fields
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                discordId: profile.id as string,
                discordUsername: profile.username as string,
                discordDisplayName: (profile as any).global_name || null,
                avatarUrl: profile.image as string,
                lastLoginAt: new Date(),
              },
            });

            // Fetch and sync Discord roles
            const memberResponse = await fetch(
              `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
              {
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                },
              }
            );

            if (memberResponse.ok) {
              const member = await memberResponse.json();

              if (member.roles) {
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
                      name: "Unknown Role",
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
            }
          }
        } catch (error) {
          console.error("Error syncing Discord data:", error);
        }
      }

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
