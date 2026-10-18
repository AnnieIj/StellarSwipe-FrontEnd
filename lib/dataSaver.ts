/**
 * Data Saver decision helpers (issue #408)
 * ────────────────────────────────────────
 * Pure functions that derive UI behaviour from the Data Saver setting. Keeping
 * the decisions here (rather than inline in components) makes the conditional
 * rendering of charts / animations and the image-quality choice individually
 * unit-testable without rendering a DOM.
 */

/** Image `quality` (1–100) used by Next.js when Data Saver is enabled. */
export const DATA_SAVER_IMAGE_QUALITY = 35;
/** Default image `quality` used when Data Saver is disabled. */
export const DEFAULT_IMAGE_QUALITY = 75;

/**
 * Whether the SignalCard mini sparkline chart should be rendered.
 * Returns `false` in Data Saver mode so the chart is replaced with a static
 * placeholder and no chart-rendering work is done.
 */
export function shouldRenderMiniChart(dataSaverEnabled: boolean): boolean {
  return !dataSaverEnabled;
}

/**
 * Whether non-essential decorative animations should be skipped.
 *
 * Data Saver is applied *in addition to* the OS-level `prefers-reduced-motion`
 * setting: if either is active, decorative animations are disabled.
 */
export function shouldDisableDecorativeAnimation(
  prefersReducedMotion: boolean,
  dataSaverEnabled: boolean
): boolean {
  return prefersReducedMotion || dataSaverEnabled;
}

/**
 * The image `quality` value to pass to Next.js `<Image>`, lowered in Data
 * Saver mode where the image pipeline supports it.
 */
export function getImageQuality(dataSaverEnabled: boolean): number {
  return dataSaverEnabled ? DATA_SAVER_IMAGE_QUALITY : DEFAULT_IMAGE_QUALITY;
}
