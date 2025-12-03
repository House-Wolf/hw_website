// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      discordUsername: string;
      discordDisplayName?: string | null;
      avatarUrl?: string | null;
      isActive: boolean;
      permissions: string[];
      roles: {
        discordRoleId: string;
        name?: string;
      }[];
      rankName?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    discordId?: string;
    discordUsername?: string;
    discordDisplayName?: string | null;
    avatarUrl?: string | null;
    isActive?: boolean;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    discordId?: string;
    discordUsername?: string;
    discordDisplayName?: string | null;
    avatarUrl?: string | null;
    isActive?: boolean;
  }
}
