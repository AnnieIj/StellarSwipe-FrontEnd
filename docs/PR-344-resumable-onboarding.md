# Resumable Onboarding Flow with Persisted Progress

## Summary

Persists the current onboarding step to localStorage on each transition. When a user closes the app mid-flow and returns, they resume from the last incomplete step instead of restarting. A clear progress indicator shows "Step X of Y • Z% complete".

## Changes

### Store (`store/useOnboardingStore.ts`)

- Added `currentStep: number` to the persisted state (defaults to 0)
- Added `setCurrentStep(step)` action — called on each step transition
- Exported `ONBOARDING_TOTAL_STEPS = 3` constant for tests and component
- `setCompleted()` now also sets `currentStep` to `ONBOARDING_TOTAL_STEPS`
- `reset()` now also resets `currentStep` to 0
- `setDismissed()` preserves `currentStep` so a dismissed user who comes back later can still resume

### Onboarding Flow (`components/OnboardingFlow.tsx`)

- Replaced local `useState(0)` with persisted `currentStep`/`setCurrentStep` from the store
- Fixed `useFocusTrap` hook call — was imported but never invoked (bug fix: `const focusTrapRef = useFocusTrap({ isActive: true })`)
- Added text progress indicator: **"Step 2 of 3 · 67% complete"** between the progress dots and the icon
- On resuming from rehydration, `currentStep` is clamped to `Math.min(currentStep, steps.length - 1)` for safety
- Each "Next" click persists the new step via `setCurrentStep()`

### Unit Tests (`store/__tests__/stores.test.ts`)

- 7 new tests in `describe("useOnboardingStore")`:
  1. `starts with step 0 and not completed`
  2. `setCurrentStep persists the step`
  3. `setCompleted marks completed and dismissed and sets step to max`
  4. `setDismissed marks dismissed without changing step`
  5. `resume from step 1 after simulated reload`
  6. `resume from step 2 after simulated reload`
  7. `reset clears everything including currentStep`

## Files Changed

| File                             | Status                                                                     |
| -------------------------------- | -------------------------------------------------------------------------- |
| `store/useOnboardingStore.ts`    | Modified — added `currentStep`, `setCurrentStep`, `ONBOARDING_TOTAL_STEPS` |
| `components/OnboardingFlow.tsx`  | Modified — persisted step, progress indicator, focus trap fix              |
| `store/__tests__/stores.test.ts` | Modified — added 7 onboarding resume tests                                 |

## Backward Compatibility

- Existing `completed` and `dismissed` behavior is unchanged
- New `currentStep` field defaults to 0 for first-time users
- The persist key (`stellar-onboarding`) stays the same; existing localStorage data gets an additional `currentStep` field on first save
- Skip/dismiss behavior unchanged

closes #344
