# Issue #953 - Immutable Signal Revisions for Provider Updates

Maps implemented features to acceptance criteria.

## Implemented

- **Edits append a revision without overwriting history** – `appendSignalRevision()` returns a new log with the edit as the next revision. The input log and every earlier revision are frozen and never changed.
- **Each revision records what changed** – `changedFields` lists the fields that differ from the previous revision. Each revision also stores the full content, the actor (`actorId`) and the change time (`changedAt`).
- **Unchanged edits add nothing** – if the new content matches the current revision, the log is returned as is.
- **Current state stays queryable** – `getCurrentSignalRevision()` returns the latest revision. `getSignalRevision()` returns any earlier revision by number.
- **Revision order and immutability are defined by the module** – revisions are 1-based and contiguous per signal. Frozen objects are returned, so later writes can't change earlier revisions.

## Files

| File                                    | Role                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `lib/signalRevisions.ts`                | Revision types, `createSignalRevisionLog()`, `appendSignalRevision()`, queries |
| `features/issue-953-signal-revisions.md` | This document                                                             |

## Not yet wired

No provider-edit flow exists in this frontend yet. The signal feed in `lib/signals.ts` is still mocked. Once an edit endpoint exists, it should:

1. Check the actor with `canMutateProviderSignal()` (see `lib/signalAuthorization.ts`).
2. Load the signal's stored log and call `appendSignalRevision()` with the edited content.
3. Persist the returned log. The backend store is the source of truth, and this module defines its shape.
