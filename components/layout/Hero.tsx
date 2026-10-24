"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Play } from "lucide-react";
import type { HomepageAnnouncement } from "@/lib/discord/announcements";
import type { HomepageEvent } from "@/lib/discord/events";
import { normalizeDiscordMentions } from "@/lib/discord/formatMentions";
import { SafeImage } from "../utils/SafeImage";
import MarkdownContent from "../utils/MarkdownContent";

interface FeaturedPhoto { id: string; url: string; alt: string }
interface FeaturedVideo { title: string; thumbnail: string; youtubeId: string }
interface HeroProps {
  events: HomepageEvent[];
  announcements: HomepageAnnouncement[];
  featuredPhotos: FeaturedPhoto[];
  featuredVideo: FeaturedVideo;
}

const fallbackPhoto: FeaturedPhoto = {
  id: "fallback",
  url: "/images/global/Websitebgnew.png",
  alt: "House Wolf featured image",
};

export default function Hero({ events, announcements, featuredPhotos, featuredVideo }: HeroProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const safePhotos = useMemo(() => {
    const valid = featuredPhotos.filter((photo) => photo.url && photo.url.length > 5);
    return valid.length ? valid : [fallbackPhoto];
  }, [featuredPhotos]);
  const activePhoto = safePhotos[currentPhotoIndex % safePhotos.length];

  return (
    <section className="w-full bg-background-base">
      <div className="grid w-full grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr]">
        <div className="group relative h-72 overflow-hidden border-b border-border-default sm:h-96 md:h-[440px] md:border-r xl:h-[clamp(360px,44vh,600px)]">
          <SafeImage src={activePhoto.url} alt={activePhoto.alt} fill priority
            sizes="(min-width: 1280px) 32vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]" />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-black/30" />
          <p className="absolute left-6 top-6 text-xs font-mono uppercase tracking-[0.2em] text-white/80">Through the lens</p>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
            <div>
              <p className="mb-2 text-xs font-mono uppercase tracking-widest text-white/60">House Wolf</p>
              <h2 className="text-2xl font-bold text-white">Featured photo</h2>
            </div>
            {safePhotos.length > 1 && (
              <div className="flex shrink-0 gap-2">
                <button type="button" aria-label="Previous photo"
                  onClick={() => setCurrentPhotoIndex((index) => (index - 1 + safePhotos.length) % safePhotos.length)}
                  className="rounded-full border border-white/25 bg-black/40 p-3 text-white transition-colors hover:bg-steel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" aria-label="Next photo"
                  onClick={() => setCurrentPhotoIndex((index) => (index + 1) % safePhotos.length)}
                  className="rounded-full border border-white/25 bg-black/40 p-3 text-white transition-colors hover:bg-steel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        <a href={`https://www.youtube.com/watch?v=${featuredVideo.youtubeId}`} target="_blank" rel="noopener noreferrer"
          aria-label={`Watch ${featuredVideo.title} on YouTube (opens in a new tab)`}
          className="group relative h-64 overflow-hidden border-b border-border-default focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white sm:h-80 md:h-[440px] xl:h-[clamp(360px,44vh,600px)] xl:border-r">
          <SafeImage src={featuredVideo.thumbnail} alt={featuredVideo.title} fill
            sizes="(min-width: 1280px) 32vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]" />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/95 via-black/20 to-black/35" />
          <p className="absolute left-6 top-6 text-xs font-mono uppercase tracking-[0.2em] text-white/80">Featured video</p>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
            <div>
              <p className="mb-2 text-xs font-mono uppercase tracking-widest text-white/60">Watch the pack in action</p>
              <h2 className="text-2xl font-bold text-white">{featuredVideo.title}</h2>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-crimson-light text-white transition-colors group-hover:bg-crimson">
              <Play size={20} className="ml-0.5" fill="currentColor" />
            </span>
          </div>
        </a>

        <section aria-labelledby="announcements-heading" className="min-w-0 border-b border-border-default bg-background-soft p-5 sm:p-7 md:col-span-2 xl:col-span-1 xl:h-[clamp(360px,44vh,600px)] xl:overflow-y-auto">
          <header className="mb-5 flex items-center justify-between gap-4 border-b border-border-default pb-4">
            <div>
              <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-foreground-muted">From the pack</p>
              <h2 id="announcements-heading" className="text-lg font-bold text-foreground">Announcements</h2>
            </div>
            <Bell size={20} className="text-foreground-muted" aria-hidden="true" />
          </header>
          <div className="divide-y divide-white/10">
            {announcements.length ? announcements.slice(0, 3).map((announcement) => (
              <article key={announcement.id} className="py-5 first:pt-0 last:pb-0">
                <p className="mb-2 text-xs text-foreground-muted">{announcement.timestamp}</p>
                <h3 className="mb-2 break-words text-base font-semibold leading-snug text-foreground">{announcement.title}</h3>
                {announcement.imageUrl && (
                  <a href={announcement.imageUrl} target="_blank" rel="noopener noreferrer"
                    aria-label={`Open image for ${announcement.title} (opens in a new tab)`}
                    className="relative float-right mb-2 ml-4 block h-20 w-28 overflow-hidden rounded-md border border-border-default focus-visible:outline-2 focus-visible:outline-white">
                    <SafeImage src={announcement.imageUrl} alt="Announcement photo" fill sizes="112px" className="object-cover" />
                  </a>
                )}
                {announcement.content.length > 220 ? (
                  <details className="group/news">
                    <summary className="cursor-pointer list-none rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
                      <span className="mb-3 block break-words text-sm leading-relaxed text-foreground-muted group-open/news:hidden">{announcement.excerpt}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <span className="group-open/news:hidden">Read announcement</span>
                        <span className="hidden group-open/news:inline">Close announcement</span>
                        <ChevronDown size={14} className="transition-transform group-open/news:rotate-180" aria-hidden="true" />
                      </span>
                    </summary>
                    <MarkdownContent content={announcement.content} className="mt-1 border-t-2 border-white/25 pt-5 break-words text-sm leading-relaxed text-foreground-muted [&_img]:hidden" />
                  </details>
                ) : (
                  <MarkdownContent content={announcement.content} className="break-words text-sm leading-relaxed text-foreground-muted [&_img]:hidden" />
                )}
                <div className="clear-both" />
              </article>
            )) : <p className="py-5 text-sm text-foreground-muted">Check back soon for news from House Wolf.</p>}
          </div>
        </section>
      </div>

      {events.length > 0 && (
        <section aria-labelledby="events-heading" className="border-b border-border-default bg-background-elevated bg-cover bg-center bg-no-repeat px-5 py-10 sm:px-8 sm:py-12"
          style={{ backgroundImage: "linear-gradient(rgb(0 0 0 / 70%), rgb(0 0 0 / 70%)), url('/images/global/SentinelWolfBoomTube.png')" }}>
          <div className="mx-auto max-w-7xl">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-foreground-muted"><CalendarDays size={15} aria-hidden="true" /> Rally with the pack</p>
                <h2 id="events-heading" className="text-2xl font-bold text-foreground sm:text-3xl">Upcoming events</h2>
              </div>
              <p className="text-xs text-foreground-muted">All times UTC · Join us on Discord</p>
            </header>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const start = new Date(event.scheduledStartTime);
                return (
                  <article key={event.id} className="flex min-w-0 flex-col rounded-xl border border-border-default bg-background-soft p-5 transition-colors hover:border-steel-light">
                    <div className="mb-5 flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-steel/50 bg-steel/15">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted">{start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</span>
                        <span className="text-2xl font-bold leading-tight text-foreground">{start.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" })}</span>
                      </div>
                      <div className="text-xs text-foreground-muted">
                        <p className="mb-1.5 font-semibold text-foreground">{event.isLive ? "Live now" : start.toLocaleDateString("en-US", { weekday: "long", year: "numeric", timeZone: "UTC" })}</p>
                        <time dateTime={event.scheduledStartTime} className="flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />{start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</time>
                      </div>
                    </div>
                    <h3 className="mb-3 break-words text-lg font-semibold leading-snug text-foreground">{normalizeDiscordMentions(event.title)}</h3>
                    <MarkdownContent content={normalizeDiscordMentions(event.description)} className="mb-5 line-clamp-3 break-words text-sm leading-relaxed text-foreground-muted [&_img]:hidden" />
                    <a href={event.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${normalizeDiscordMentions(event.title)} on Discord (opens in a new tab)`}
                      className="mt-auto inline-flex min-h-11 items-center justify-between gap-3 border-t border-border-default pt-4 text-sm font-semibold text-foreground hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                      View event on Discord <ArrowUpRight size={17} aria-hidden="true" />
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
