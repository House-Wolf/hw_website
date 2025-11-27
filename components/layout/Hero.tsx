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

const HERO_HEIGHT = "400px"; // your selected height

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
    <section className="w-full bg-background text-foreground">
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-0 w-full"
        style={{ height: HERO_HEIGHT }}
      >
        {/* LEFT — FEATURE PHOTO */}
        <div className="relative w-full h-full overflow-hidden border-r border-border">
          <Image
            src={activePhoto.url}
            alt={activePhoto.alt}
            fill
            className="object-cover"
            sizes="33vw"
          />

          {/* gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/65 to-transparent" />

          {/* title area */}
          <div className="absolute top-0 left-0 p-4">
            <p className="text-xs uppercase tracking-wider text-white/80 mb-1">
              Featured Photo
            </p>
          </div>

          {/* Photo Navigation */}
          {safePhotos.length > 1 && (
            <div className="absolute bottom-3 right-3 flex gap-2 z-20">
              <button
                onClick={() =>
                  setCurrentPhotoIndex((p) => (p - 1 + safePhotos.length) % safePhotos.length)
                }
                className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPhotoIndex((p) => (p + 1) % safePhotos.length)}
                className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* CENTER — FEATURE VIDEO */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="relative w-full h-full overflow-hidden border-r border-border group"
        >
          <Image
            src={featuredVideo.thumbnail}
            alt={featuredVideo.title}
            fill
            className="object-cover"
            sizes="33vw"
          />

          {/* overlay */}
          <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-all" />

          {/* video content */}
          <div className="absolute bottom-0 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80 mb-1">
              Featured Video
            </p>
            <h3 className="text-xl font-bold text-white">{featuredVideo.title}</h3>

            <div className="w-12 h-12 mt-3 bg-accent-main rounded-full flex items-center justify-center text-white">
              <Play size={24} />
            </div>
          </div>
        </a>

        {/* RIGHT — ANNOUNCEMENTS + EVENTS (STACKED) */}
        <div className="flex flex-col h-full bg-background-soft">
          {/* Announcements */}
          <div className="flex-1 border-b border-border p-4 overflow-auto">
            <header className="flex items-center justify-between">
              <h2 className="text-md text-orange-700 font-bold">Announcements</h2>
              <Bell size={20} className="text-orange-700" />
            </header>

            {announcements.length ? (
              announcements.slice(0, 2).map((a) => (
                <div key={a.id} className="py-2 border-b border-border last:border-none">
                  <div className="flex justify-between text-sm font-semibold">
                    <p>{a.title}</p>
                    <span className="text-foreground-muted text-xs">{a.timestamp}</span>
                  </div>
                  <p className="text-sm text-foreground-muted">{a.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-foreground-muted">
                No announcements at the moment.
              </p>
            )}
          </div>

          {/* Events */}
          <div className="flex-1 p-4 overflow-auto">
            <header className="flex items-center justify-between mb-2">
              <h2 className="text-md text-orange-700 font-bold">Upcoming Events</h2>
              <CalendarDays size={20} className="text-orange-700" />
            </header>

            {events.length ? (
              events.slice(0, 3).map((e) => (
                <div key={e.id} className="py-2 border-b border-border last:border-none">
                  <p className="font-semibold text-sm">{e.title}</p>
                  <p className="text-xs text-accent-soft">
                    {new Date(e.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    • {e.time}
                  </p>
                  <p className="text-sm text-foreground-muted">{e.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-foreground-muted">
                No upcoming events posted.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}