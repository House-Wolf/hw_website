import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      discordUsername: string;
      isActive: boolean;
      permissions: string[];
    } & DefaultSession["user"];
  }

  // User interface extends the base user with optional Discord fields
  // These are populated during profile callback
  interface User {
    discordId?: string;
    discordUsername?: string;
    discordDisplayName?: string | null;
    isActive?: boolean;
  }
}

// Extend AdapterUser to include our custom fields
declare module "@auth/core/adapters" {
  interface AdapterUser {
    discordId?: string;
    discordUsername?: string;
    discordDisplayName?: string | null;
    isActive?: boolean;
  }
}
