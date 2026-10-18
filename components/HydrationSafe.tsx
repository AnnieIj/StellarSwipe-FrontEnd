"use client";

import { type ReactNode } from "react";
import { useHydration } from "@/hooks/useHydration";

interface HydrationSafeProps {
  /** Content to render on the server (and on the client before hydration). */
  fallback?: ReactNode;
  /** Client-only content that should not be rendered during SSR. */
  children: ReactNode;
}

export function HydrationSafe({
  fallback = null,
  children,
}: HydrationSafeProps) {
  const hydrated = useHydration();

  if (!hydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
