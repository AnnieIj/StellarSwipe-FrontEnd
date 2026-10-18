/**
 * Pure helpers for SignalCard swipe gestures.
 *
 * Kept framework-free so the drag-direction tint overlay (#319) and the
 * keyboard arrow-key alternative (#320) can be unit tested without rendering
 * framer-motion or a DOM.
 */

/** Horizontal drag distance (px) at which a swipe commits to trade/pass. */
export const SWIPE_THRESHOLD = 120;

/** Pointer velocity (px/s) that commits a swipe even below the distance threshold. */
export const VELOCITY_THRESHOLD = 780;

/**
 * Drag distance (px) at which the directional tint overlay reaches full
 * strength. Configurable so the visual ramp can be tuned independently of the
 * commit threshold.
 */
export const TINT_THRESHOLD = 120;

/** Maximum opacity the directional tint overlay ramps up to. */
export const MAX_TINT_OPACITY = 0.45;

export interface TintOpacity {
  /** Opacity of the green (rightward / trade) tint. */
  green: number;
  /** Opacity of the red (leftward / pass) tint. */
  red: number;
}

/**
 * Opacity of the green (trade) and red (pass) tint overlays for a given
 * horizontal drag `offset`.
 *
 * Opacity ramps linearly from 0 at rest to `max` once the card has been dragged
 * `threshold` px in either direction, and is clamped at `max` beyond that.
 * Rightward drags (offset > 0) tint green; leftward drags (offset < 0) tint red.
 */
export function computeTintOpacity(
  offset: number,
  threshold: number = TINT_THRESHOLD,
  max: number = MAX_TINT_OPACITY
): TintOpacity {
  if (threshold <= 0 || offset === 0) return { green: 0, red: 0 };
  const magnitude = Math.min(Math.abs(offset) / threshold, 1) * max;
  return offset > 0
    ? { green: magnitude, red: 0 }
    : { green: 0, red: magnitude };
}

export type SwipeAction = "trade" | "pass" | "none";

/**
 * Keyboard arrow-key equivalent of a swipe on a focused SignalCard (#320):
 * right-arrow → trade (mirrors swipe right), left-arrow → pass (mirrors swipe
 * left). Left-arrow is a no-op when the pass action is hidden. Returns the
 * direction the matching tint feedback should flash toward (+1 trade, -1 pass).
 */
export function classifyArrowKey(
  key: string,
  showPassAction: boolean
): SwipeAction {
  if (key === "ArrowRight") return "trade";
  if (key === "ArrowLeft") return showPassAction ? "pass" : "none";
  return "none";
}

/**
 * Like `classifyArrowKey` but honours the user's swipe-direction preference.
 *
 * When `swapDirections` is `true` the mapping is reversed:
 *   ArrowRight → pass  (mirroring a rightward swipe → pass)
 *   ArrowLeft  → trade (mirroring a leftward swipe → trade)
 *
 * When `swapDirections` is `false` the behaviour is identical to
 * `classifyArrowKey`.
 */
export function classifyArrowKeyWithSettings(
  key: string,
  showPassAction: boolean,
  swapDirections: boolean
): SwipeAction {
  if (!swapDirections) {
    return classifyArrowKey(key, showPassAction);
  }

  // Swapped mapping
  if (key === "ArrowRight") return showPassAction ? "pass" : "none";
  if (key === "ArrowLeft") return "trade";
  return "none";
}
