/**
 * Component Performance Budgets
 *
 * Defines expected bundle size for key components.
 * Used to warn developers when components unexpectedly grow.
 *
 * Budget sizes are in bytes. These are rough estimates based on:
 * - Actual component code (minified)
 * - Direct dependencies only (shared deps split across app)
 *
 * To measure a component's size:
 *   npm run build:analyze
 *   Look for the component in the bundle analyzer output
 */

export type ComponentBudget = {
  /** Component name for error messages */
  name: string;
  /** Expected size in bytes */
  expectedKb: number;
  /** Allowed overage % (0.1 = 10%) */
  threshold: number;
  /** Why this budget was set */
  justification?: string;
  /** Component file path for reference */
  filePath?: string;
};

/**
 * Budgets for key components across the app.
 * Organized by category for easier maintenance.
 */
export const COMPONENT_BUDGETS: Record<string, ComponentBudget> = {
  // Signal cards & feed
  SignalCard: {
    name: "SignalCard",
    expectedKb: 45,
    threshold: 0.15,
    filePath: "components/SignalCard.tsx",
    justification:
      "Complex card with chart preview, multi-badge system, and interaction states",
  },
  SignalFeedFilters: {
    name: "SignalFeedFilters",
    expectedKb: 25,
    threshold: 0.15,
    filePath: "components/SignalFeedFilters.tsx",
    justification: "Filter UI with multiple select options and state management",
  },

  // Portfolio & analytics
  PortfolioSummaryCards: {
    name: "PortfolioSummaryCards",
    expectedKb: 35,
    threshold: 0.15,
    filePath: "components/PortfolioSummaryCards.tsx",
    justification: "Multiple stat cards with trending indicators",
  },
  PnLWidget: {
    name: "PnLWidget (chart)",
    expectedKb: 60,
    threshold: 0.15,
    filePath: "components/chart/PnLWidget.tsx",
    justification:
      "Embeds chart library for profit/loss visualization with animations",
  },

  // Leaderboard & rankings
  Leaderboard: {
    name: "Leaderboard",
    expectedKb: 40,
    threshold: 0.15,
    filePath: "components/Leaderboard.tsx",
    justification: "Grid of ranked entries with avatars and formatters",
  },
  ProviderRatingBadge: {
    name: "ProviderRatingBadge",
    expectedKb: 28,
    threshold: 0.15,
    filePath: "components/ProviderRatingBadge.tsx",
    justification: "Badge showing provider stats with tooltip",
  },

  // Forms & modals
  TradeModal: {
    name: "TradeModal",
    expectedKb: 50,
    threshold: 0.15,
    filePath: "components/TradeModal.tsx",
    justification: "Complex form with validation, preview, and state management",
  },
  TwoFactorSetupWizard: {
    name: "TwoFactorSetupWizard",
    expectedKb: 38,
    threshold: 0.15,
    filePath: "components/TwoFactorSetupWizard.tsx",
    justification: "Multi-step form with QR code generation",
  },

  // Navigation & layout
  NavHeader: {
    name: "NavHeader",
    expectedKb: 20,
    threshold: 0.2,
    filePath: "components/NavHeader.tsx",
    justification: "Simple navigation header, should stay lean",
  },
  Navbar: {
    name: "Navbar",
    expectedKb: 32,
    threshold: 0.15,
    filePath: "components/Navbar.tsx",
    justification: "Main navigation with dropdown menus and wallet selector",
  },

  // Lists & tables
  TransactionActivityFeed: {
    name: "TransactionActivityFeed",
    expectedKb: 28,
    threshold: 0.15,
    filePath: "components/TransactionActivityFeed.tsx",
    justification: "Paginated list with filters and status indicators",
  },
  VirtualizedList: {
    name: "VirtualizedList",
    expectedKb: 15,
    threshold: 0.2,
    filePath: "components/VirtualizedList.tsx",
    justification: "Virtualization wrapper, keep minimal for list performance",
  },
};

/**
 * Get budget for a component by name
 */
export function getComponentBudget(
  componentName: string
): ComponentBudget | null {
  return COMPONENT_BUDGETS[componentName] || null;
}

/**
 * Check if a component size exceeds budget
 * @returns Array of violations (empty if within budget)
 */
export function checkBudgetViolation(
  componentName: string,
  actualSizeKb: number
): {
  violated: boolean;
  overageKb: number;
  overagePercent: number;
  message: string;
} | null {
  const budget = getComponentBudget(componentName);
  if (!budget) return null;

  const overageKb = actualSizeKb - budget.expectedKb;
  const overagePercent = (overageKb / budget.expectedKb) * 100;
  const thresholdKb = budget.expectedKb * budget.threshold;

  return {
    violated: overageKb > thresholdKb,
    overageKb: Math.round(overageKb * 100) / 100,
    overagePercent: Math.round(overagePercent * 10) / 10,
    message:
      overageKb > thresholdKb
        ? `⚠️  ${componentName} exceeds budget: ${actualSizeKb.toFixed(1)}KB (expected ${budget.expectedKb}KB, max +${Math.round(thresholdKb * 10) / 10}KB)`
        : `✓ ${componentName} within budget`,
  };
}
