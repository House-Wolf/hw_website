"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Play } from "lucide-react";

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

const fallbackPhoto: FeaturedPhoto = {
  id: "fallback",
  url: "/images/global/HWpic1.png",
  alt: "House Wolf featured image",
};

const HERO_HEIGHT = "450px";

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

  return (
    <section className="w-full bg-background-base">
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-0 w-full"
        style={{ height: HERO_HEIGHT }}
      >
        {/* LEFT — FEATURED PHOTO */}
        <div className="relative w-full h-full overflow-hidden border-r border-border-subtle group">
          <Image
            src={activePhoto.url}
            alt={activePhoto.alt}
            fill
            className="object-cover transition-transform duration-slow group-hover:scale-101"
            sizes="33vw"
            priority
          />

          {/* linear overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />

          {/* Crimson accent overlay on hover */}
          <div className="absolute inset-0 bg-crimson/10 opacity-0 group-hover:opacity-100 transition-opacity duration-base" />

          {/* Title area */}
          <div className="absolute top-0 left-0 p-4 z-10">
            <p className="text-xs uppercase tracking-widest text-foreground/80 font-mono">
              Featured Photo
            </p>
          </div>

          {/* Photo Navigation */}
          {safePhotos.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
              <button
                onClick={() =>
                  setCurrentPhotoIndex((p) => (p - 1 + safePhotos.length) % safePhotos.length)
                }
                className="bg-background-card/80 backdrop-blur-sm hover:bg-crimson border border-border-default hover:border-crimson text-foreground p-2 rounded-md transition-all shadow-md hover:shadow-crimson"
                aria-label="Previous photo"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPhotoIndex((p) => (p + 1) % safePhotos.length)}
                className="bg-background-card/80 backdrop-blur-sm hover:bg-crimson border border-border-default hover:border-crimson text-foreground p-2 rounded-md transition-all shadow-md hover:shadow-crimson"
                aria-label="Next photo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* CENTER — FEATURED VIDEO */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="relative w-full h-full overflow-hidden border-r border-border-subtle group"
        >
          <Image
            src={featuredVideo.thumbnail}
            alt={featuredVideo.title}
            fill
            className="object-cover transition-transform duration-slow group-hover:scale-101"
            sizes="33vw"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50 to-black/30 group-hover:from-black/80 transition-all" />

          {/* Steel teal accent on hover */}
          <div className="absolute inset-0 bg-steel/10 opacity-0 group-hover:opacity-100 transition-opacity duration-base" />

          {/* Video content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
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

        {/* RIGHT — ANNOUNCEMENTS + EVENTS (STACKED) */}
        <div className="flex-1 flex-col h-full bg-background-soft">
          {/* Announcements */}
          <div className="flex-1 border-b border-border-subtle p-2 overflow-auto ">
            <header className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-crimson-light">
                Announcements
              </h2>
              <Bell size={18} className="text-crimson-light" />
            </header>

            <div className="space-y-2">
              {announcements.length ? (
                announcements.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-md bg-background-elevated/50 border border-border-subtle hover:border-crimson transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground">{a.title}</p>
                      <span className="text-xs text-foreground-muted font-mono whitespace-nowrap">
                        {a.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted leading-relaxed">{a.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground-muted italic">
                  No announcements at the moment.
                </p>
              )}
            </div>
          </div>

          {/* Events */}
          <div className="flex-1 p-5 overflow-auto">
            <header className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-steel-light mb-3">
                Upcoming Events
              </h2>
              <CalendarDays size={18} className="text-steel-light" />
            </header>

            <div className="space-y-3">
              {events.length ? (
                events.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-md bg-background-elevated/50 border border-border-subtle hover:border-teal transition-colors"
                  >
                    <p className="font-semibold text-sm text-foreground mb-1">{e.title}</p>
                    <p className="text-xs text-steel-light font-mono mb-1">
                      {new Date(e.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      • {e.time}
                    </p>
                    <p className="text-xs text-foreground-muted leading-relaxed">
                      {e.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground-muted italic">
                  No upcoming events posted.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
