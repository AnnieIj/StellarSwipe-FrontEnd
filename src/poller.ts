/**
 * poller.ts
 *
 * Encapsulates the scan-scheduling, cursor-persistence, and notification-delivery
 * logic for the signal-price polling loop.
 *
 * Design goals
 * ─────────────
 * • The chain is the source of truth — the poller never holds or emits signing keys.
 * • Time is injectable via the `Clock` interface so tests can advance it
 *   deterministically without relying on real wall-clock timers.
 * • All public methods are synchronous or return plain Promises; callers control
 *   the event loop.
 * • Logs are actionable but never include tokens, private keys, or unbounded
 *   remote payloads.
 *
 * Lifecycle states
 * ─────────────────
 *   idle → running → (paused | stopped)
 *   paused → running | stopped
 *
 * Cursor persistence
 * ──────────────────
 * The cursor records the ISO timestamp of the most-recently-processed event.
 * It is written after every successful scan so that a restart resumes from
 * the correct position.  A malformed or missing cursor causes the poller to
 * start from `epoch` (i.e. the beginning of time).
 */

// ─── Clock abstraction ────────────────────────────────────────────────────────

/** Minimal time abstraction so tests can inject a fake clock. */
export interface Clock {
  /** Returns the current time in milliseconds since Unix epoch. */
  now(): number;
  /**
   * Schedules `fn` to be called once after `ms` milliseconds.
   * Returns an opaque handle that can be passed to `clearTimeout`.
   */
  setTimeout(fn: () => void, ms: number): unknown;
  /** Cancels a timeout created by this clock. */
  clearTimeout(handle: unknown): void;
}

/** Production clock backed by the real `Date` and global timer APIs. */
export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof globalThis.setTimeout>),
};

// ─── Cursor ───────────────────────────────────────────────────────────────────

export const CURSOR_EPOCH = "1970-01-01T00:00:00.000Z";

/**
 * Parses a raw cursor string.  Returns the cursor's ISO timestamp if valid,
 * or `CURSOR_EPOCH` for any malformed / missing value — ensuring bounded
 * restart behaviour without throwing.
 */
export function parseCursor(raw: string | null | undefined): string {
  if (!raw) return CURSOR_EPOCH;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return CURSOR_EPOCH;
  return new Date(t).toISOString();
}

/**
 * Advances a cursor to `nowMs` and serialises it as an ISO string.
 * `nowMs` must be a finite number; otherwise the current cursor is returned
 * unchanged (defensive boundary: malformed event timestamp).
 */
export function advanceCursor(current: string, nowMs: number): string {
  if (!Number.isFinite(nowMs)) return current;
  return new Date(nowMs).toISOString();
}

// ─── Scan result ─────────────────────────────────────────────────────────────

export interface ScanResult {
  /** Human-readable summary, safe to log. */
  summary: string;
  /** ISO timestamp of the most-recently-processed event, or null if no events. */
  latestEventAt: string | null;
  /** True when the downstream RPC was reachable. */
  rpcOk: boolean;
  /** True when notification delivery succeeded (or was a no-op). */
  notifyOk: boolean;
}

// ─── Poller options ───────────────────────────────────────────────────────────

export type PollerState = "idle" | "running" | "paused" | "stopped";

export interface PollerOptions {
  /** Interval between scans in milliseconds. Default: 3000. */
  intervalMs?: number;
  /**
   * Maximum back-off delay applied after consecutive failures (ms).
   * Default: 30_000.
   */
  maxBackoffMs?: number;
  /**
   * Injected clock.  Defaults to `realClock`.
   * Pass a `FakeClock` in tests to control time deterministically.
   */
  clock?: Clock;
  /**
   * Called each time a scan completes (success or failure).
   * Receives the scan result and the updated cursor.
   * Safe to use for metrics / logging; must not throw.
   */
  onScanComplete?: (result: ScanResult, cursor: string) => void;
  /**
   * Called when a notification delivery fails.
   * Receives the error; must not throw.
   */
  onNotifyError?: (err: Error) => void;
  /**
   * Called when an RPC call fails.
   * Receives the error; must not throw.
   */
  onRpcError?: (err: Error) => void;
}

// ─── Poller ───────────────────────────────────────────────────────────────────

/**
 * Scan function supplied by the caller.  The poller itself is read-only — it
 * only calls this function; it never mutates chain state or holds keys.
 */
export type ScanFn = (cursor: string, clock: Clock) => Promise<ScanResult>;

/**
 * PollerRepo manages the scheduling loop, cursor persistence, error back-off,
 * and lifecycle transitions for a periodic Stellar / Telegram notifier scan.
 *
 * @example
 * ```ts
 * const poller = new PollerRepo(myScanFn, {
 *   intervalMs: 5000,
 *   clock: fakeClock,   // inject in tests
 * });
 * poller.start("2024-01-01T00:00:00.000Z");
 * // … later …
 * poller.stop();
 * ```
 */
export class PollerRepo {
  private readonly scan: ScanFn;
  private readonly intervalMs: number;
  private readonly maxBackoffMs: number;
  private readonly clock: Clock;
  private readonly onScanComplete: NonNullable<PollerOptions["onScanComplete"]>;
  private readonly onNotifyError: NonNullable<PollerOptions["onNotifyError"]>;
  private readonly onRpcError: NonNullable<PollerOptions["onRpcError"]>;

  private _state: PollerState = "idle";
  private _cursor: string = CURSOR_EPOCH;
  private _consecutiveFailures = 0;
  private _handle: unknown = null;

  constructor(scan: ScanFn, options: PollerOptions = {}) {
    this.scan = scan;
    this.intervalMs = options.intervalMs ?? 3_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30_000;
    this.clock = options.clock ?? realClock;
    this.onScanComplete = options.onScanComplete ?? (() => {});
    this.onNotifyError = options.onNotifyError ?? (() => {});
    this.onRpcError = options.onRpcError ?? (() => {});
  }

  // ── Public getters ─────────────────────────────────────────────────────────

  get state(): PollerState {
    return this._state;
  }

  get cursor(): string {
    return this._cursor;
  }

  get consecutiveFailures(): number {
    return this._consecutiveFailures;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Start polling from the given cursor (or `CURSOR_EPOCH` if omitted).
   * Throws if the poller is already running or stopped.
   */
  start(initialCursor?: string): void {
    if (this._state === "running") {
      throw new Error("PollerRepo.start(): already running");
    }
    if (this._state === "stopped") {
      throw new Error("PollerRepo.start(): cannot restart a stopped poller; create a new instance");
    }
    this._cursor = parseCursor(initialCursor);
    this._state = "running";
    this._scheduleNext(0);
  }

  /**
   * Pause the polling loop.  The current scan (if in-flight) completes
   * normally; no new scans are scheduled until `resume()` is called.
   */
  pause(): void {
    if (this._state !== "running") return;
    this._state = "paused";
    this._cancelPending();
  }

  /** Resume a paused poller.  No-op if not paused. */
  resume(): void {
    if (this._state !== "paused") return;
    this._state = "running";
    this._scheduleNext(0);
  }

  /**
   * Stop the poller permanently.  The current scan (if in-flight) completes
   * normally, but the result is discarded and no further scans are scheduled.
   */
  stop(): void {
    if (this._state === "stopped") return;
    this._state = "stopped";
    this._cancelPending();
  }

  // ── Scheduling ─────────────────────────────────────────────────────────────

  private _scheduleNext(delayMs: number): void {
    this._handle = this.clock.setTimeout(() => {
      this._handle = null;
      if (this._state !== "running") return;
      this._tick();
    }, delayMs);
  }

  private _cancelPending(): void {
    if (this._handle !== null) {
      this.clock.clearTimeout(this._handle);
      this._handle = null;
    }
  }

  private _tick(): void {
    this.scan(this._cursor, this.clock)
      .then((result) => {
        if (this._state === "stopped") return;

        // Advance cursor only on success
        if (result.rpcOk && result.latestEventAt !== null) {
          this._cursor = advanceCursor(this._cursor, Date.parse(result.latestEventAt));
        }

        if (!result.notifyOk) {
          this.onNotifyError(new Error(result.summary));
        }
        if (!result.rpcOk) {
          this.onRpcError(new Error(result.summary));
        }

        // Back-off management
        if (result.rpcOk && result.notifyOk) {
          this._consecutiveFailures = 0;
        } else {
          this._consecutiveFailures += 1;
        }

        this.onScanComplete(result, this._cursor);

        if (this._state === "running") {
          this._scheduleNext(this._nextDelay());
        }
      })
      .catch((err: unknown) => {
        if (this._state === "stopped") return;

        this._consecutiveFailures += 1;
        const error = err instanceof Error ? err : new Error(String(err));
        this.onRpcError(error);

        if (this._state === "running") {
          this._scheduleNext(this._nextDelay());
        }
      });
  }

  /**
   * Computes the next delay using exponential back-off capped at
   * `maxBackoffMs`.  On the first scan (no failures) the nominal interval
   * is used.
   */
  private _nextDelay(): number {
    if (this._consecutiveFailures === 0) return this.intervalMs;
    const backoff = Math.min(
      this.intervalMs * 2 ** (this._consecutiveFailures - 1),
      this.maxBackoffMs
    );
    return backoff;
  }
}
