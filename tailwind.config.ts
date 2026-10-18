import type { Config } from "tailwindcss";

/**
 * StellarSwipe design-token registry.
 * All colors, spacing extensions, and font-size overrides live here.
 * Components MUST reference these tokens instead of hardcoded values.
 * See CONTRIBUTING.md for the full convention.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./stories/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ───────────────────────────────────────────────
        background:    "hsl(var(--background) / <alpha-value>)",
        surface:       "hsl(var(--surface) / <alpha-value>)",
        "surface-high":"hsl(var(--surface-high) / <alpha-value>)",
        overlay:       "hsl(var(--overlay) / <alpha-value>)",

        // ── Text ───────────────────────────────────────────────────
        foreground:           "hsl(var(--foreground) / <alpha-value>)",
        "foreground-muted":   "hsl(var(--foreground-muted) / <alpha-value>)",
        "foreground-subtle":  "hsl(var(--foreground-subtle) / <alpha-value>)",

        // ── Borders & inputs ───────────────────────────────────────
        border:         "hsl(var(--border) / <alpha-value>)",
        "border-strong":"hsl(var(--border-strong) / <alpha-value>)",
        input:          "hsl(var(--input) / <alpha-value>)",
        ring:           "hsl(var(--ring) / <alpha-value>)",

        // ── Semantic accents ───────────────────────────────────────
        "accent-primary": "hsl(var(--accent-primary) / <alpha-value>)",
        "accent-sky":     "hsl(var(--accent-sky) / <alpha-value>)",
        "accent-success": "hsl(var(--accent-success) / <alpha-value>)",
        "accent-danger":  "hsl(var(--accent-danger) / <alpha-value>)",
        "accent-warning": "hsl(var(--accent-warning) / <alpha-value>)",
        "accent-market":  "hsl(var(--accent-market) / <alpha-value>)",

        // ── shadcn/ui compat aliases ───────────────────────────────
        card:        "hsl(var(--card) / <alpha-value>)",
        popover:     "hsl(var(--popover) / <alpha-value>)",
        primary:     "hsl(var(--primary) / <alpha-value>)",
        secondary:   "hsl(var(--secondary) / <alpha-value>)",
        muted:       "hsl(var(--muted) / <alpha-value>)",
        accent:      "hsl(var(--accent) / <alpha-value>)",
        destructive: "hsl(var(--destructive) / <alpha-value>)",
      },

      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "calc(var(--radius) - 0.25rem)",
        lg: "calc(var(--radius) + 0.25rem)",
        xl: "calc(var(--radius) + 0.5rem)",
        "2xl": "calc(var(--radius) + 1rem)",
      },

      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky:   "var(--z-sticky)",
        overlay:  "var(--z-overlay)",
        modal:    "var(--z-modal)",
        toast:    "var(--z-toast)",
        loading:  "var(--z-loading)",
      },

      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
