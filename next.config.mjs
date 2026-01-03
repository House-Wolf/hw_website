import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @component NextConfig
 * @description Next.js configuration for the House Wolf App Router application.
 *              Configures Turbopack, output file tracing, Prisma bundling behavior,
 *              and allowed remote image domains for optimized Next/Image usage.
 * @param {string} [rootDir] Optional project root directory reference; by default this
 *                           aligns with the directory of this config file.
 * @returns {import('next').NextConfig} Next.js configuration object used at build and runtime.
 * @author House Wolf Dev Team
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],

  images: {
    formats: ["image/avif", "image/webp"],
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**",
        },
      ],
  },

  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

// Middleware configuration has been moved to proxy.ts (required for Next.js 15+)
