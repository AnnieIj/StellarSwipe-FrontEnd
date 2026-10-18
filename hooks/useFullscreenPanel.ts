"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages expand/collapse state for an in-page full-screen panel (an
 * overlay, not the browser Fullscreen API). Escape closes it and focus
 * returns to the trigger that opened it.
 */
export function useFullscreenPanel() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const exit = useCallback(() => {
    setIsFullscreen(false);
    triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => setIsFullscreen((v) => !v), []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, exit]);

  return { isFullscreen, toggle, exit, triggerRef };
}
