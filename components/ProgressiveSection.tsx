"use client";

import { ReactNode, useEffect, useState } from "react";

interface ProgressiveSectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
  className?: string;
}

function DefaultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse space-y-3 ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
    </div>
  );
}

export function ProgressiveSection({
  children,
  fallback,
  delay = 0,
  className,
}: ProgressiveSectionProps) {
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasIdleCallback = "requestIdleCallback" in window;

    let timer: number | undefined;
    let idleId: number | undefined;

    const idleCallback = () => setRendered(true);

    if (hasIdleCallback) {
      idleId = window.requestIdleCallback(idleCallback, { timeout: delay });
    } else {
      timer = window.setTimeout(idleCallback, delay);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [delay]);

  if (rendered) {
    return <>{children}</>;
  }

  return (
    <div className={className}>
      {fallback ?? <DefaultSkeleton className={className} />}
    </div>
  );
}
