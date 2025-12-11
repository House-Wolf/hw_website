import React, { JSX } from "react";
import PageHero from "@/components/layout/PageHeader";
import { SectionHeader } from "./component/SectionHeader";
import { SocialsCard } from "./component/SocialsCard";
import StreamerCard, { SocialLink } from "./component/StreamerCard";
import { prisma } from "@/lib/prisma";

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
    <div className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
      {/* HERO */}
      <PageHero
        title="The Wolf Network"
        subtitle="Connect with the pack across the verse"
        iconSrc="/images/global/HWiconnew.png"
      />

      <section className="relative py-12 md:py-20 px-4 bg-linear-to-b from-obsidian to-night-midnight overflow-visible">
        {/* NEW: overflow-visible ensures glow is not clipped */}
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeader
            title="Official Channels"
            subtitle="Follow our platforms for updates & media"
            colorClass="steel-light"
          />

          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <SocialsCard
              title="YouTube"
              emoji="🎥"
              description={SOCIAL_PLATFORMS.YOUTUBE.description}
              colorClass="crimson"
              url={SOCIAL_PLATFORMS.YOUTUBE.url}
            />
            <SocialsCard
              title="Instagram"
              emoji="📸"
              description={SOCIAL_PLATFORMS.INSTAGRAM.description}
              colorClass="pink"
              url={SOCIAL_PLATFORMS.INSTAGRAM.url}
            />
          </div>
        </div>
      </section>

      {/* ----------------------- STREAMERS ----------------------- */}
      <section className="relative py-12 md:py-20 px-4 bg-linear-to-b from-night-midnight to-shadow overflow-visible">
        {/* NEW: overflow-visible here as well in case cards gain glow later */}
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeader
            title="Wolf Streamers"
            subtitle="Approved content creators representing House Wolf"
            colorClass="purple-400"
          />

          {twitchStreamers.length > 0 ? (
            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {twitchStreamers.map((streamer) => (
                <StreamerCard key={streamer.id} streamer={streamer} />
              ))}
            </div>
          ) : (
            <div className="text-center text-foreground-muted py-20">
              No streamers approved yet
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
