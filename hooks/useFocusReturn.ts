"use client";

import { useEffect, useRef } from "react";
import { pushOverlay, popOverlay } from "./overlayManager";

/**
 * useFocusReturn (#764)
 * ──────────────
 * Captures the element that was focused when `isOpen` transitions to `true`,
 * and restores focus to it when `isOpen` transitions back to `false`.
 *
 * Also registers/unregisters the overlay element with the global overlay stack
 * so that background content is marked `inert` while the overlay is open.
 *
 * Use this hook for any overlay (modal, drawer, bottom-sheet, popover) that
 * does not already rely on `useFocusTrap`.  Components that already use
 * `useFocusTrap` get focus-restore for free — this hook is the lightweight
 * alternative for cases where a full trap is not required.
 *
 * Behaviour
 * ─────────
 * - On open: captures `document.activeElement` and registers `overlayEl` with
 *   the global overlay stack (background becomes inert).
 * - On close: unregisters and restores focus to the captured element.
 * - Falls back to `document.body` if the captured element is no longer in
 *   the DOM (e.g. the trigger button was conditionally removed).
 * - Handles nested overlays correctly: each overlay independently captures
 *   its own origin element, so closing an inner overlay returns focus to the
 *   inner trigger, not the outermost trigger.
 *
 * @param isOpen     Whether the overlay is currently open.
 * @param overlayEl  Optional ref to the overlay's root DOM element. When
 *                   provided the overlay is registered in the global stack so
 *                   the background becomes inert and Escape handling is scoped
 *                   to the topmost overlay. If omitted, the hook still manages
 *                   focus but skips the inert/stack machinery.
 *
 * @example
 * function MyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusReturn(open, ref);
 *   return <div ref={ref}>…</div>;
 * }
 */
export function useFocusReturn(
  isOpen: boolean,
  overlayEl?: React.RefObject<HTMLElement | null>
): void {
  const returnTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Capture the currently-focused element the moment the overlay opens.
      if (document.activeElement instanceof HTMLElement) {
        returnTargetRef.current = document.activeElement;
      }
      // Register with the global stack so background becomes inert (#764).
      const el = overlayEl?.current;
      if (el) pushOverlay(el);
    } else {
      // Unregister from the global stack (restores inert if last overlay).
      const el = overlayEl?.current;
      if (el) {
        // popOverlay now restores focus; only fall back manually if needed.
        popOverlay(el);
      }

      // Fallback focus restore for overlays not using overlayEl.
      if (!overlayEl) {
        const target = returnTargetRef.current;
        if (target && document.contains(target)) {
          target.focus({ preventScroll: true });
        } else {
          document.body.focus();
        }
      }
      returnTargetRef.current = null;
    }
  }, [isOpen, overlayEl]);
}
