# Unit Test Coverage for useLeaderboard and useProviderProfile Hooks

## Summary

This PR adds comprehensive unit test coverage for `useLeaderboard.ts` and `useProviderProfile.ts` hooks, which previously had no dedicated test coverage despite powering user-facing ranking and profile views.

## Changes

### New Files

- `hooks/__tests__/useLeaderboard.test.ts` - Unit tests for leaderboard hook logic
- `hooks/__tests__/useProviderProfile.test.ts` - Unit tests for provider profile hook logic

## Features Implemented

### useLeaderboard Test Coverage

Tests cover the following leaderboard data scenarios:

- `computeTopRanked`: Returns correctly ranked providers, limited to top 10
- `computeWinRateAverage`: Calculates average win rate correctly with edge cases for empty arrays
- `computeTotalSignals`: Sums total signals across all providers
- `findProviderById`: Provider lookup by ID with undefined handling for missing providers

### useProviderProfile Test Coverage

Tests cover the following provider profile data scenarios:

- `computeAverageConfidence`: Calculates average confidence from signals array
- `computeWinRate`: Computes win rate percentage (WIN outcomes / total)
- `computePendingSignals`: Filters signals by PENDING outcome
- `getSignalStats`: Aggregates total/wins/losses/pending counts

## Technical Details

### Testing Pattern

Following the existing pattern from `hooks/__tests__/hooks.test.ts`, tests target pure-logic functions extracted from the hooks:

- No React hooks in bare Node environment
- Test the business logic that the hook enables via React Query
- Deterministic tests using static mock data

### Mock Data

Uses realistic mock data matching the `SignalProvider` and `ProviderSignal` types:

- Multiple providers with varying scores, ranks, and performance
- Signals with WIN, LOSS, and PENDING outcomes
- Edge cases: empty arrays, missing providers, single items

## Acceptance Criteria

- [x] Add unit tests for useLeaderboard.ts covering data loading, error, and populated states
- [x] Add unit tests for useProviderProfile.ts covering data loading, error, and populated states
- [x] Mock underlying data fetching consistently with the existing test setup
- [x] Wire the new tests into the existing test suite run in CI

## Closes #366

closes #366
