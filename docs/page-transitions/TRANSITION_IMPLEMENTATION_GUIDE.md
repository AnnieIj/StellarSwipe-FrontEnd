/\*\*

- Page Transition System - Implementation Guide
- ────────────────────────────────────────────
-
- This guide shows how to implement the PageTransitionPlaceholder system
- in your page components.
-
- The system automatically:
- ✓ Detects route changes
- ✓ Shows responsive skeleton placeholders
- ✓ Smoothly animates transitions
- ✓ Dismisses when page content renders
-
- What you need to do:
- - Add usePageTransitionComplete() to your page components
- - That's it! The placeholder handles the rest
    \*/

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Signal Feed Page (Default Variant - "feed")
// ═══════════════════════════════════════════════════════════════════════════

/\*
import { usePageTransitionComplete } from "@/hooks/usePageTransitionComplete";
import { SignalFeed } from "@/components/SignalFeed";

export default function SignalFeedPage() {
// Call this at the top of your page component
usePageTransitionComplete();

return (

<div className="container mx-auto py-8">
<h1 className="text-3xl font-bold mb-6">Signal Feed</h1>
<SignalFeed />
</div>
);
}
\*/

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Provider Detail Page (Detail Variant)
// ═══════════════════════════════════════════════════════════════════════════

/\*
import { usePageTransitionComplete } from "@/hooks/usePageTransitionComplete";
import { useParams } from "next/navigation";
import { ProviderProfile } from "@/components/ProviderProfile";

export default function ProviderDetailPage() {
// Auto-detects "detail" variant based on /provider/[id] route
usePageTransitionComplete();
const { providerId } = useParams();

return (

<div className="container mx-auto py-8">
<ProviderProfile providerId={providerId as string} />
</div>
);
}
\*/

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Leaderboard Page (Table Variant)
// ═══════════════════════════════════════════════════════════════════════════

/\*
import { usePageTransitionComplete } from "@/hooks/usePageTransitionComplete";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export default function LeaderboardPage() {
// Auto-detects "table" variant based on /leaderboard route
usePageTransitionComplete();

return (

<div className="container mx-auto py-8">
<h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
<LeaderboardTable />
</div>
);
}
\*/

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Compare Page (Grid Variant)
// ═══════════════════════════════════════════════════════════════════════════

/\*
import { usePageTransitionComplete } from "@/hooks/usePageTransitionComplete";
import { ProviderComparison } from "@/components/ProviderComparison";

export default function ComparePage() {
// Auto-detects "grid" variant based on /compare route
usePageTransitionComplete();

return (

<div className="container mx-auto py-8">
<h1 className="text-3xl font-bold mb-6">Compare Providers</h1>
<ProviderComparison />
</div>
);
}
\*/

// ═══════════════════════════════════════════════════════════════════════════
// VARIANTS REFERENCE
// ═══════════════════════════════════════════════════════════════════════════

/\*
The PageTransitionPlaceholder automatically selects the appropriate skeleton
variant based on your route:

1. "feed" (Default)

   - Routes: /app, /, any unmatched routes
   - Layout: Grid of 2 columns (mobile: 1, desktop: 2)
   - Cards with header, content area, stats, and footer
   - Perfect for: Signal feed, timelines, card-based layouts

2. "detail"

   - Routes: /provider/_, /profile/_, /details/\*
   - Layout: Single column with sections
   - Header section, content sections, panels
   - Perfect for: Detail pages, profiles, individual resources

3. "table"

   - Routes: /leaderboard, /analytics, /backtest-sim, /transactions
   - Layout: Full-width table (mobile: stacked cards, desktop: table)
   - Perfect for: Data tables, rankings, lists with columns

4. "grid"
   - Routes: /compare, /gallery, /portfolio/comparison
   - Layout: Responsive grid (mobile: 1, tablet: 2, desktop: 3)
   - Perfect for: Multi-column comparisons, card grids

If you need a custom skeleton for a new route, you can:

1. Add the route pattern to getSkeletonVariant() in PageTransitionPlaceholder
2. Add a new variant to PageTransitionSkeleton
3. Or pass the variant directly to PageTransitionSkeleton if needed
   \*/

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: Custom Transition Timing
// ═══════════════════════════════════════════════════════════════════════════

/\*
You can customize the timing by passing props to PageTransitionPlaceholder
in the layout (if needed for special use cases):

<PageTransitionPlaceholder
showDelay={100} // Delay before showing (ms), default: 200
minShowDuration={500} // Min display time (ms), default: 300
/>

Timing strategy:

- showDelay: Prevents flickering for fast transitions (fast networks)
- minShowDuration: Ensures users see the placeholder (visual feedback)
- Recommended ranges:
  - showDelay: 100-300ms
  - minShowDuration: 300-600ms
    \*/

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: Manual Store Control
// ═══════════════════════════════════════════════════════════════════════════

/\*
For edge cases, you can directly use the store:

import { usePageTransitionStore } from "@/store/usePageTransitionStore";

export default function CustomPage() {
const { isTransitioning, startTransition, completeTransition } =
usePageTransitionStore();

// Manual control if usePageTransitionComplete() isn't sufficient
useEffect(() => {
if (someAsyncOperationComplete) {
completeTransition();
}
}, [someAsyncOperationComplete, completeTransition]);

return <div>{isTransitioning && "Loading..."}</div>;
}
\*/

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSIVE BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════

/\*
The skeleton loaders are fully responsive using Tailwind breakpoints:

Mobile (< 640px):

- Single column layouts
- Compact padding (px-3, py-4)
- Reduced spacing between items
- Stack-based table views

Tablet (640px - 1024px):

- Two-column grids for feed
- Standard padding
- Slightly larger spacing

Desktop (> 1024px):

- Multi-column layouts
- Full padding (px-6, py-8)
- Generous spacing
- Full table views with horizontal scroll

All skeleton animations use `animate-pulse` which respects
prefers-reduced-motion media query for accessibility
\*/

export {};
