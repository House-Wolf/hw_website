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

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i1.ytimg.com" },
      { protocol: "https", hostname: "i2.ytimg.com" },
      { protocol: "https", hostname: "i3.ytimg.com" },
      { protocol: "https", hostname: "i4.ytimg.com" },
      { protocol: "https", hostname: "media.starcitizen.tools" },
      { protocol: "https", hostname: "cdn.fleetyards.net" },
    ],
  },
};

export default nextConfig;

/**
 * @type {import('next').MiddlewareConfig}
 * Proxy does not support middleware inside proxy.ts,
 * so we have to define it here.
 */

export const middleware = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/marketplace/upload|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
