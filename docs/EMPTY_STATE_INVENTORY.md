# Empty, Loading & Error State Inventory

This inventory captures empty states audited across the app, including current copy and migration status to the shared `EmptyState` component. It also tracks the shared loading and error state components (`components/ui/loading-state.tsx`, `components/ui/error-state.tsx`).

| Location                                          | Current Empty Copy                                                                                | Status                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `components/SignalEmptyState.tsx`                 | "No signals available right now" / "No signals match your filters"                                | Migrated to shared `EmptyState` wrapper |
| `components/bookmarks/BookmarksPage.tsx`          | "No bookmarks yet"                                                                                | Migrated to shared `EmptyState`         |
| `components/NotificationBell.tsx`                 | "No notifications"                                                                                | Migrated to shared `EmptyState`         |
| `components/chart/PortfolioAllocationChart.tsx`   | "No portfolio data available"                                                                     | Migrated to shared `EmptyState`         |
| `components/comparison/AddSignalPanel.tsx`        | "No signals available."                                                                           | Migrated to shared `EmptyState`         |
| `components/CommandPalette.tsx`                   | `No results for "{query}"`                                                                        | Migrated to shared `EmptyState`         |
| `components/TaxReportingTool.tsx`                 | "No taxable trades found for {year}."                                                             | Migrated to shared `EmptyState`         |
| `components/TransactionActivityFeed.tsx`          | "No activity matches the current filters."                                                        | Migrated to shared `EmptyState`         |
| `components/performance/PerformanceDashboard.tsx` | "No interactions recorded yet" / "No route data yet" / "No API data yet" / "No crashes recorded." | Migrated to shared `EmptyState`         |
| `components/WebhookSettings.tsx`                  | "No webhooks configured."                                                                         | Migrated to shared `EmptyState`         |
| `components/AnalyticsDebugConsole.tsx`            | "No matching events" / "No events yet"                                                            | Migrated to shared `EmptyState`         |
| `app/leaderboard/page.tsx`                        | "No providers available"                                                                           | Migrated to shared `EmptyState`         |
| `app/compare/page.tsx`                            | "No signals selected"                                                                               | Migrated to shared `EmptyState`         |

## Loading & error states

- `app/leaderboard/page.tsx` uses `LoadingState` (spinner) while fetching and `ErrorState` (with a retry button wired to `refetch`) on failure.
- `components/bookmarks/BookmarksPage.tsx` uses a local `BookmarksSkeleton` for the pre-hydration loading state.
- `components/signal/SignalFeed.tsx` uses `SignalErrorState`, which is network/timeout-aware — reach for it only when the error carries that typed signal-fetch context; use the generic `ErrorState` everywhere else.

New pages/sections should default to `LoadingState`/`SkeletonRows` (`components/ui/loading-state.tsx`) and `ErrorState` (`components/ui/error-state.tsx`) so copy, spacing, and retry affordances stay consistent with the `EmptyState` pattern above.

## Copy & CTA conventions

- Use sentence case titles and descriptions.
- Prefer action-first CTA labels like "Refresh", "Retry", "Clear filters", "Browse feed".
- Keep descriptive copy to one concise sentence.
- Use consistent action verbs for similar states (Refresh/Retry for stale or failed loads, Browse/Add/Connect for no-data states).
