import { useCallback, useEffect, useState, type RefObject } from "react";

/** Below this many px of overlap we treat the keyboard as closed (URL bar jitter). */
const KEYBOARD_THRESHOLD_PX = 80;

export interface KeyboardInset {
  /** Pixels of the layout viewport currently covered by the on-screen keyboard. */
  inset: number;
  isOpen: boolean;
}

/**
 * Tracks how much of the layout viewport the on-screen keyboard covers, using
 * the VisualViewport API (iOS Safari, Chrome/Firefox on Android).
 *
 * - Updates are batched to one per animation frame so fixed action bars move
 *   smoothly with the keyboard instead of jumping on every resize event.
 * - Orientation changes re-measure after the viewport settles.
 * - Browsers without VisualViewport report `{ inset: 0, isOpen: false }`, so
 *   callers fall back to their normal layout.
 */
export function useKeyboardInset(): KeyboardInset {
  const [state, setState] = useState<KeyboardInset>({ inset: 0, isOpen: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const covered = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      const isOpen = covered > KEYBOARD_THRESHOLD_PX;
      const inset = isOpen ? covered : 0;
      setState((prev) =>
        prev.inset === inset && prev.isOpen === isOpen ? prev : { inset, isOpen }
      );
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(measure);
    };

    // Orientation changes fire before the viewport has its final size.
    const handleOrientation = () => window.setTimeout(schedule, 250);

    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("orientationchange", handleOrientation);
    measure();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, []);

  return state;
}

function ensureFieldVisible(
  container: HTMLElement,
  target: Element | null,
  actionBarHeight: number
) {
  if (!(target instanceof HTMLElement) || !container.contains(target)) return;
  if (!target.matches("input, select, textarea, [contenteditable='true']")) return;
  const vv = window.visualViewport;
  const viewportTop = vv ? vv.offsetTop : 0;
  const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const visibleBottom = viewportBottom - actionBarHeight - 12;
  const rect = target.getBoundingClientRect();
  if (rect.bottom > visibleBottom) {
    window.scrollBy({ top: rect.bottom - visibleBottom, behavior: "smooth" });
  } else if (rect.top < viewportTop) {
    window.scrollBy({ top: rect.top - viewportTop - 12, behavior: "smooth" });
  }
}

/**
 * Keeps the focused field inside `container` visible above both the keyboard
 * and a fixed bottom action bar of `actionBarHeight` px. Only scrolls when the
 * field is actually obscured, so the page doesn't jump on every focus.
 */
export function useKeepFocusedFieldVisible(
  container: RefObject<HTMLElement | null>,
  { inset, actionBarHeight }: { inset: number; actionBarHeight: number }
) {
  useEffect(() => {
    const el = container.current;
    if (!el || typeof window === "undefined") return;

    let timer: number | null = null;
    const handleFocusIn = (e: FocusEvent) => {
      // Wait for the keyboard animation before measuring.
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(
        () => ensureFieldVisible(el, e.target as Element, actionBarHeight),
        300
      );
    };

    el.addEventListener("focusin", handleFocusIn);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      el.removeEventListener("focusin", handleFocusIn);
    };
  }, [container, actionBarHeight]);

  // Re-check the active field when the keyboard opens or resizes (including
  // after an orientation change).
  useEffect(() => {
    const el = container.current;
    if (!el || !inset || typeof document === "undefined") return;
    ensureFieldVisible(el, document.activeElement, actionBarHeight);
  }, [container, inset, actionBarHeight]);

  /**
   * Call after content above the field changes height (e.g. a validation
   * message appears) so the active control is pulled back into view.
   */
  return useCallback(() => {
    const el = container.current;
    if (!el || typeof document === "undefined") return;
    window.requestAnimationFrame(() =>
      ensureFieldVisible(el, document.activeElement, actionBarHeight)
    );
  }, [container, actionBarHeight]);
}
