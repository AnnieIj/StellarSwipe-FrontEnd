"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  BREADCRUMB_ROUTES,
  type BreadcrumbSegment,
} from "@/lib/breadcrumbRoutes";

interface SettingsBreadcrumbProps {
  /** Override segments instead of deriving from the current pathname. */
  segments?: BreadcrumbSegment[];
}

export function SettingsBreadcrumb({
  segments: segmentsProp,
}: SettingsBreadcrumbProps) {
  const pathname = usePathname();
  const segments = segmentsProp ?? BREADCRUMB_ROUTES[pathname];

  if (!segments || segments.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-foreground-muted">
        {segments.map((seg, i) => {
          const isCurrent = i === segments.length - 1;
          return (
            <li key={seg.href} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  size={13}
                  className="shrink-0 text-foreground-muted/50 rtl-flip"
                  aria-hidden="true"
                />
              )}
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="font-medium text-foreground"
                >
                  {seg.label}
                </span>
              ) : (
                <Link
                  href={seg.href}
                  className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                >
                  {seg.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
