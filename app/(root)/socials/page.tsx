"use client";

import React, { useEffect, useState } from "react";
import { SafeImage } from "@/components/utils/SafeImage";
import { ExternalLink } from "lucide-react";

// Types
interface SocialLink {
  id: string;
  platform: string;
  channelName: string;
  channelUrl: string;
  description?: string;
  user: {
    id: string;
    name: string;
    discordUsername: string;
    avatarUrl?: string;
  };
}

// Social platform configuration
const SOCIAL_PLATFORMS = {
  YOUTUBE: {
    name: "YouTube",
    url: "https://www.youtube.com/@HouseWolf-SC",
    description: "Watch our operations, highlights, and cinematic content",
    gradient: "from-red-600 to-red-700",
    hoverGradient: "hover:from-red-500 hover:to-red-600",
    glowColor: "rgba(220, 38, 38, 0.5)",
    borderColor: "border-red-500/30",
  },
  INSTAGRAM: {
    name: "Instagram",
    url: "https://www.instagram.com/housewolfsc/", // Placeholder
    description: "Screenshots, behind-the-scenes, and community moments",
    gradient: "from-pink-600 to-purple-600",
    hoverGradient: "hover:from-pink-500 hover:to-purple-500",
    glowColor: "rgba(236, 72, 153, 0.5)",
    borderColor: "border-pink-500/30",
  },
};

const SocialsPage = () => {
  const [twitchStreamers, setTwitchStreamers] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApprovedStreamers();
  }, []);

  const fetchApprovedStreamers = async () => {
    try {
      const response = await fetch("/api/social-links?status=APPROVED&platform=TWITCH");
      if (response.ok) {
        const data = await response.json();
        setTwitchStreamers(data);
      }
    } catch (error) {
      console.error("Error fetching streamers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-shadow via-obsidian to-night-deep">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-steel-dark/40 via-obsidian/40 to-obsidian/95" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 z-10" />

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto">
          <div className="mb-8">
            <SafeImage
              src="/images/global/HWiconnew.png"
              alt="House Wolf Icon"
              width={120}
              height={120}
              className="mx-auto filter drop-shadow-[0_0_30px_rgba(17,78,98,0.8)]"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-steel-light mb-6 tracking-wider uppercase font-mono drop-shadow-[0_0_20px_rgba(17,78,98,0.8)]">
            The Wolf Network
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-transparent via-steel-light to-transparent mx-auto mb-8 shadow-[0_0_15px_rgba(17,78,98,0.8)]" />
          <p className="text-xl md:text-2xl text-foreground-muted italic leading-relaxed">
            Connect with the pack across the verse
          </p>
        </div>
      </section>

      {/* Official Social Media Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-obsidian to-night-midnight overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-steel/10 via-transparent to-transparent opacity-30" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-steel-light mb-4 uppercase tracking-wider drop-shadow-[0_0_15px_rgba(17,78,98,0.6)]">
              Official Channels
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-steel-light to-transparent mx-auto mb-6 shadow-[0_0_10px_rgba(17,78,98,0.8)]" />
            <p className="text-lg text-foreground-muted">
              Follow our official platforms for updates and content
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* YouTube Card */}
            <a
              href={SOCIAL_PLATFORMS.YOUTUBE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-gradient-to-br from-crimson-dark/20 to-obsidian border-2 border-crimson/30 rounded-lg p-8 hover:border-crimson hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:scale-105 transition-all duration-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl">🎥</div>
                <div>
                  <h3 className="text-3xl font-bold text-crimson-light uppercase tracking-wider">
                    YouTube
                  </h3>
                </div>
              </div>
              <p className="text-foreground-muted leading-relaxed mb-6">
                {SOCIAL_PLATFORMS.YOUTUBE.description}
              </p>
              <div className="flex items-center gap-2 text-crimson-light font-semibold uppercase text-sm tracking-wider group-hover:gap-4 transition-all">
                <span>Subscribe</span>
                <ExternalLink size={18} />
              </div>
            </a>

            {/* Instagram Card */}
            <a
              href={SOCIAL_PLATFORMS.INSTAGRAM.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-gradient-to-br from-pink-900/20 to-obsidian border-2 border-pink-500/30 rounded-lg p-8 hover:border-pink-500 hover:shadow-[0_0_50px_rgba(236,72,153,0.5)] hover:scale-105 transition-all duration-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl">📸</div>
                <div>
                  <h3 className="text-3xl font-bold text-pink-400 uppercase tracking-wider">
                    Instagram
                  </h3>
                </div>
              </div>
              <p className="text-foreground-muted leading-relaxed mb-6">
                {SOCIAL_PLATFORMS.INSTAGRAM.description}
              </p>
              <div className="flex items-center gap-2 text-pink-400 font-semibold uppercase text-sm tracking-wider group-hover:gap-4 transition-all">
                <span>Follow</span>
                <ExternalLink size={18} />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Community Streamers Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-night-midnight to-shadow overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px] animate-pulse" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-purple-400 mb-4 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]">
              Wolf Streamers
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-purple-400 to-transparent mx-auto mb-6 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Watch our pack members in action. These approved content creators represent House Wolf
              with honor and skill.
            </p>
          </div>

          {/* Streamers Grid */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-400"></div>
              <p className="text-foreground-muted mt-4">Loading streamers...</p>
            </div>
          ) : twitchStreamers.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {twitchStreamers.map((streamer) => (
                <StreamerCard key={streamer.id} streamer={streamer} />
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-purple-900/20 to-obsidian border-2 border-purple-500/30 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl text-foreground mb-2">No approved streamers yet</p>
              <p className="text-foreground-muted">
                Check back soon for featured Wolf streamers
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Streamer Card Component
interface StreamerCardProps {
  streamer: SocialLink;
}

const StreamerCard: React.FC<StreamerCardProps> = ({ streamer }) => {
  return (
    <a
      href={streamer.channelUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-gradient-to-br from-purple-900/20 to-obsidian border-2 border-purple-500/30 rounded-lg p-6 hover:border-purple-400 hover:shadow-[0_0_50px_rgba(168,85,247,0.5)] hover:scale-105 transition-all duration-500"
    >
      {/* Avatar and Name */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500/50 group-hover:border-purple-400 transition-colors flex-shrink-0">
          {streamer.user.avatarUrl ? (
            <SafeImage
              src={streamer.user.avatarUrl}
              alt={streamer.user.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-obsidian flex items-center justify-center text-2xl">
              🐺
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-purple-300 group-hover:text-purple-200 transition-colors truncate">
            {streamer.channelName}
          </h3>
          <p className="text-sm text-foreground-muted truncate">
            {streamer.user.name || streamer.user.discordUsername}
          </p>
        </div>
      </div>

      {/* Description */}
      {streamer.description && (
        <p className="text-foreground-muted text-sm leading-relaxed mb-4 line-clamp-3">
          {streamer.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
          <span className="text-lg">🎮</span>
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Twitch</span>
        </div>
        <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm uppercase tracking-wider group-hover:gap-3 transition-all">
          <span>Watch</span>
          <ExternalLink size={16} />
        </div>
      </div>
    </a>
  );
};

export default SocialsPage;
