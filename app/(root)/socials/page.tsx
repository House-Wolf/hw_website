import type { JSX } from "react";
import Link from "next/link";
import { ArrowRight, Twitch } from "lucide-react";
import PageHero from "@/components/layout/PageHeader";
import { SectionHeader } from "./component/SectionHeader";
import { SocialsCard } from "./component/SocialsCard";
import StreamerCard, { SocialLink } from "./component/StreamerCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * @component SOCIAL_PLATFORMS
 * @description Constant configuration for official House Wolf social channels.
 * @param {{ url: string; description: string }} YOUTUBE YouTube channel metadata.
 * @param {{ url: string; description: string }} INSTAGRAM Instagram account metadata.
 * @returns {{ YOUTUBE: { url: string; description: string }; INSTAGRAM: { url: string; description: string } }} Static configuration object for social platforms.
 * @author House Wolf Dev Team
 */
const SOCIAL_PLATFORMS = {
  YOUTUBE: {
    url: "https://www.youtube.com/@HouseWolf-SC",
    description: "Watch our operations, highlights, and cinematic content",
  },
  INSTAGRAM: {
    url: "https://www.instagram.com/housewolfsc/",
    description: "Screenshots, behind-the-scenes, and community moments",
  },
} as const;

/**
 * @component getApprovedTwitchStreamers
 * @description Fetches approved Twitch streamers from the database using Prisma and adapts them to the SocialLink interface.
 * @returns {Promise<SocialLink[]>} Promise resolving to an array of approved Twitch streamers; returns an empty array on error.
 * @author House Wolf Dev Team
 */
async function getApprovedTwitchStreamers(): Promise<SocialLink[]> {
  try {
    const records = await prisma.socialLink.findMany({
      where: { status: "APPROVED", platform: "TWITCH" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return records.map((s) => ({
      id: s.id,
      platform: s.platform,
      channelName: s.channelName,
      channelUrl: s.channelUrl,
      description: s.description ?? undefined,
      user: {
        id: s.user.id,
        // Ensure user.name is always a string to satisfy SocialLink type
        name: s.user.name ?? "",
        discordUsername: s.user.discordUsername,
        avatarUrl: s.user.avatarUrl ?? undefined,
      },
    }));
  } catch (error) {
    console.error("[SocialsPage] Error fetching approved Twitch streamers:", error);
    return [];
  }
}

/**
 * @component SocialsPage
 * @description Server Component page showing official House Wolf channels and approved Twitch streamers.
 * @returns {Promise<JSX.Element>} Rendered Socials page including hero, official channels, and streamer grid sections.
 * @author House Wolf Dev Team
 */
export default async function SocialsPage(): Promise<JSX.Element> {
  const twitchStreamers = await getApprovedTwitchStreamers();

  return (
    <main className="min-h-screen bg-background-elevated">
      <PageHero
        title="The Wolf Network"
        subtitle="Connect with the pack across the ’Verse"
        iconSrc="/images/global/HWiconnew.png"
      />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section aria-labelledby="official-channels-heading">
          <SectionHeader
            id="official-channels-heading"
            kicker="01 / From House Wolf"
            title="Official channels"
            subtitle="Operations, highlights, and moments from the pack. Follow House Wolf on our official platforms."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <SocialsCard
              title="YouTube"
              platform="youtube"
              handle="@HouseWolf-SC"
              description={SOCIAL_PLATFORMS.YOUTUBE.description}
              url={SOCIAL_PLATFORMS.YOUTUBE.url}
            />
            <SocialsCard
              title="Instagram"
              platform="instagram"
              handle="@housewolfsc"
              description={SOCIAL_PLATFORMS.INSTAGRAM.description}
              url={SOCIAL_PLATFORMS.INSTAGRAM.url}
            />
          </div>
        </section>

        <section aria-labelledby="streamers-heading" className="mt-10 border-t border-white/10 pt-10 sm:mt-12 sm:pt-12">
          <SectionHeader
            id="streamers-heading"
            kicker="02 / From the community"
            title="Wolf Streamers"
            subtitle="Discover approved Twitch creators representing House Wolf across the ’Verse."
          />
          {twitchStreamers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {twitchStreamers.map((streamer) => <StreamerCard key={streamer.id} streamer={streamer} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-background-base p-6 sm:flex-row sm:items-center sm:p-8">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground-muted"><Twitch size={24} aria-hidden="true" /></span>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">No featured streamers yet</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">Approved community channels will appear here. In the meantime, explore our official channels above.</p>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="share-channel-heading" className="mt-10 flex flex-col gap-6 rounded-xl border border-white/15 bg-background-base p-6 sm:mt-12 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">Represent the pack</p>
            <h2 id="share-channel-heading" className="mb-3 text-2xl font-bold text-white sm:text-3xl">Bring your channel to the network</h2>
            <p className="text-base leading-relaxed text-foreground-muted">House Wolf members can submit a Twitch channel from their profile. Once approved, your channel can be featured alongside the pack.</p>
          </div>
          <Link href="/dashboard/profile" className="inline-flex min-h-11 shrink-0 items-center justify-between gap-5 rounded-md border border-white/15 bg-crimson px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-crimson-light focus-visible:outline-white">
            Open my profile <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}
