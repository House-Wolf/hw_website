import type { Metadata } from "next";
import Hero from "@/components/layout/Hero";
import CTA from "@/components/layout/CTA";
import {
  getUpcomingEvents,
  getAnnouncements,
  getFeaturedPhotos,
  getFeaturedVideo,
} from "@/lib/discord";
import { JSX } from "react";

/**
 * @metadata
 * @description Metadata for the Home page, including title, description, keywords, authors, Open Graph, Twitter card, robots directives, and canonical URL.
 * @type {Metadata}
 * @author House Wolf Dev Team
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://housewolf.co"), // ✅ NEW: Fix OG/Twitter image resolution

  title: "House Wolf - Elite Star Citizen Mercenary Organization",
  description:
    "Join House Wolf, a premier Star Citizen mercenary organization. Explore our divisions: TACOPS, ARCCOPS, SPECOPS, and LOCOPS. Browse our marketplace and join our community.",
  keywords: [
    "Star Citizen",
    "House Wolf",
    "mercenary",
    "organization",
    "TACOPS",
    "ARCCOPS",
    "SPECOPS",
    "LOCOPS",
    "marketplace",
  ],
  authors: [{ name: "House Wolf Development Team" }],
  openGraph: {
    title: "House Wolf - Elite Star Citizen Mercenary Organization",
    description:
      "Join House Wolf, a premier Star Citizen mercenary organization with specialized divisions and an active marketplace.",
    url: "https://housewolf.co",
    siteName: "House Wolf",
    images: [
      {
        url: "/images/global/Websitebgnew.png",
        width: 1200,
        height: 630,
        alt: "House Wolf Banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "House Wolf - Elite Star Citizen Organization",
    description: "Join House Wolf, a premier Star Citizen mercenary organization.",
    images: ["/images/global/Websitebgnew.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://housewolf.co",
  },
}


/**
 * @component Home
 * @description The main landing page of the website, featuring upcoming events, announcements, featured photos, and a featured video.
 * @returns {Promise<JSX.Element>} The rendered Home page component.
 * @author House Wolf Dev Team
 */
export default async function Home(): Promise<JSX.Element> {
  // Explicit return type (Promise<JSX.Element>) improves type safety for this async Server Component.
  const [eventsRaw, announcementsRaw, featuredPhotosRaw, featuredVideoRaw] =
    await Promise.all([
      getUpcomingEvents(),
      getAnnouncements(),
      getFeaturedPhotos(),
      getFeaturedVideo(),
    ]);

  const events = Array.isArray(eventsRaw) ? eventsRaw : [];
  const announcements = Array.isArray(announcementsRaw) ? announcementsRaw : [];
  const featuredPhotos =
    Array.isArray(featuredPhotosRaw) && featuredPhotosRaw.length > 0
      ? featuredPhotosRaw
      : [];

  const featuredVideo =
    featuredVideoRaw &&
    typeof featuredVideoRaw === "object" &&
    !Array.isArray(featuredVideoRaw) 
      ? featuredVideoRaw
      : {
          title: "House Wolf",
          thumbnail: "/images/global/Websitebgnew.png",
          youtubeId: "dQw4w9WgXcQ",
        };

  return (
    <main>
      <Hero
        events={events}
        announcements={announcements}
        featuredPhotos={featuredPhotos}
        featuredVideo={featuredVideo}
      />
      <CTA />
    </main>
  );
}
