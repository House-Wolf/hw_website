import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "House Wolf",
    short_name: "House Wolf",
    description:
      "House Wolf command center, marketplace, fleet tools, and member operations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#080b0d",
    theme_color: "#114e62",
    icons: [
      {
        src: "/images/global/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/global/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/global/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
