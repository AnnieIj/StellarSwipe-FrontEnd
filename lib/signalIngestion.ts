import { buildQuote } from "./signals";
import type { Signal, SignalAction } from "./signals";

/**
 * Provider signal ingestion, made idempotent.
 *
 * Idempotency key: `${provider}:${externalId}`
 * - `provider` is the provider name as stored on `Signal.provider`. It is
 *   trimmed and must be non-empty and must not contain ":", so the key
 *   splits unambiguously.
 * - `externalId` is the provider's own identifier for the signal. It is
 *   trimmed and must be non-empty. Comparison is case-sensitive.
 * - The key is also used as the stored `Signal.id`, so the same submission
 *   always maps to the same signal id, including across restarts.
 *
 * Rules when a key is submitted again:
 * - Same key, same payload (retry): returns the existing signal with
 *   outcome `duplicate`. Nothing is written.
 * - Same key, different payload (conflicting update): the first write wins.
 *   The existing signal is left unchanged and returned with outcome
 *   `conflict`. Callers should surface this as a conflict (e.g. HTTP 409).
 *   Changing a stored signal requires a separate mutation path that passes
 *   `canMutateProviderSignal`.
 * - New key: stored and returned with outcome `created`.
 *
 * Concurrency: the store's `putIfAbsent` must be atomic. Concurrent
 * submissions of one key produce exactly one `created`, and the rest resolve
 * as `duplicate` or `conflict` against that stored signal. The in-memory store
 * below is atomic because nothing awaits between the read and the write. A
 * multi-instance backend must enforce the same guarantee with a unique index
 * on the key (e.g. `INSERT ... ON CONFLICT DO NOTHING`).
 */

export interface ProviderSignalSubmission {
  provider: string;
  externalId: string;
  ticker: string;
  action: SignalAction;
  confidence: number;
  details: string;
  expiresAt?: string;
}

export type SignalIngestionOutcome = "created" | "duplicate" | "conflict";

export interface SignalIngestionResult {
  outcome: SignalIngestionOutcome;
  signal: Signal;
}

interface StoredSubmission {
  signal: Signal;
  fingerprint: string;
}

export interface SignalIngestionStore {
  /**
   * Atomically stores `signal` under `key` unless the key already exists.
   * Returns the entry now stored under `key`, and whether this call inserted it.
   */
  putIfAbsent(
    key: string,
    entry: StoredSubmission
  ): Promise<{ inserted: boolean; entry: StoredSubmission }>;
}

const SIGNAL_ACTIONS: readonly SignalAction[] = ["BUY", "SELL", "HOLD"];

export function createInMemorySignalIngestionStore(): SignalIngestionStore {
  const entries = new Map<string, StoredSubmission>();

  return {
    async putIfAbsent(key, entry) {
      const existing = entries.get(key);
      if (existing) return { inserted: false, entry: existing };

      entries.set(key, entry);
      return { inserted: true, entry };
    },
  };
}

/** Returns the idempotency key for a submission. Throws if it is invalid. */
export function getSignalIdempotencyKey(
  submission: Pick<ProviderSignalSubmission, "provider" | "externalId">
): string {
  const provider = submission.provider.trim();
  const externalId = submission.externalId.trim();

  if (!provider || provider.includes(":")) {
    throw new Error("provider is required and must not contain ':'.");
  }
  if (!externalId) {
    throw new Error("externalId is required.");
  }

  return `${provider}:${externalId}`;
}

/** Fields that define what a provider submitted. Two submissions with equal fingerprints are retries. */
function getFingerprint(submission: ProviderSignalSubmission): string {
  return JSON.stringify([
    submission.ticker.trim(),
    submission.action,
    submission.confidence,
    submission.details,
    submission.expiresAt ?? null,
  ]);
}

function assertValidSubmission(submission: ProviderSignalSubmission): void {
  if (!submission.ticker.trim()) {
    throw new Error("ticker is required.");
  }
  if (!SIGNAL_ACTIONS.includes(submission.action)) {
    throw new Error("action must be one of BUY, SELL or HOLD.");
  }
  if (
    !Number.isFinite(submission.confidence) ||
    submission.confidence < 0 ||
    submission.confidence > 100
  ) {
    throw new Error("confidence must be a number between 0 and 100.");
  }
}

/**
 * Ingests a provider submission idempotently. See the module docs for the
 * key format and the duplicate/conflict rules.
 */
export async function ingestProviderSignal(
  submission: ProviderSignalSubmission,
  store: SignalIngestionStore,
  now: number = Date.now()
): Promise<SignalIngestionResult> {
  assertValidSubmission(submission);

  const key = getSignalIdempotencyKey(submission);
  const fingerprint = getFingerprint(submission);

  const candidate: Signal = {
    id: key,
    ticker: submission.ticker.trim(),
    action: submission.action,
    confidence: submission.confidence,
    details: submission.details,
    timestamp: new Date(now).toISOString(),
    expiresAt: submission.expiresAt,
    provider: submission.provider.trim(),
    // Quote metadata is filled in by the price pipeline, never by the provider
    quote: buildQuote(null, null, null),
  };

  const { inserted, entry } = await store.putIfAbsent(key, {
    signal: candidate,
    fingerprint,
  });

  if (inserted) return { outcome: "created", signal: entry.signal };

  return {
    outcome: entry.fingerprint === fingerprint ? "duplicate" : "conflict",
    signal: entry.signal,
  };
}
