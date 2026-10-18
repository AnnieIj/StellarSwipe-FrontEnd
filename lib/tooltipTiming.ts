/**
 * tooltipTiming – shared timing constants for all tooltips (#765)
 *
 * Centralising these values ensures every tooltip across the app has
 * consistent show / hide / interaction timing, making the UX predictable
 * for both pointer and keyboard users.
 */

/** Delay (ms) before a tooltip appears after the trigger is hovered or focused. */
export const TOOLTIP_SHOW_DELAY_MS = 600;

/**
 * Delay (ms) before a tooltip disappears after the pointer leaves the trigger
 * or the trigger loses focus.
 *
 * A non-zero value lets the user move the pointer onto the tooltip itself
 * (for tooltips that contain interactive content) before it closes.
 */
export const TOOLTIP_HIDE_DELAY_MS = 200;

/**
 * Delay (ms) before the tooltip shows when using keyboard focus (Tab navigation).
 * Slightly shorter than the hover delay to feel snappier for keyboard-only users.
 */
export const TOOLTIP_FOCUS_SHOW_DELAY_MS = 300;

/**
 * Maximum time (ms) a tooltip stays visible on a touch device before it is
 * automatically dismissed. Prevents the "stuck tooltip" issue on mobile.
 */
export const TOOLTIP_TOUCH_DISMISS_MS = 3000;
