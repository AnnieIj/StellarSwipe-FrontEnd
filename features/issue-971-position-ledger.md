# Issue #971 - Transaction Ledger and Position P&L for Partial Closes

Maps implemented features to acceptance criteria.

## Implemented

- **Confirmed fills and fees are immutable ledger entries** – `FillEntry` and `FeeEntry` are `readonly` and append-only. A fee is recorded as its own entry against a `fillId`; `replayLedger()` never mutates the input.
- **Partial closes reduce remaining quantity** – each SELL fill reduces `quantity`; the remainder keeps the same average cost.
- **Realized P&L allocated by a documented cost-basis rule** – weighted average cost (see `lib/positionLedger.ts`):
  - BUY: fee is capitalized into cost basis.
  - SELL: cost relieved = `averageCost × quantity`; `realizedPnL = quantity × price − fee − costRelieved`.
  - Each sell yields a `RealizedClose` record so P&L can be attributed per close.
- **Multi-fill outcomes reconcile** – position quantity, cost basis and realized P&L are derived by replaying all entries in order; overselling throws.

## Files

| File                          | Role                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `lib/positionLedger.ts`       | Ledger types, `replayLedger()`, `unrealizedPnL()`      |
| `features/issue-971-position-ledger.md` | This document                                |

## Not yet wired

The portfolio UI still reads `store/usePortfolioStore.ts` and the mocked data in `hooks/usePortfolio.ts`. Connecting these to a real execution feed is a follow-up; the ledger module is the source of truth once that feed exists.
