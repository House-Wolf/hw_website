import { ExternalLink } from "lucide-react";
import { SafeImage } from "@/components/utils/SafeImage";
import { JSX } from "react";

/**
 * @component SocialLink
 * @description Interface representing an approved social link entry with associated user data.
 * @param {string} id Unique identifier of the social link.
 * @param {string} platform Name of the platform (e.g., "TWITCH").
 * @param {string} channelName Display name of the streamer channel.
 * @param {string} channelUrl URL to the streamer's channel.
 * @param {string} [description] Optional description of the streamer.
 * @param {{ id: string; name: string; discordUsername: string; avatarUrl?: string }} user Associated user profile data.
 * @returns {void} This is a type-only interface and does not return a value.
 * @author House Wolf Dev Team
 */
export interface SocialLink {
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

/**
 * @component StreamerCard
 * @description Renders a Twitch streamer card with avatar, channel information, and a link to watch.
 * @param {SocialLink} streamer Streamer information including channel and user details.
 * @returns {JSX.Element} Rendered streamer card component with hover styling and external link indicator.
 * @author House Wolf Dev Team
 */
export default function StreamerCard({
  streamer,
}: {
  streamer: SocialLink;
}): JSX.Element {
  return (
    <a
      href={streamer.channelUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group 
        bg-gradient-to-br from-purple-900/20 to-obsidian 
        border-2 border-purple-500/30 
        rounded-lg p-6
        hover:border-purple-400
        hover:shadow-[0_0_30px_rgba(168,85,247,0.50)]
        transition-all
      `}
    >
      {/* Avatar & Name */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-purple-400/50">
          {streamer.user.avatarUrl ? (
            <SafeImage
              src={streamer.user.avatarUrl}
              alt={streamer.user.name}
              width={64} // NEW: Required for next/image-based SafeImage
              height={64} // NEW: Matches Tailwind w-16 h-16 (64px)
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-purple-900/40 flex items-center justify-center text-2xl">
              🐺
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-bold text-purple-300 truncate">
            {streamer.channelName}
          </h3>
          <p className="text-sm text-foreground-muted truncate">
            {streamer.user.name || streamer.user.discordUsername}
          </p>
        </div>
      </div>

      {/* Description */}
      {streamer.description && (
        <p className="text-foreground-muted text-sm mb-4 line-clamp-3">
          {streamer.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
          <span className="text-lg">🎮</span>
          <span className="text-xs font-semibold text-purple-300 uppercase">
            Twitch
          </span>
        </div>

        <div className="text-purple-400 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
          Watch <ExternalLink size={16} />
        </div>
      </div>
    </a>
  );
}