/**
 * Centralized design tokens for StellarSwipe.
 *
 * All values are Tailwind-compatible and map to the CSS custom properties
 * defined in `app/globals.css`. Import directly in components or use as
 * reference when building new features.
 */

/* ── Spacing scale (rem) ──────────────────────────────────────────────── */
export const spacing = {
  0: "0",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  9: "2.25rem",
  10: "2.5rem",
  11: "2.75rem",
  12: "3rem",
} as const;

/* ── Typography ───────────────────────────────────────────────────────── */
export const fontSize = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
} as const;

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeight = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
} as const;

export const typography = {
  fontSize,
  fontWeight,
  lineHeight,
} as const;

/* ── Color tokens ─────────────────────────────────────────────────────── */
export const colors = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  "foreground-muted": "var(--foreground-muted)",
  "foreground-subtle": "var(--foreground-subtle)",

  surface: "var(--surface)",
  "surface-high": "var(--surface-high)",

  border: "var(--border)",
  "border-strong": "var(--border-strong)",

  input: "var(--input)",
  ring: "var(--ring)",

  accent: {
    primary: "var(--accent-primary)",
    sky: "var(--accent-sky)",
    success: "var(--accent-success)",
    danger: "var(--accent-danger)",
    warning: "var(--accent-warning)",
    market: "var(--accent-market)",
  },

  overlay: "var(--overlay)",
} as const;

/* ── Component tokens ─────────────────────────────────────────────────── */
export const borderRadius = {
  none: "0",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const;

export const boxShadow = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

export const components = {
  borderRadius,
  boxShadow,
} as const;

/* ── Combined export ──────────────────────────────────────────────────── */
export const designTokens = {
  spacing,
  typography,
  colors,
  components,
} as const;

export type DesignTokens = typeof designTokens;
