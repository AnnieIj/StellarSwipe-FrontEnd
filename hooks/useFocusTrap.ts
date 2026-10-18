import { useEffect, useRef } from "react";
import { pushOverlay, popOverlay, isTopOverlay } from "./overlayManager";

interface UseFocusTrapOptions {
  isActive: boolean;
  /** CSS selector for the element to focus when the trap activates */
  initialFocus?: string;
  /**
   * Called when the user presses Escape while this overlay is the topmost one.
   * If not provided, Escape is ignored (caller must handle it via Radix or
   * their own onKeyDown).
   *
   * Part of #764: Escape closes only the topmost dialog.
   */
  onEscape?: () => void;
}

/**
 * Traps keyboard focus inside a container while `isActive` is true.
 *
 * Behaviour (#764):
 * - Registers the container with the global overlay stack on activation.
 * - Moves focus to `initialFocus` (or the first focusable element) on open.
 * - Wraps Tab / Shift+Tab at the boundaries.
 * - Escape fires `onEscape` only when this overlay is the topmost one.
 * - On close, the overlay stack pops this container and focus is returned to
 *   the element that triggered the overlay (tracked by overlayManager).
 * - Background content is automatically marked `inert` while any overlay is
 *   open (managed by overlayManager.pushOverlay / popOverlay).
 */

export function useFocusTrap({ isActive, initialFocus, onEscape }: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Captured when the trap activates, not when it deactivates.
  const previousActiveElement = useRef<Element | null>(null);
  // Store rAF id so it can be cancelled on cleanup
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Register this overlay as active so global handlers can determine the
    // topmost overlay in nested scenarios (overlayManager also handles inert).
    // NOTE: overlayManager.pushOverlay now captures the trigger element
    // automatically, so we no longer need to restore focus manually — pop does it.
    pushOverlay(container);

    // Still capture locally as a fallback for environments where the manager
    // may not be available (unit tests without DOM).
    previousActiveElement.current = document.activeElement;

    const FOCUSABLE_SELECTORS = [
      "button:not([disabled]):not([tabindex='-1'])",
      "input:not([disabled]):not([tabindex='-1'])",
      "select:not([disabled]):not([tabindex='-1'])",
      "textarea:not([disabled]):not([tabindex='-1'])",
      "a[href]:not([tabindex='-1'])",
      "[tabindex]:not([tabindex='-1'])",
      "[role='button']:not([disabled]):not([tabindex='-1'])",
      "[role='switch']:not([disabled]):not([tabindex='-1'])",
    ].join(", ");

    const getFocusableElements = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.closest("[hidden]") && el.offsetParent !== null);

    // Move focus to the designated initial element (or first focusable).
    const focusInitial = () => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;
      const target = initialFocus
        ? container.querySelector<HTMLElement>(initialFocus) ?? elements[0]
        : elements[0];
      target?.focus({ preventScroll: true });
    };

    // Try to focus immediately first — this helps in test environments where
    // rAF may not fire reliably. Then also schedule rAF and a short timeout
    // as fallbacks so real browsers with animations still get a stable timing.
    try {
      focusInitial();
    } catch (err) {
      // swallow — focusing can fail in odd test environments
    }

    rafRef.current = window.requestAnimationFrame(() => focusInitial());
    // Also schedule a short timeout as a fallback for environments where rAF
    // may not run predictably (JS DOM in tests). This makes tests more robust.
    timeoutRef.current = window.setTimeout(() => focusInitial(), 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      // #764: Escape closes only the topmost overlay.
      if (e.key === "Escape") {
        if (isTopOverlay(container) && onEscape) {
          e.preventDefault();
          e.stopPropagation();
          onEscape();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      // Only enforce the focus trap if either:
      // - focus is currently inside this container, or
      // - this overlay is the topmost one. This avoids interfering with
      //   nested overlays where a topmost child should control Tab behavior.
      if (!container.contains(active) && !isTopOverlay(container)) return;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.removeEventListener("keydown", handleKeyDown);

      // popOverlay restores focus to the trigger captured at push time (#764).
      popOverlay(container);

      // Fallback: if overlayManager didn't restore focus (e.g. test env),
      // restore manually from our local capture.
      if (document.activeElement === document.body || document.activeElement === null) {
        const prev = previousActiveElement.current;
        if (prev instanceof HTMLElement && document.contains(prev)) {
          prev.focus({ preventScroll: true });
        }
      }
    };
  }, [isActive, initialFocus, onEscape]);

  return containerRef;
}
