import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      discordUsername: string;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    discordId: string;
    discordUsername: string;
  }
}
