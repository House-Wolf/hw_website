/**
 * @config Tailwind Configuration
 * @description Defines the full TailwindCSS theme for House Wolf, including custom colors,
 * variables, fonts, spacing, and semantic design tokens. Expanded content paths ensure
 * compatibility with Next.js 16 App Router and grouped route segments.
 * @returns {import('tailwindcss').Config} Tailwind configuration object
 * @author House Wolf Dev Team
 *  ### REVIEWED 12/08/2025 ###
 */
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  darkMode: ["class"],

  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./app/**/(.)*/**/*.{ts,tsx,mdx}",
    "./lib/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: "#470000",
          dark: "#2a0000",
          light: "#6b0000",
          lighter: "#8a0000",
        },
        night: {
          deep: "#09171E",
          midnight: "#071F27",
        },
        steel: {
          DEFAULT: "#114E62",
          light: "#1a6b8a",
          dark: "#0d3a4a",
        },
        obsidian: "#0D1517",
        shadow: "#070B0C",

        "hw-background": {
          DEFAULT: "var(--background-base)",
          soft: "var(--background-soft)",
          elevated: "var(--background-elevated)",
          card: "var(--background-card)",
        },
        "hw-foreground": {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          hover: "var(--accent-primary-hover)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          crimson: "var(--border-crimson)",
          teal: "var(--border-teal)",
        },
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          error: "var(--status-error)",
          info: "var(--status-info)",
        },
      },

      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        crimson: "var(--shadow-crimson)",
        teal: "var(--shadow-teal)",
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },

      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
      },

      transitionDuration: {
        fast: "var(--transition-fast)",
        base: "var(--transition-base)",
        slow: "var(--transition-slow)",
      },

      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        fixed: "var(--z-fixed)",
        modal: "var(--z-modal)",
        popover: "var(--z-popover)",
        tooltip: "var(--z-tooltip)",
      },
    },
  },

  plugins: [],
};
