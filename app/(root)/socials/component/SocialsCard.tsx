import { ExternalLink, Instagram, Youtube } from "lucide-react";

const platformIcons = { youtube: Youtube, instagram: Instagram };

interface SocialsCardProps {
  title: string;
  platform: keyof typeof platformIcons;
  handle: string;
  description: string;
  url: string;
}

/** Official channel card with a clear external destination. */
export function SocialsCard({ title, platform, handle, description, url }: SocialsCardProps) {
  const Icon = platformIcons[platform];

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      aria-label={`Visit House Wolf on ${title} (opens in a new tab)`}
      className="group flex min-w-0 flex-col rounded-xl border border-white/10 bg-background-base p-6 transition-colors hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-7">
      <div className="mb-5 flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
          <Icon size={25} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-2xl font-semibold text-white">{title}</h3>
          <p className="mt-1 break-words text-sm text-foreground-muted">{handle}</p>
        </div>
      </div>
      <p className="mb-6 text-base leading-relaxed text-foreground-muted">{description}</p>
      <span className="mt-auto flex min-h-11 items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm font-semibold text-white">
        Visit {title} <ExternalLink size={16} aria-hidden="true" />
      </span>
    </a>
  );
}
