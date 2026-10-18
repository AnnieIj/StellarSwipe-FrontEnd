import { useEffect, RefObject } from "react";
import { pushOverlay, popOverlay, isTopOverlay } from "./overlayManager";

/**
 * Hook to register an overlay element with the global overlay stack while
 * `isActive` is true. Provides a small convenience wrapper over overlayManager
 * so components can call this hook instead of manipulating the stack manually.
 */
export function useOverlayStack(elRef: RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    const el = elRef.current;
    if (!isActive || !el) return;
    pushOverlay(el);
    return () => popOverlay(el);
    // We intentionally only watch isActive and the element identity — callers
    // should ensure the ref is stable for the lifetime of the overlay.
  }, [isActive, elRef]);

  return {
    isTop: () => isTopOverlay(elRef.current),
  };
}
