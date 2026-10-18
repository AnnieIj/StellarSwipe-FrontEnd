export interface BreadcrumbSegment {
  label: string;
  href: string;
}

/**
 * Route metadata for breadcrumb navigation in nested views.
 *
 * #758 — Extended to cover portfolio, report, settings, security, and
 * backtest hierarchies.  Key: exact pathname.  Value: ordered breadcrumb
 * segments from root to current page (inclusive).
 *
 * Convention:
 * - The last segment represents the current page (aria-current="page", not a link).
 * - If a route resolves to only one segment it is considered a top-level page
 *   and SettingsBreadcrumb / RouteBreadcrumb will render nothing.
 */
export const BREADCRUMB_ROUTES: Record<string, BreadcrumbSegment[]> = {
  // ── Security ─────────────────────────────────────────────────────────────
  "/security": [
    { label: "Settings", href: "/settings" },
    { label: "Security", href: "/security" },
  ],
  "/security/active-sessions": [
    { label: "Settings", href: "/settings" },
    { label: "Security", href: "/security" },
    { label: "Active Sessions", href: "/security/active-sessions" },
  ],
  "/security/data-export": [
    { label: "Settings", href: "/settings" },
    { label: "Security", href: "/security" },
    { label: "Data Export", href: "/security/data-export" },
  ],

  // ── Settings ──────────────────────────────────────────────────────────────
  "/settings/notifications": [
    { label: "Settings", href: "/settings" },
    { label: "Notifications", href: "/settings/notifications" },
  ],
  "/settings/webhooks": [
    { label: "Settings", href: "/settings" },
    { label: "Webhooks", href: "/settings/webhooks" },
  ],
  "/settings/profile": [
    { label: "Settings", href: "/settings" },
    { label: "Profile", href: "/settings/profile" },
  ],
  "/settings/billing": [
    { label: "Settings", href: "/settings" },
    { label: "Billing", href: "/settings/billing" },
  ],
  "/settings/subscription": [
    { label: "Settings", href: "/settings" },
    { label: "Subscription", href: "/settings/subscription" },
  ],
  "/api-keys": [
    { label: "Settings", href: "/settings" },
    { label: "API Keys", href: "/api-keys" },
  ],
  "/preferences": [
    { label: "Settings", href: "/settings" },
    { label: "Preferences", href: "/preferences" },
  ],

  // ── Portfolio / Performance ───────────────────────────────────────────────
  "/performance": [
    { label: "Dashboard", href: "/app" },
    { label: "Performance", href: "/performance" },
  ],
  "/analytics": [
    { label: "Dashboard", href: "/app" },
    { label: "Analytics", href: "/analytics" },
  ],
  "/compare": [
    { label: "Dashboard", href: "/app" },
    { label: "Compare", href: "/compare" },
  ],

  // ── Reports ───────────────────────────────────────────────────────────────
  "/tax-report": [
    { label: "Reports", href: "/reports" },
    { label: "Tax Report", href: "/tax-report" },
  ],

  // ── Backtest ──────────────────────────────────────────────────────────────
  "/backtest-sim": [
    { label: "Tools", href: "/tools" },
    { label: "Backtest Simulator", href: "/backtest-sim" },
  ],
  "/backtest-sim/history": [
    { label: "Tools", href: "/tools" },
    { label: "Backtest Simulator", href: "/backtest-sim" },
    { label: "Run History", href: "/backtest-sim/history" },
  ],

  // ── Journal ───────────────────────────────────────────────────────────────
  "/journal": [
    { label: "Dashboard", href: "/app" },
    { label: "Journal", href: "/journal" },
  ],

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  "/bookmarks": [
    { label: "Dashboard", href: "/app" },
    { label: "Bookmarks", href: "/bookmarks" },
  ],

  // ── Leaderboard ───────────────────────────────────────────────────────────
  "/leaderboard": [
    { label: "Dashboard", href: "/app" },
    { label: "Leaderboard", href: "/leaderboard" },
  ],

  // ── Referral ─────────────────────────────────────────────────────────────
  "/referral": [
    { label: "Dashboard", href: "/app" },
    { label: "Referral", href: "/referral" },
  ],
};
