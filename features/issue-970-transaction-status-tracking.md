# Issue #970 - Stellar Transaction Submission and Confirmation States

Persists trade progress from submission through ledger confirmation or terminal failure in `useTransactionStore`.

## States

| Status      | Outcome   | Meaning                                                    |
| ----------- | --------- | ---------------------------------------------------------- |
| `PENDING`   | `PENDING` | Transaction submitted; awaiting ledger confirmation.       |
| `SUCCEEDED` | `WIN`     | Confirmed on the ledger. Terminal.                         |
| `FAILED`    | `LOSS`    | Rejected or not confirmed. Terminal.                       |

## Transitions

```
            updateTransactionStatus(id, "SUCCEEDED")
PENDING ─────────────────────────────────────────────▶ SUCCEEDED (terminal)
   │
   └─────────────────────────────────────────────────▶ FAILED (terminal)
            updateTransactionStatus(id, "FAILED")
```

- `addTransaction` creates an entry in `PENDING`.
- `updateTransactionStatus` moves `PENDING` to `SUCCEEDED` or `FAILED`. The outcome defaults to `WIN` or `LOSS` unless passed explicitly.
- No other transitions exist. Once an entry is `SUCCEEDED` or `FAILED`, later updates are ignored.

## Identity and network

Each entry carries:

- `hash`: the Stellar transaction hash, set at submission.
- `network`: `"TESTNET"` or `"PUBLIC"`, matching `NEXT_PUBLIC_STELLAR_NETWORK`. Optional, since seeded or legacy entries may not have it.

Explorer links use `hash` (see `OnChainConfirmationStatus`, `TransactionActivityFeed`).

## Idempotency

- `addTransaction` is a no-op when an entry with the same `id` or the same non-empty `hash` already exists. A retried submission does not create a duplicate.
- `updateTransactionStatus` is a no-op for entries already in a terminal status. A duplicate or late confirmation cannot flip `SUCCEEDED` to `FAILED`, or the reverse.

## Files

| File                                             | Role                                          |
| ------------------------------------------------ | --------------------------------------------- |
| `store/useTransactionStore.ts`                   | Status, transitions, idempotency guards       |
| `components/TransactionActivityFeed.tsx`         | Drives `PENDING` → terminal updates           |
| `components/OnChainConfirmationStatus.tsx`       | Shows the latest `PENDING` transaction        |
