import { PrismaClient } from "@prisma/client";

/** 
 * @component Prisma Client Instance
 * @description This module exports a singleton instance of PrismaClient to be used throughout the application.
 * It ensures that only one instance is created, even during hot reloads in development mode.
 * @author House Wolf Dev Team
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * @component Prisma Client
 * @description Singleton instance of PrismaClient.
 * @author House Wolf Dev Team
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
