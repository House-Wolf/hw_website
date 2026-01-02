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
      /* ========================================
         COLOR SYSTEM (Mapped to globals.css)
         ======================================== */
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
          main: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
        },

        /* Borders */
        border: {
          soft: "var(--border-subtle)",
          base: "var(--border-default)",
          strong: "var(--border-strong)",
          crimson: "var(--border-crimson)",
          steel: "var(--border-teal)",
        },

        /* Status colors */
        success: {
          DEFAULT: "var(--status-success)",
          text: "var(--status-success-text)",
        },
        warning: {
          DEFAULT: "var(--status-warning)",
          text: "var(--status-warning-text)",
        },
        error: {
          DEFAULT: "var(--status-error)",
          text: "var(--status-error-text)",
        },
        info: {
          DEFAULT: "var(--status-info)",
          text: "var(--status-info-text)",
        },
        keyframes: {
          "tracking-tighten": {
            "0%": { letterSpacing: "0.35em", opacity: "0.6" },
            "50%": { letterSpacing: "0.15em", opacity: "1" },
            "100%": { letterSpacing: "0.35em", opacity: "0.6" },
          },
        },
        animation: {
          "tracking-tighten": "tracking-tighten 2.5s ease-in-out infinite",
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
        "crimson-glow": "0 0 20px rgba(71,0,0,0.4)",
        "steel-glow": "0 0 20px rgba(17,78,98,0.3)",
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
