import { ExternalLink, Twitch } from "lucide-react";
import { SafeImage } from "@/components/utils/SafeImage";

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

/** Approved community creator; channel links do not imply a live broadcast. */
export default function StreamerCard({ streamer }: { streamer: SocialLink }) {
  const memberName = streamer.user.name || streamer.user.discordUsername || "House Wolf creator";
  const channelName = streamer.channelName || memberName;

  return (
    <a href={streamer.channelUrl} target="_blank" rel="noopener noreferrer"
      aria-label={`Visit ${channelName} on Twitch (opens in a new tab)`}
      className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-background-base p-6 transition-colors hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
      <p className="mb-5 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-foreground-muted"><Twitch size={15} aria-hidden="true" /> Twitch creator</p>
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5">
          <SafeImage
            src={streamer.user.avatarUrl || "/images/global/HWiconnew.png"}
            alt=""
            fill
            sizes="56px"
            className={streamer.user.avatarUrl ? "object-cover" : "object-contain p-1"}
          />
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold leading-snug text-white">{channelName}</h3>
          <p className="mt-1 break-words text-sm text-foreground-muted">{memberName}</p>
        </div>
      </div>
      <p className="mb-6 mt-4 break-words text-sm leading-relaxed text-foreground-muted">
        {streamer.description || "Discover broadcasts and highlights from a member of the House Wolf community."}
      </p>
      <span className="mt-auto flex min-h-11 items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm font-semibold text-white">
        View Twitch channel <ExternalLink size={16} aria-hidden="true" />
      </span>
    </a>
  );
}
