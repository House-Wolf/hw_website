import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],

  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "media.starcitizen.tools" },
      { protocol: "https", hostname: "cdn.fleetyards.net" },
    ],

    /** ⭐ REQUIRED FOR LOCAL IMAGES ⭐ */
    localPatterns: [
      // All public images
      { pathname: "/images/**" },

      // All uploaded profile images
      { pathname: "/uploads/profiles/**" },

      // Marketplace uploaded images (signed URLs)
      {
        pathname: "/api/marketplace/uploaded/**",
        search: "**", // <-- MUST allow query strings
      },
    ],
  },
};

export default nextConfig;

// Middleware configuration has been moved to proxy.ts (required for Next.js 15+)
