/**
 * overlayManager – stack-based overlay registry (#764)
 *
 * Tracks which overlay is topmost so that:
 *  - Escape closes only the topmost dialog, not every open one.
 *  - Background content behind all open overlays is marked `inert` so it
 *    cannot receive focus or be interacted with by assistive technology.
 *  - Each overlay registers the DOM element that triggered it so focus can be
 *    returned to the correct trigger when the overlay closes.
 *
 * Overlays call pushOverlay on mount (open) and popOverlay on unmount (close).
 */

interface OverlayEntry {
  el: HTMLElement;
  /** The element that was focused when this overlay opened — restored on close. */
  triggerEl: HTMLElement | null;
}

const stack: OverlayEntry[] = [];

/**
 * Root selector for the app's main content that should become inert when
 * overlays are open. Adjust if the root element uses a different id/class.
 */
const MAIN_CONTENT_SELECTOR = "#__next, main, [data-main-content]";

function setBackgroundInert(inert: boolean) {
  if (typeof document === "undefined") return;
  const roots = document.querySelectorAll<HTMLElement>(MAIN_CONTENT_SELECTOR);
  roots.forEach((root) => {
    if (inert) {
      root.setAttribute("inert", "");
      root.setAttribute("aria-hidden", "true");
    } else {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
    }
  });
}

export function pushOverlay(el: HTMLElement | null | undefined) {
  if (!el) return;
  // Deduplicate — move to top if already registered.
  const existing = stack.findIndex((e) => e.el === el);
  if (existing !== -1) stack.splice(existing, 1);

  const triggerEl =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  stack.push({ el, triggerEl });

  // Mark background content inert whenever any overlay is open.
  if (stack.length === 1) setBackgroundInert(true);
}

export function popOverlay(el: HTMLElement | null | undefined) {
  if (!el) return;
  const idx = stack.findIndex((e) => e.el === el);
  if (idx === -1) return;

  const entry = stack[idx];
  stack.splice(idx, 1);

  // Restore inert only when the last overlay closes.
  if (stack.length === 0) setBackgroundInert(false);

  // Return focus to the trigger that opened this overlay.
  const trigger = entry.triggerEl;
  if (trigger && document.contains(trigger)) {
    trigger.focus({ preventScroll: true });
  }
}

export function topOverlay(): HTMLElement | null {
  return stack.length ? stack[stack.length - 1].el : null;
}

export function isTopOverlay(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  return topOverlay() === el;
}

/**
 * Close only the topmost overlay by dispatching a synthetic Escape keydown
 * event on its element. Overlay components listening for Escape should respond
 * only when they are the topmost overlay (use isTopOverlay for this check).
 */
export function closeTopOverlay(): void {
  const top = topOverlay();
  if (!top) return;
  top.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
  );
}

/** Returns the number of currently open overlays. */
export function overlayDepth(): number {
  return stack.length;
}
