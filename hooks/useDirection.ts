"use client";

import { useEffect, useState } from "react";

/**
 * useDirection
 * ────────────
 * Reads the current text direction from the `<html dir="…">` attribute and
 * reacts to live changes (e.g. when the user switches to an RTL locale via
 * `useI18n().setLocale`).
 *
 * Returns `"rtl"` when the document direction is RTL, `"ltr"` otherwise.
 * Also exposes an `isRTL` boolean for convenience.
 *
 * The source of truth is the DOM attribute rather than a separate store so
 * that components remain decoupled from the i18n library and the direction
 * stays in sync regardless of where/how it is changed.
 *
 * @example
 * const { isRTL } = useDirection();
 * // Use `isRTL` to conditionally mirror directional icons or override classes.
 */
export function useDirection(): { dir: "ltr" | "rtl"; isRTL: boolean } {
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  useEffect(() => {
    // Read initial value from DOM
    const readDir = (): "ltr" | "rtl" =>
      document.documentElement.dir === "rtl" ? "rtl" : "ltr";

    setDir(readDir());

    // Observe future attribute changes (set by useI18n when locale changes)
    const observer = new MutationObserver(() => {
      setDir(readDir());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });

    return () => observer.disconnect();
  }, []);

  return { dir, isRTL: dir === "rtl" };
}
