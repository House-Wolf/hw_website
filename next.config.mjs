import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,

  turbopack: {
    root: __dirname,
  },

  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],

  experimental: {

    runtime: "nodejs",

    optimizePackageImports: ["lucide-react"],

  },

  compiler: {
    removeConsole: {
      exclude: ["error"], 
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "media.starcitizen.tools",
      },
      {
        protocol: "https",
        hostname: "cdn.fleetyards.net",
      }
    ],
  },
};

export default nextConfig;
