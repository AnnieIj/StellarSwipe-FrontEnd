"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "scroll-positions";

function getPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function savePosition(pathname: string, y: number) {
  const positions = getPositions();
  positions[pathname] = y;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export function useScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    // Restore saved position for this route
    const saved = getPositions()[pathname];
    if (saved !== undefined) {
      // Defer to let the page paint before scrolling
      requestAnimationFrame(() =>
        window.scrollTo({ top: saved, behavior: "instant" })
      );
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    // Save position on route change / unmount
    return () => {
      savePosition(pathname, window.scrollY);
    };
  }, [pathname]);
}
