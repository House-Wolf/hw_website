import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /* ========================================
         COLOR SYSTEM (Mapped to globals.css)
         ======================================== */
      colors: {
        /* Core brand colors */
        crimson: "var(--hw-dark-crimson)",
        "crimson-light": "#FF6B6B",
        "crimson-dark": "var(--accent-primary)",

        steel: "var(--hw-steel-teal)",
        "steel-light": "#60A5FA",
        "steel-dark": "var(--accent-secondary)",

        

        /* Background layers */
        background: {
          base: "var(--background-base)",
          elevated: "var(--background-elevated)",
          card: "var(--background-card)",
          soft: "var(--background-soft)",
        },
        /* Foreground (text) */
        foreground: "var(--text-primary)",
        "foreground-muted": "var(--text-secondary)",
        "foreground-inverse": "var(--text-inverse)",

        /* Accents */
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
      },

      /* ========================================
         BORDER COLORS (shortcut utilities)
         ======================================== */
      borderColor: {
        crimson: "var(--border-crimson)",
        steel: "var(--border-teal)",
        strong: "var(--border-strong)",
      },

      /* ========================================
         SHADOWS (matches globals.css token shadows)
         ======================================== */
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "crimson-glow": "0 0 20px rgba(71,0,0,0.4)",
        "steel-glow": "0 0 20px rgba(17,78,98,0.3)",
      },

      /* ========================================
         GRADIENTS
         ======================================== */
      gradientColorStops: {
        "crimson-dark": "var(--hw-dark-crimson)",
        "crimson-light": "#7A0000",
        "steel-dark": "var(--hw-steel-teal)",
        "steel-light": "#1A6B8A",
      },

      /* ========================================
         SPACING & RADII
         ======================================== */
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },

    

      /* ========================================
         FONTS
         ======================================== */
      fontFamily: {
        sans: "var(--font-inter), sans-serif",
        mono: "var(--font-jetbrains-mono), monospace",
      },
    },
  },

  plugins: [],
};

export default config;
