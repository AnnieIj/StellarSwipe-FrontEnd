import { useEffect } from "react";
import { checkComponentBudget } from "@/lib/performance/componentBudgetChecker";

/**
 * React hook for component performance budgeting.
 * Development-only: warns if component exceeds expected size.
 *
 * Usage:
 *   export function MyHeavyComponent() {
 *     useComponentBudget('MyHeavyComponent', 45);  // 45KB expected
 *     return <div>...</div>;
 *   }
 *
 * Only logs warnings in development mode (process.env.NODE_ENV === 'development').
 * No production impact.
 *
 * @param componentName - Display name for error messages
 * @param expectedSizeKb - Expected bundle size in KB
 * @param logLevel - Console log level: 'warn' (default), 'error', 'info'
 */
export function useComponentBudget(
  componentName: string,
  expectedSizeKb: number,
  logLevel: "info" | "warn" | "error" = "warn"
): void {
  useEffect(() => {
    // Only check in development
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "development") {
      return;
    }

    // Check budget once on mount
    checkComponentBudget(componentName, expectedSizeKb, logLevel);
  }, [componentName, expectedSizeKb, logLevel]);
}
