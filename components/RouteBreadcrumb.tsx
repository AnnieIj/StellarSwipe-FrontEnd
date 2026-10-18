"use client";

/**
 * #758 – Route-aware breadcrumbs for nested views
 *
 * A fully accessible breadcrumb component that:
 * - Derives segments from the current pathname via BREADCRUMB_ROUTES.
 * - Marks the current (last) segment semantically with aria-current="page"
 *   and renders it as plain text, not a link (no unnecessary navigation).
 * - Collapses intermediate segments on narrow screens (< sm) into an ellipsis
 *   button that expands on tap/click, preserving the first and last segments
 *   so users always have context.
 * - Parent links preserve query params would require router state; instead
 *   they use plain hrefs that go to the canonical parent route.
 * - Can receive explicit `segments` prop to override pathname-derived ones.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BREADCRUMB_ROUTES, type BreadcrumbSegment } from "@/lib/breadcrumbRoutes";

interface RouteBreadcrumbProps {
  /** Override pathname-derived segments. */
  segments?: BreadcrumbSegment[];
  className?: string;
}

/**
 * Resolve breadcrumb segments for a given pathname.
 * Supports dynamic segments: walks up the path until a match is found.
 */
function resolveSegments(pathname: string): BreadcrumbSegment[] | undefined {
  if (BREADCRUMB_ROUTES[pathname]) return BREADCRUMB_ROUTES[pathname];

  // Try progressively shorter paths (handles /backtest-sim/history/[runId] etc.)
  const parts = pathname.split("/").filter(Boolean);
  for (let len = parts.length - 1; len >= 1; len--) {
    const candidate = "/" + parts.slice(0, len).join("/");
    if (BREADCRUMB_ROUTES[candidate]) {
      // Append the current dynamic segment as a non-linked leaf
      const parent = BREADCRUMB_ROUTES[candidate];
      return [
        ...parent.slice(0, -1),
        parent[parent.length - 1],
        { label: parts[len] ?? "Detail", href: pathname },
      ];
    }
  }
  return undefined;
}

export function RouteBreadcrumb({ segments: segmentsProp, className }: RouteBreadcrumbProps) {
  const pathname = usePathname();
  const segments = segmentsProp ?? resolveSegments(pathname ?? "");

  // Don't render if there's nothing to show or it's a top-level page
  if (!segments || segments.length < 2) return null;

  return <BreadcrumbInner segments={segments} className={className} />;
}

function BreadcrumbInner({
  segments,
  className,
}: {
  segments: BreadcrumbSegment[];
  className?: string;
}) {
  // On narrow screens, collapse middle segments (keep first + last)
  const [expanded, setExpanded] = useState(false);

  const needsCollapse = segments.length > 2;
  // On small screens: show first, ellipsis, last unless expanded
  // middle = everything between first and last
  const first = segments[0];
  const last = segments[segments.length - 1];
  const middle = segments.slice(1, -1);

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-foreground-muted">
        {/* First segment — always a link */}
        <li className="flex items-center gap-1">
          <Link
            href={first.href}
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
          >
            {first.label}
          </Link>
        </li>

        {/* Middle segments */}
        {middle.length > 0 && (
          <>
            {/* Narrow: show collapse toggle unless expanded */}
            {needsCollapse && !expanded && (
              <li className="flex items-center gap-1 sm:hidden">
                <ChevronRight
                  size={13}
                  className="shrink-0 text-foreground-muted/50 rtl-flip"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label={`Show ${middle.length} hidden breadcrumb segment${middle.length !== 1 ? "s" : ""}`}
                  title="Show full path"
                  className="rounded px-1 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <MoreHorizontal size={14} aria-hidden="true" />
                </button>
              </li>
            )}

            {/* Middle segments: always on ≥sm, only when expanded on <sm */}
            {middle.map((seg) => (
              <li
                key={seg.href}
                className={cn(
                  "flex items-center gap-1",
                  needsCollapse && !expanded ? "hidden sm:flex" : "flex"
                )}
              >
                <ChevronRight
                  size={13}
                  className="shrink-0 text-foreground-muted/50 rtl-flip"
                  aria-hidden="true"
                />
                <Link
                  href={seg.href}
                  className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                >
                  {seg.label}
                </Link>
              </li>
            ))}
          </>
        )}

        {/* Last segment — current page, not a link */}
        <li className="flex items-center gap-1">
          <ChevronRight
            size={13}
            className="shrink-0 text-foreground-muted/50 rtl-flip"
            aria-hidden="true"
          />
          <span aria-current="page" className="font-medium text-foreground">
            {last.label}
          </span>
        </li>
      </ol>
    </nav>
  );
}
