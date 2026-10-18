"use client";

/**
 * #757 – Collapsible desktop navigation rail
 *
 * A vertical sidebar that replaces (or supplements) the top navbar's link
 * list on desktop.  Key behaviours:
 *
 * - Collapse / expand via a toggle button; preference persists across sessions.
 * - Collapsed mode shows icon-only items with accessible Tooltip labels so
 *   keyboard and pointer users still know what each icon does.
 * - The main content area is informed via the `data-rail-collapsed` attribute
 *   on <body> so sibling layouts can adjust their left-padding via CSS.
 * - Mobile navigation (< md breakpoint) is entirely unaffected; this component
 *   is hidden with `hidden md:flex`.
 * - Horizontal scrolling and focus are never clipped by the rail expansion.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  Bookmark,
  BarChart2,
  GitCompare,
  Users,
  Calculator,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavRailStore } from "@/store/useNavRailStore";

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  tourId?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: <Home size={18} aria-hidden="true" /> },
  {
    href: "/app",
    label: "Signals",
    icon: <Zap size={18} aria-hidden="true" />,
    tourId: "signals",
  },
  {
    href: "/journal",
    label: "Journal",
    icon: <FileText size={18} aria-hidden="true" />,
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: <Bookmark size={18} aria-hidden="true" />,
  },
  {
    href: "/compare",
    label: "Compare",
    icon: <GitCompare size={18} aria-hidden="true" />,
    tourId: "compare",
  },
  {
    href: "/providers",
    label: "Providers",
    icon: <Users size={18} aria-hidden="true" />,
  },
  {
    href: "/tax-report",
    label: "Tax Report",
    icon: <Calculator size={18} aria-hidden="true" />,
  },
  {
    href: "/preferences",
    label: "Preferences",
    icon: <Settings size={18} aria-hidden="true" />,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: <BarChart2 size={18} aria-hidden="true" />,
  },
];

// ─── Tooltip ─────────────────────────────────────────────────────────────────

/**
 * Lightweight tooltip shown to the right of the icon when the rail is
 * collapsed.  Uses aria-label on the parent link for screen readers rather
 * than a role="tooltip" element, which keeps it simple and accessible.
 */
function RailTooltip({
  label,
  visible,
}: {
  label: string;
  visible: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-foreground shadow-md",
        "transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {label}
    </span>
  );
}

// ─── NavRailItem ─────────────────────────────────────────────────────────────

function NavRailItem({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <li className="relative">
      <Link
        href={item.href}
        data-tour={item.tourId}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        onMouseEnter={() => collapsed && setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => collapsed && setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isActive
            ? "bg-surface-high/60 font-medium text-foreground"
            : "text-foreground-muted hover:bg-surface-high/40 hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <span className="shrink-0">{item.icon}</span>
        {!collapsed && (
          <span className="truncate">{item.label}</span>
        )}
        {/* Active indicator dot */}
        {isActive && collapsed && (
          <span
            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-400"
            aria-hidden="true"
          />
        )}
        {/* Tooltip — only shown in collapsed mode */}
        {collapsed && (
          <RailTooltip label={item.label} visible={tooltipVisible} />
        )}
      </Link>
    </li>
  );
}

// ─── DesktopNavRail ───────────────────────────────────────────────────────────

export function DesktopNavRail() {
  const pathname = usePathname();
  const collapsed = useNavRailStore((s) => s.collapsed);
  const toggle = useNavRailStore((s) => s.toggle);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render server default (expanded) until client.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Inform sibling layout elements about the collapsed state via a data
  // attribute on <html>.  CSS can then adjust padding/margin.
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute(
      "data-nav-collapsed",
      collapsed ? "true" : "false"
    );
  }, [collapsed, mounted]);

  const effectiveCollapsed = mounted ? collapsed : false;

  return (
    <aside
      aria-label="Desktop navigation rail"
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r border-border bg-background/80 backdrop-blur-md",
        "sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden",
        "transition-[width] duration-200 ease-in-out",
        effectiveCollapsed ? "w-14" : "w-56"
      )}
    >
      <nav className="flex flex-1 flex-col px-2 py-3">
        <ul role="list" className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
            return (
              <NavRailItem
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={effectiveCollapsed}
              />
            );
          })}
        </ul>
      </nav>

      {/* Collapse / expand toggle */}
      <div
        className={cn(
          "border-t border-border p-2",
          effectiveCollapsed && "flex justify-center"
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={effectiveCollapsed ? "Expand navigation rail" : "Collapse navigation rail"}
          title={effectiveCollapsed ? "Expand" : "Collapse"}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground-muted",
            "transition-colors hover:bg-surface-high/40 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            effectiveCollapsed && "justify-center px-2"
          )}
        >
          {effectiveCollapsed ? (
            <ChevronRight size={15} aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft size={15} aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
