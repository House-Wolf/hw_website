"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { SafeImage } from "../utils/SafeImage";
import { normalizeDiscordMentions } from "@/lib/discord/formatMentions";
import MarkdownContent from "../utils/MarkdownContent";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  imageUrl?: string | null;
}

interface FeaturedPhoto {
  id: string;
  url: string;
  alt: string;
}

interface FeaturedVideo {
  title: string;
  thumbnail: string;
  youtubeId: string;
}

interface HeroProps {
  events: Event[];
  announcements: Announcement[];
  featuredPhotos: FeaturedPhoto[];
  featuredVideo: FeaturedVideo;
}

const HERO_HEIGHT = {
  mobile: "320px",
  tablet: "400px",
  desktop: "520px",
  max: "680px", // hard upper limit
};

const fallbackPhoto: FeaturedPhoto = {
  id: "fallback",
  url: "/images/global/Websitebgnew.png",
  alt: "House Wolf featured image",
};

/**
 * @component Hero - The main hero section component for the homepage.
 * @description Renders a responsive hero section with featured photo, video,
 * announcements, and upcoming events.
 * @author House Wolf Dev Team
 */
export default function Hero({
  events,
  announcements,
  featuredPhotos,
  featuredVideo,
}: HeroProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const safePhotos = useMemo(() => {
    const valid = featuredPhotos.filter((p) => p.url && p.url.length > 5);
    return valid.length ? valid : [fallbackPhoto];
  }, [featuredPhotos]);

  const activePhoto = safePhotos[currentPhotoIndex % safePhotos.length];
  const videoUrl = `https://www.youtube.com/watch?v=${featuredVideo.youtubeId}`;

  const formattedAnnouncements = useMemo(
    () =>
      announcements.map((a) => ({
        ...a,
        title: normalizeDiscordMentions(a.title),
        content: normalizeDiscordMentions(a.content),
      })),
    [announcements]
  );

  const formattedEvents = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        title: normalizeDiscordMentions(e.title),
        description: normalizeDiscordMentions(e.description),
      })),
    [events]
  );

  return (
    <section className="w-full bg-background-base mt-0">
      {/* Mobile: ONLY show featured image */}
      <div className="block lg:hidden w-full h-[320px] relative">
        <SafeImage
          src={activePhoto.url}
          alt={activePhoto.alt}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute bottom-3 left-3 text-white text-sm font-semibold drop-shadow-md">
          Featured Photo
        </div>
      </div>

      {/* Desktop: 3-column hero layout */}
      <div
        className="hidden lg:grid lg:grid-cols-3 gap-0 w-full"
        style={{
          height: `clamp(${HERO_HEIGHT.mobile}, 40vh, ${HERO_HEIGHT.max})`,
        }}
      >
        {/* LEFT — FEATURED PHOTO */}
        <div className="relative w-full h-full overflow-hidden border-r border-border-subtle group">
          <SafeImage
            src={activePhoto.url}
            alt={activePhoto.alt}
            fill
            className="object-cover transition-transform duration-slow group-hover:scale-101"
            sizes="33vw"
            priority
          />

          {/* dark gradient */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* crimson hover overlay */}
          <div className="absolute inset-0 bg-crimson/10 opacity-0 group-hover:opacity-100 transition-opacity duration-base pointer-events-none" />

          {/* label */}
          <div className="absolute top-0 left-0 p-4 z-20">
            <p className="text-xs uppercase tracking-widest text-foreground/80 font-mono">
              Featured Photo
            </p>
          </div>

          {/* Photo navigation */}
          {safePhotos.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
              <button
                onClick={() =>
                  setCurrentPhotoIndex(
                    (p) => (p - 1 + safePhotos.length) % safePhotos.length
                  )
                }
                className="bg-background-card/80 backdrop-blur-sm hover:bg-crimson border border-border-default hover:border-crimson text-foreground p-2 rounded-md transition-all shadow-md hover:shadow-crimson"
                aria-label="Previous photo"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={() =>
                  setCurrentPhotoIndex((p) => (p + 1) % safePhotos.length)
                }
                className="bg-background-card/80 backdrop-blur-sm hover:bg-crimson border border-border-default hover:border-crimson text-foreground p-2 rounded-md transition-all shadow-md hover:shadow-crimson"
                aria-label="Next photo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* MIDDLE — FEATURED VIDEO */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="relative w-full h-full overflow-hidden border-r border-border-subtle group"
        >
          <SafeImage
            src={featuredVideo.thumbnail}
            alt={featuredVideo.title}
            fill
            className="object-cover transition-transform duration-slow group-hover:scale-101"
            sizes="33vw"
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50 to-black/30 group-hover:from-black/80 transition-all pointer-events-none" />

          {/* teal hover overlay */}
          <div className="absolute inset-0 bg-steel/10 opacity-0 group-hover:opacity-100 transition-opacity duration-base pointer-events-none" />

          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <p className="text-xs uppercase tracking-widest text-steel-light mb-2 font-mono">
              Featured Video
            </p>

            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              {featuredVideo.title}
            </h3>

            <div className="inline-flex items-center justify-center w-14 h-14 bg-linear-to-br from-crimson to-crimson-light rounded-full text-foreground shadow-lg group-hover:shadow-crimson transition-all group-hover:scale-110">
              <Play size={24} className="ml-1" fill="currentColor" />
            </div>
          </div>
        </a>

        {/* RIGHT — ANNOUNCEMENTS ONLY */}
        <div className="flex flex-col w-full h-full bg-background-soft overflow-hidden">
          {/* Announcements */}
          <div className="w-full h-full p-4 overflow-y-auto scrollbar-hide">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-crimson-light">
                Announcements
              </h2>
              <Bell size={18} className="text-crimson-light" />
            </header>

            <div className="space-y-3">
              {formattedAnnouncements.length ? (
                formattedAnnouncements.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-md bg-background-elevated/50 border border-border-subtle hover:border-crimson transition-colors"
                  >
                    <div className="flex justify-between mb-1">
                      <p className="text-md font-semibold text-foreground">
                        {a.title}
                      </p>
                      <span className="text-md text-foreground-muted font-mono whitespace-nowrap">
                        {a.timestamp}
                      </span>
                    </div>

                    <MarkdownContent
                      content={a.content}
                      className="text-md text-foreground-muted leading-relaxed"
                    />
                    {a.imageUrl && (
                      <div className="mt-3 overflow-hidden rounded-md border border-border-subtle">
                        <img
                          src={a.imageUrl}
                          alt={a.title || "Announcement media"}
                          loading="lazy"
                          className="w-full max-h-48 object-contain bg-black/40"
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-md text-foreground-muted italic">
                  No announcements at the moment.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH EVENTS SECTION (below hero) */}
      <div
        className="w-full border-t border-border-subtle py-8 px-4 md:px-8 lg:px-12 relative"
        style={{
          backgroundImage: "url('/images/global/SentinelWolfBoomTube.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Content container */}
        <div className="relative z-10">
          <header className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
            <h2 className="text-lg md:text-xl font-bold uppercase tracking-widest text-steel-light">
              Upcoming Events
            </h2>
            <CalendarDays size={24} className="text-steel-light" />
          </header>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formattedEvents.length ? (
            formattedEvents.map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-lg bg-background-card border border-border-subtle hover:border-steel transition-colors shadow-sm hover:shadow-md"
              >
                <p className="font-bold text-lg text-foreground mb-2">
                  {e.title}
                </p>

                <p className="text-sm text-steel-light font-mono mb-3">
                  {new Date(e.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  • {e.time}
                </p>

                <MarkdownContent
                  content={e.description}
                  className="text-sm text-foreground-muted leading-relaxed"
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-foreground-muted italic col-span-full">
              No upcoming events posted.
            </p>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}
