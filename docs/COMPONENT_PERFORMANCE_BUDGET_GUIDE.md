# Component Performance Budget Guide

## Overview

This guide explains how to use the component performance budget system to catch regressions early and keep the frontend responsive.

The system is **development-only**: it only logs warnings during development builds and has zero impact on production.

## Problem Solved

As features are added, components can unexpectedly grow in size:

```
Before: SignalCard = 45 KB ✓
After:  SignalCard = 62 KB (Added chart preview + new dependencies) ❌
```

Without visibility, these regressions accumulate and slow down the app for users.

## Quick Start

### 1. Defining Component Budgets

Budgets are defined in `lib/componentBudgets.ts`:

```ts
export const COMPONENT_BUDGETS: Record<string, ComponentBudget> = {
  SignalCard: {
    name: "SignalCard",
    expectedKb: 45,
    threshold: 0.15,  // Allow up to 15% overage
    filePath: "components/SignalCard.tsx",
    justification: "Complex card with chart preview and badges",
  },
  // ... more components
};
```

**Budget Parameters:**
- `expectedKb` - Expected minified bundle size
- `threshold` - Allowed overage (0.15 = 15% tolerance)
- `name` / `filePath` - For error messages and reference
- `justification` - Why this budget was set (for code review)

### 2. Using in Components

Add the budget check to your component during development:

```tsx
import { useComponentBudget } from "@/hooks/useComponentBudget";

export function SignalCard() {
  // Warns in dev if component exceeds 45KB
  useComponentBudget("SignalCard", 45);

  return (
    <div className="signal-card">
      {/* ... */}
    </div>
  );
}
```

The hook only runs in `NODE_ENV === 'development'`, so there's zero production impact.

### 3. Monitoring Budgets

#### During Development

As you work, the console will show warnings:

```
⚠️  SignalCard exceeds budget: 48.5KB (expected 45KB, max +6.75KB)
   Overage: +3.5KB (+7.8%)
```

#### In Build Scripts

Use the utility directly in build analysis:

```ts
import { checkAllComponentBudgets, formatBudgetReport } from "@/lib/performance/componentBudgetChecker";

const violations = checkAllComponentBudgets({
  SignalCard: 48.5,
  Leaderboard: 45.2,
  NavHeader: 18.1,
});

if (violations.length > 0) {
  console.log(formatBudgetReport(violations));
  process.exit(1);  // Fail CI if over budget
}
```

#### From Bundle Analyzer

After running `npm run build:analyze`, manually check component sizes:

```bash
npm run build:analyze
# Look for component names in the bundle analyzer
# Then use checkComponentBudget() to verify
```

## API Reference

### `useComponentBudget(name, expectedSizeKb, logLevel?)`

React hook for component-level budget checking.

**Parameters:**
- `name` (string) - Component name for error messages
- `expectedSizeKb` (number) - Expected size in KB
- `logLevel` (string, optional) - 'warn' (default), 'error', 'info'

**Example:**
```tsx
export function MyComponent() {
  useComponentBudget("MyComponent", 32, "warn");
  return <div>...</div>;
}
```

### `checkComponentBudget(name, actualSizeKb, logLevel?)`

Direct function to check a component's budget (dev-only).

**Example:**
```ts
import { checkComponentBudget } from "@/lib/performance/componentBudgetChecker";

// In build script
checkComponentBudget("SignalCard", 48.5, "error");
// Logs: ⚠️  SignalCard exceeds budget...
```

### `checkAllComponentBudgets(sizes)`

Check multiple components at once.

**Parameters:**
- `sizes` - Record<string, number> mapping component names to sizes in KB

**Returns:**
- Array of violations with details (componentName, actualKb, overage, etc.)

**Example:**
```ts
const violations = checkAllComponentBudgets({
  SignalCard: 48.5,
  Leaderboard: 45.2,
});

violations.forEach(v => {
  console.log(`${v.componentName}: +${v.overageKb}KB`);
});
```

### `formatBudgetReport(violations)`

Human-readable report of violations.

**Returns:** Formatted string with:
- List of violations with actual vs expected sizes
- Overage percentages
- Tips for reducing size

**Example:**
```ts
const report = formatBudgetReport(violations);
console.log(report);
// Output:
// ❌ 2 component(s) exceed performance budget:
//   📦 SignalCard
//      Expected: 45KB
//      Actual:   48.5KB
//      ...
```

### `trackComponentMetrics(name)`

Track component size changes over time.

**Returns:** Function to log metrics

**Example:**
```ts
const track = trackComponentMetrics("SignalCard");
track(45.2);  // ✓ Logs size
track(46.1);  // 📈 Shows trend: +0.9KB
track(45.8);  // 📉 Shows trend: -0.3KB
```

## Integration Checklist

### Adding a New Component to Budget Tracking

1. **Measure the component size:**
   ```bash
   npm run build:analyze
   # Find component in output
   ```

2. **Add to `lib/componentBudgets.ts`:**
   ```ts
   export const COMPONENT_BUDGETS = {
     // ... existing
     MyNewComponent: {
       name: "MyNewComponent",
       expectedKb: 35,          // Adjust based on measurement
       threshold: 0.15,          // 15% tolerance
       filePath: "components/MyNewComponent.tsx",
       justification: "Brief description of component",
     },
   };
   ```

3. **Add to component (optional, but recommended):**
   ```tsx
   import { useComponentBudget } from "@/hooks/useComponentBudget";

   export function MyNewComponent() {
     useComponentBudget("MyNewComponent", 35);
     return <div>...</div>;
   }
   ```

### Updating Budgets During Review

When a PR increases a component size:

1. **Review the changes:**
   - Why did the component grow?
   - Are new dependencies necessary?
   - Can it be code-split or lazy-loaded?

2. **Update the budget if justified:**
   ```ts
   MyComponent: {
     name: "MyComponent",
     expectedKb: 55,  // Increased from 45
     threshold: 0.15,
     justification: "Added chart preview feature (issue #123)",
   }
   ```

3. **Do NOT just increase threshold** to hide regressions.

## Best Practices

### ✅ DO:

```ts
// Use meaningful threshold (5-20%)
threshold: 0.15,  // 15% is reasonable for complex components

// Update budgets with justification
justification: "Added chart preview + PDF export (PR #456)",

// Use in build scripts to fail CI
if (violations.length > 0) {
  console.log(formatBudgetReport(violations));
  process.exit(1);
}

// Add to components during development
useComponentBudget("SignalCard", 45);
```

### ❌ DON'T:

```ts
// Don't set impossible thresholds
threshold: 0.01,  // Too strict, causes noise

// Don't increase budgets without justification
expectedKb: 50,  // Just raising it without reason

// Don't ignore warnings
// (they indicate real performance issues)

// Don't add every component
// (only critical, heavy components need budgets)
```

## Common Scenarios

### Scenario 1: Adding a New Dependency

**Problem:** Component grew by 8KB after adding a chart library.

**Solution:**
1. Check if library is duplicated elsewhere (use `npm ls <package>`)
2. Consider lazy-loading the chart component:
   ```tsx
   const Chart = React.lazy(() => import("./Chart"));
   ```
3. Update budget with justification:
   ```ts
   expectedKb: 53,  // +8KB for chart library (issue #789)
   ```

### Scenario 2: Recurring Regressions

**Problem:** Component size keeps creeping up.

**Solution:**
1. Review recent commits: `git log --oneline components/SignalCard.tsx`
2. Identify unnecessary dependencies added
3. Consider code-splitting larger features
4. Add dependency guard in CI (e.g., `npm audit`)

### Scenario 3: Feature Requires Size Increase

**Problem:** Feature requires component to grow by 12KB.

**Solution:**
1. Try alternatives:
   - Split into separate lazy-loaded component
   - Use existing dependencies instead of new library
   - Feature flag expensive feature for certain users
2. If unavoidable, update budget with clear justification:
   ```ts
   justification: "Added advanced analytics feature (v2.0)"
   ```

## CI Integration

Add to your build pipeline to enforce budgets:

```bash
# In package.json scripts
"build:check-budget": "node scripts/check-component-budgets.js"

# In CI config (.github/workflows/build.yml)
- name: Check component budgets
  run: npm run build:check-budget
```

Example script (`scripts/check-component-budgets.js`):

```js
const { checkAllComponentBudgets, formatBudgetReport } = require("../lib/performance/componentBudgetChecker");
const bundleAnalyzer = require("./bundle-analyzer");

// Get component sizes from build analysis
const componentSizes = bundleAnalyzer.analyze();

// Check budgets
const violations = checkAllComponentBudgets(componentSizes);

if (violations.length > 0) {
  console.log(formatBudgetReport(violations));
  process.exit(1);
}

console.log("✓ All components within budget!");
```

## Troubleshooting

**Q: Warnings not showing in my component?**
A: Make sure you're in development mode (`NODE_ENV=development`). Hooks only log in dev.

**Q: How do I know the actual component size?**
A: Run `npm run build:analyze` to see bundle breakdown in browser.

**Q: Can I override budget thresholds per environment?**
A: Yes, you can check `process.env` in budget definitions:
```ts
threshold: process.env.ENVIRONMENT === "staging" ? 0.2 : 0.15,
```

**Q: What if my component is supposed to be large?**
A: Set appropriate `expectedKb` and `threshold`:
```ts
PnLWidget: {
  expectedKb: 75,  // Charts are inherently larger
  threshold: 0.2,  // 20% tolerance
  justification: "Requires chart library and data visualization",
}
```

## Summary

| Task | Command | File |
|------|---------|------|
| Define budgets | Edit COMPONENT_BUDGETS | `lib/componentBudgets.ts` |
| Add to component | `useComponentBudget()` | Your component file |
| Check manually | `checkComponentBudget()` | Build script |
| View full report | `formatBudgetReport()` | CI output |
| Track trends | `trackComponentMetrics()` | Analytics |

The system is **light, dev-only, and actionable**. Use it to catch regressions before they impact users.
