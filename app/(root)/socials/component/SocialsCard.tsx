import { ExternalLink } from "lucide-react";
import { JSX } from "react";

/**
 * @component SocialsCard
 * @description Displays a social media platform card with emoji, description, brand color, and hover glow.
 * @param {string} title Platform name (e.g., "YouTube").
 * @param {string} emoji Emoji representing the platform.
 * @param {string} description Short description of the platform content.
 * @param {"crimson" | "pink"} colorClass Brand color key controlling styling and glow.
 * @param {string} url External URL to the platform.
 * @returns {JSX.Element} Rendered social card component with hover effects and external link indicator.
 * @author House Wolf Dev Team
 */
const SOCIAL_CARD_STYLES = {
  crimson: {
    bg: "bg-linear-to-br from-red-900/20 to-obsidian",
    border: "border-red-500/30",
    hoverBorder: "hover:border-red-500",
    hoverShadow: "hover:shadow-[0_0_50px_rgba(239,68,68,0.55)]",
    titleText: "text-red-400",
    accentText: "text-red-300",
  },
  pink: {
    bg: "bg-linear-to-br from-pink-900/20 to-obsidian",
    border: "border-pink-500/30",
    hoverBorder: "hover:border-pink-500",
    hoverShadow: "hover:shadow-[0_0_50px_rgba(236,72,153,0.55)]",
    titleText: "text-pink-400",
    accentText: "text-pink-300",
  },
} as const;

/**
 * @component SocialsCard
 * @description Displays a social media platform card with emoji, description, brand color, and hover glow.
 * @param {string} title Platform name (e.g., "YouTube").
 * @param {string} emoji Emoji representing the platform.
 * @param {string} description Short description of the platform content.
 * @param {"crimson" | "pink"} colorClass Brand color key controlling styling and glow.
 * @param {string} url External URL to the platform.
 * @returns {JSX.Element} Rendered social card component with hover effects and external link indicator.
 * @author House Wolf Dev Team
 */
export function SocialsCard({
  title,
  emoji,
  description,
  colorClass,
  url,
}: {
  title: string;
  emoji: string;
  description: string;
  colorClass: keyof typeof SOCIAL_CARD_STYLES;
  url: string;
}): JSX.Element {
  const styles = SOCIAL_CARD_STYLES[colorClass];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group 
        ${styles.bg}
        border-2 ${styles.border}
        rounded-lg p-6 md:p-8
        ${styles.hoverBorder}
        ${styles.hoverShadow} 
        hover:scale-[1.03]
        transition-all duration-400
      `}
    >
      <div className={`flex items-center gap-4 mb-6 ${styles.titleText}`}>
        <span className="text-5xl">{emoji}</span>
        <h3
          className={`text-2xl md:text-3xl font-bold uppercase tracking-wider ${styles.accentText}`}
        >
          {title}
        </h3>
      </div>

      <p className="text-foreground-muted text-sm md:text-base leading-relaxed mb-6">
        {description}
      </p>

      <div
        className={`
          flex items-center gap-2 
          ${styles.accentText}
          font-semibold uppercase text-sm 
          group-hover:gap-4 
          transition-all
        `}
      >
        <span>Visit</span>
        <ExternalLink size={18} />
      </div>
    </a>
  );
}