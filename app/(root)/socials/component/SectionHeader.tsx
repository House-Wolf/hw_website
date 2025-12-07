/**
 * @component SectionHeader
 * @description Renders a styled section header with a title, optional subtitle, and color-accented divider.
 * @param {string} title The main title text to display.
 * @param {string} [subtitle] Optional subtitle text shown below the title.
 * @param {"steel-light" | "crimson" | "pink" | "purple-400"} [colorClass] Supported color key controlling text and divider color.
 * @returns {JSX.Element} Rendered section header component.
 * @author House Wolf Dev Team
 */

import { JSX } from "react";

// Added a safe COLOR_STYLES map to avoid dynamic Tailwind class names.
const SECTION_HEADER_COLOR_STYLES = {
  "steel-light": {
    text: "text-steel-light",
    via: "via-steel-light",
  },
  crimson: {
    text: "text-crimson",
    via: "via-crimson",
  },
  pink: {
    text: "text-pink-400",
    via: "via-pink-400",
  },
  "purple-400": {
    text: "text-purple-400",
    via: "via-purple-400",
  },
} as const;

/**
 * @component SectionHeader
 * @description Displays a section header with title, optional subtitle, and color-accented divider.
 * @param {string} title Main title text.
 * @param {string} [subtitle] Optional subtitle text below the title.
 * @param {"steel-light" | "crimson" | "pink" | "purple-400"} [colorClass="steel-light"] Color key for text and divider styling.
 * @returns {JSX.Element} Rendered section header component.
 * @author House Wolf Dev Team
 */
export function SectionHeader({
  title,
  subtitle,
  colorClass = "steel-light",
}: {
  title: string;
  subtitle?: string;
  colorClass?: keyof typeof SECTION_HEADER_COLOR_STYLES;
}): JSX.Element {
  const styles = SECTION_HEADER_COLOR_STYLES[colorClass];

  return (
    <div className="text-center mb-16">
      <h2
        className={`text-4xl md:text-5xl font-bold mb-4 uppercase tracking-wider ${styles.text}`}
      >
        {title}
      </h2>

      <div
        className={`h-1 w-24 mx-auto mb-6 bg-gradient-to-r from-transparent ${styles.via} to-transparent`}
      />

      {subtitle && (
        <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}


