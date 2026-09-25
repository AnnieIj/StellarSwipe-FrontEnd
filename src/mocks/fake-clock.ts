/**
 * fake-clock.ts
 *
 * A deterministic, in-process fake clock for use in unit tests.
 *
 * • `advance(ms)` — moves time forward by `ms` milliseconds and fires all
 *   timers that would have elapsed, in chronological order.
 * • `advanceTo(ms)` — sets the absolute timestamp (ms since epoch) and fires
 *   elapsed timers.
 * • All callbacks are invoked synchronously, so tests can assert on results
 *   immediately after calling `advance`.
 *
 * Usage
 * ─────
 * ```ts
 * import { FakeClock } from "@/src/mocks/fake-clock";
 *
 * const clock = new FakeClock(1_000); // start at t=1000 ms
 * const poller = new PollerRepo(myFakeScan, { clock });
 *
 * poller.start();
 * clock.advance(3_000); // fires the first scheduled tick
 * expect(scanCallCount).toBe(1);
 * ```
 */

import type { Clock } from "../poller";

interface TimerEntry {
  id: number;
  fireAt: number;
  fn: () => void;
  cancelled: boolean;
}

export class FakeClock implements Clock {
  private _now: number;
  private _nextId = 1;
  private _timers: TimerEntry[] = [];

  constructor(startMs = 0) {
    this._now = startMs;
  }

  // ── Clock interface ────────────────────────────────────────────────────────

  now(): number {
    return this._now;
  }

  setTimeout(fn: () => void, ms: number): number {
    const id = this._nextId++;
    this._timers.push({ id, fireAt: this._now + ms, fn, cancelled: false });
    // Keep timers sorted so advance() fires them in order
    this._timers.sort((a, b) => a.fireAt - b.fireAt);
    return id;
  }

  clearTimeout(handle: unknown): void {
    const entry = this._timers.find((t) => t.id === (handle as number));
    if (entry) entry.cancelled = true;
  }

  // ── Test helpers ───────────────────────────────────────────────────────────

  /** Current simulated timestamp (ms since epoch). */
  get currentMs(): number {
    return this._now;
  }

  /** Number of pending (non-cancelled) timers. */
  get pendingCount(): number {
    return this._timers.filter((t) => !t.cancelled).length;
  }

  /**
   * Advance simulated time by `deltaMs` milliseconds, firing all timers that
   * fall within the new window in chronological order.
   *
   * Timers scheduled *by* a fired callback (re-schedules) are also fired if
   * their `fireAt` falls within the advanced window.
   */
  advance(deltaMs: number): void {
    this.advanceTo(this._now + deltaMs);
  }

  /**
   * Set the simulated clock to `absoluteMs` and fire elapsed timers.
   * `absoluteMs` must be >= current time; going backwards is a no-op.
   *
   * Time is advanced incrementally — `_now` is set to each timer's `fireAt`
   * as it fires, so callbacks that schedule new timers see the correct `_now`
   * and newly scheduled timers falling within the window are also fired.
   */
  advanceTo(absoluteMs: number): void {
    if (absoluteMs < this._now) return;
    this._fireElapsed(absoluteMs);
    // Ensure _now lands exactly at the requested target even if no timer fired.
    this._now = absoluteMs;
  }

  /** Cancel all pending timers without firing them. */
  reset(): void {
    this._timers.forEach((t) => (t.cancelled = true));
    this._timers = [];
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  /**
   * Fire all timers whose `fireAt <= target`, advancing `_now` to each
   * timer's exact `fireAt` before calling its callback.  This ensures that
   * callbacks which schedule new timers see the correct simulated time, and
   * that newly added timers falling within [_now, target] are also fired.
   */
  private _fireElapsed(target: number): void {
    let safety = 0;
    while (safety++ < 10_000) {
      // Sort so we always fire the earliest eligible timer first.
      this._timers.sort((a, b) => a.fireAt - b.fireAt);
      const entry = this._timers.find((t) => !t.cancelled && t.fireAt <= target);
      if (!entry) break;
      // Advance _now to this timer's fire time before invoking the callback so
      // that any setTimeout calls inside the callback compute the correct fireAt.
      this._now = entry.fireAt;
      entry.cancelled = true;
      entry.fn();
    }
    // Purge fired/cancelled timers to keep the list small.
    this._timers = this._timers.filter((t) => !t.cancelled);
  }
}
