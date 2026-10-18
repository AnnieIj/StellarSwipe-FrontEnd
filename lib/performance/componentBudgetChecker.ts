/**
 * Component Performance Budget Checker
 * Development-only utility to detect and warn about budget violations.
 *
 * Only active when process.env.NODE_ENV === 'development'
 * No impact on production builds.
 */

import {
  checkBudgetViolation,
  type ComponentBudget,
  COMPONENT_BUDGETS,
} from "@/lib/componentBudgets";

/**
 * Log level for budget warnings
 */
export type BudgetWarningLevel = "info" | "warn" | "error";

/**
 * Console styling for different warning levels
 */
const CONSOLE_STYLES = {
  info: "color: #3b82f6; font-weight: bold;",
  warn: "color: #f59e0b; font-weight: bold;",
  error: "color: #ef4444; font-weight: bold;",
};

/**
 * Check component size against budget and log warning if violated.
 * Only logs in development mode.
 *
 * @example
 * // In component or during build
 * checkComponentBudget('SignalCard', 48.5);
 * // Logs: ⚠️  SignalCard exceeds budget: 48.5KB (expected 45KB, max +6.75KB)
 */
export function checkComponentBudget(
  componentName: string,
  actualSizeKb: number,
  logLevel: BudgetWarningLevel = "warn"
): void {
  // Only log in development
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return;
  }

  const violation = checkBudgetViolation(componentName, actualSizeKb);
  if (!violation) {
    return; // No budget defined for this component
  }

  if (violation.violated) {
    const style = CONSOLE_STYLES[logLevel];
    console[logLevel](
      `%c${violation.message}\n   Overage: +${violation.overageKb}KB (+${violation.overagePercent}%)`,
      style
    );
  }
}

/**
 * Check all components in a bundle and report violations.
 * Useful for build analysis scripts.
 *
 * @param componentSizes Map of component name to size in KB
 * @returns Array of violations found
 */
export function checkAllComponentBudgets(
  componentSizes: Record<string, number>
): Array<{
  componentName: string;
  actualKb: number;
  budget: ComponentBudget;
  overageKb: number;
  overagePercent: number;
}> {
  const violations: Array<{
    componentName: string;
    actualKb: number;
    budget: ComponentBudget;
    overageKb: number;
    overagePercent: number;
  }> = [];

  for (const [componentName, actualKb] of Object.entries(componentSizes)) {
    const violation = checkBudgetViolation(componentName, actualKb);
    if (violation?.violated) {
      const budget = COMPONENT_BUDGETS[componentName]!;
      violations.push({
        componentName,
        actualKb,
        budget,
        overageKb: violation.overageKb,
        overagePercent: violation.overagePercent,
      });
    }
  }

  return violations;
}

/**
 * Print a formatted report of budget violations.
 * Useful for CI/build output.
 *
 * @param violations Array of violations from checkAllComponentBudgets()
 * @returns Formatted report string
 */
export function formatBudgetReport(
  violations: Array<{
    componentName: string;
    actualKb: number;
    budget: ComponentBudget;
    overageKb: number;
    overagePercent: number;
  }>
): string {
  if (violations.length === 0) {
    return "✓ All components within performance budget!\n";
  }

  let report = `\n❌ ${violations.length} component(s) exceed performance budget:\n\n`;

  for (const v of violations) {
    const allowedMax = v.budget.expectedKb * (1 + v.budget.threshold);
    report += `  📦 ${v.componentName}\n`;
    report += `     Expected: ${v.budget.expectedKb}KB\n`;
    report += `     Actual:   ${v.actualKb.toFixed(1)}KB\n`;
    report += `     Overage:  +${v.overageKb.toFixed(1)}KB (+${v.overagePercent.toFixed(1)}%)\n`;
    report += `     Allowed:  ${allowedMax.toFixed(1)}KB (threshold: +${Math.round(v.budget.threshold * 100)}%)\n\n`;
  }

  report += "💡 Tips to reduce size:\n";
  report += "  - Use code splitting for heavy dependencies\n";
  report += "  - Consider lazy loading for complex sub-components\n";
  report += "  - Review new dependencies added to the component\n";
  report += "  - Run 'npm run build:analyze' to visualize bundle\n";

  return report;
}

/**
 * Watch component metrics over time (development only).
 * Returns callback to track metrics.
 *
 * @example
 * const trackMetric = trackComponentMetrics('SignalCard');
 * trackMetric(45.2);  // Log size
 * trackMetric(46.1);  // Log trend
 */
export function trackComponentMetrics(componentName: string): (size: number) => void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return () => {}; // No-op in production
  }

  const storageKey = `perf:${componentName}`;
  const history: Array<{ timestamp: number; sizeKb: number }> = [];

  return (sizeKb: number) => {
    const now = Date.now();
    history.push({ timestamp: now, sizeKb });

    // Keep last 10 measurements
    if (history.length > 10) {
      history.shift();
    }

    // Calculate trend
    if (history.length >= 2) {
      const prev = history[history.length - 2].sizeKb;
      const current = history[history.length - 1].sizeKb;
      const delta = current - prev;
      const trend = delta > 0 ? "📈" : delta < 0 ? "📉" : "→";

      const style = delta > 0 ? "color: #ef4444;" : "color: #10b981;";
      console.log(
        `%c${trend} ${componentName}: ${current.toFixed(1)}KB (${delta > 0 ? "+" : ""}${delta.toFixed(1)}KB)`,
        style
      );
    }

    checkComponentBudget(componentName, sizeKb);
  };
}
