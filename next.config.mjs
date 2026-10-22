import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevelopment = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://discord.com",
  [
    "script-src 'self' 'unsafe-inline'",
    isDevelopment ? "'unsafe-eval'" : "",
    "https://va.vercel-scripts.com",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://discord.com",
    "https://*.discord.com",
    "https://api.fleetyards.net",
    "https://api.uexcorp.uk",
    "https://api.star-citizen.wiki",
    "https://starcitizen.tools",
    "https://generativelanguage.googleapis.com",
    "https://*.googleapis.com",
    "https://api.groq.com",
    "https://vitals.vercel-insights.com",
    "https://*.vercel-insights.com",
  ].join(" "),
  "media-src 'self' blob:",
  "frame-src 'self' https://discord.com https://www.youtube.com https://www.youtube-nocookie.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

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
  poweredByHeader: false,
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
     {
        protocol: "https",
        hostname: "**.fleetyards.net",
      },
      {
        protocol: "https",
        hostname: "cdn.fleetyards.net",
      },
    ],
  },

  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

// Middleware configuration has been moved to proxy.ts (required for Next.js 15+)
