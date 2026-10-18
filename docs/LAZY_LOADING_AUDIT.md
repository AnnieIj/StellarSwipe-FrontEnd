# Lazy-Loading Audit — Reducing Initial Payload

An audit of static (non-code-split) imports across the app, focused on
finding modules that are large, optional for first paint, or shipped to
every user regardless of whether they're ever used.

## Method

Most routes already use `next/dynamic` correctly (`app/compare/page.tsx`,
`app/analytics/page.tsx`, `app/tax-report/page.tsx`, `app/backtest-sim/page.tsx`
all defer their heavy charts/tools). The audit looked for the remaining gaps:
components imported statically inside files that are themselves on the
critical path for every user (the root layout, and the primary `/app` feed
shell).

## What was found and fixed

- **Root layout dev overlays** (`app/layout.tsx`): `DevPerfOverlay` (~680
  lines) and `AnalyticsDebugConsole` (~270 lines) are rendered on every
  single page via `RootLayout`, and both early-return `null` when
  `NODE_ENV === "production"` — but that check runs *inside* the component,
  after the module has already been imported and bundled. Every real user
  was downloading ~950 lines of dev-only tooling they'd never see. Converted
  both to `next/dynamic(..., { ssr: false })` so they load as a separate
  chunk instead of inflating the shared root layout bundle.

- **Main `/app` feed shell** (`components/AppShell.tsx`): this component
  wraps the highest-traffic route and statically imported `TradeModal`,
  `WalletSelectionModal`, `OnboardingFlow`, and `DashboardWidgets` — a modal
  that only opens on click, a wallet-connect modal, an onboarding flow shown
  only to disconnected users, and a widget panel that itself renders four
  chart components (`PnLWidget`, `PortfolioAllocationChart`,
  `PortfolioPerformanceBenchmarkChart`, `PortfolioSummaryCards`, per
  `components/DashboardWidgets.tsx`). None of these are needed for the first
  paint of the signal feed. All four are now `next/dynamic` with `ssr: false`
  and lightweight skeleton fallbacks for the panel-shaped ones.

- Also removed two dead imports (`PortfolioAllocationChart`, `PnLWidget`)
  from `AppShell.tsx` that were never referenced in its JSX — leftover from
  before `DashboardWidgets` took over rendering them — so there's nothing
  confusing left importing the same chart twice under different names.

## What was left alone

- `ComparisonTray` (root layout): small (~100 lines), needs to react
  instantly to global comparison-store state on every page — lazy-loading
  it risks visible layout shift for a negligible payload saving.
- `PortfolioSummaryCards` import in `AppShell.tsx`: also unused directly in
  that file, but out of scope here — it's dead code, not a lazy-loading
  target, and removing it isn't part of this pass.

## Verification

No build was run as part of this change (per task scope). The changes are
mechanical — replacing a named static import with the equivalent
`next/dynamic` call and a loading fallback — and don't change any component's
props or behavior. Recommended follow-up: run `next build` and compare the
`/app` and root layout bundle sizes before/after, e.g. via
`ANALYZE=true next build` if `@next/bundle-analyzer` is configured.
