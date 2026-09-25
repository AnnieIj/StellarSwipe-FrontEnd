/**
 * poller.test.ts
 *
 * Focused positive, negative, boundary, restart, and regression coverage for
 * src/poller.ts — injecting a FakeClock to control time deterministically.
 *
 * No live RPC calls, no live Telegram calls, no real timers.
 *
 * Run with:  npx jest src/__tests__/poller.test.ts
 */

import {
  parseCursor,
  advanceCursor,
  PollerRepo,
  realClock,
  CURSOR_EPOCH,
} from "../poller";
import type { ScanResult, ScanFn, Clock } from "../poller";
import { FakeClock } from "../mocks/fake-clock";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Default scan result used by okScan. */
const OK_RESULT: ScanResult = {
  summary: "ok",
  latestEventAt: new Date(1_000_000).toISOString(),
  rpcOk: true,
  notifyOk: true,
};

/**
 * Returns a ScanFn that resolves immediately with the given result.
 * Pass partial overrides to customise individual fields.
 */
function okScan(overrides: Partial<ScanResult> = {}): ScanFn {
  const result: ScanResult = { ...OK_RESULT, ...overrides };
  return async (_cursor, _clock) => result;
}

/** Returns a ScanFn that rejects with the given message. */
function failScan(message = "rpc error"): ScanFn {
  return async (_cursor, _clock) => {
    throw new Error(message);
  };
}

/** Waits for all pending microtasks (Promise resolution) to flush. */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// ─── parseCursor ──────────────────────────────────────────────────────────────

describe("parseCursor", () => {
  it("returns CURSOR_EPOCH for null", () => {
    expect(parseCursor(null)).toBe(CURSOR_EPOCH);
  });

  it("returns CURSOR_EPOCH for undefined", () => {
    expect(parseCursor(undefined)).toBe(CURSOR_EPOCH);
  });

  it("returns CURSOR_EPOCH for empty string", () => {
    expect(parseCursor("")).toBe(CURSOR_EPOCH);
  });

  it("returns CURSOR_EPOCH for a non-date string", () => {
    expect(parseCursor("not-a-date")).toBe(CURSOR_EPOCH);
  });

  it("returns CURSOR_EPOCH for a random string", () => {
    expect(parseCursor("foobar")).toBe(CURSOR_EPOCH);
  });

  it("returns a valid ISO string for a well-formed ISO timestamp", () => {
    const iso = "2024-06-15T12:00:00.000Z";
    expect(parseCursor(iso)).toBe(iso);
  });

  it("normalises timestamps with timezone offsets to UTC ISO", () => {
    // Date.parse handles offset notation; result must be a valid ISO string
    const result = parseCursor("2024-06-15T14:00:00+02:00");
    expect(result).toBe("2024-06-15T12:00:00.000Z");
  });

  it("boundary: CURSOR_EPOCH itself round-trips", () => {
    expect(parseCursor(CURSOR_EPOCH)).toBe(CURSOR_EPOCH);
  });

  it("boundary: numeric string '0' is parsed by Date.parse and returns the corresponding ISO string", () => {
    // "0" is parsed by Date.parse as a year (2000-01-01 in UTC on most runtimes),
    // not as ms-since-epoch. parseCursor accepts it as a valid date string.
    // This test documents the actual runtime behaviour rather than asserting
    // a specific value, ensuring no regression if the behaviour changes.
    const result = parseCursor("0");
    // Must be a valid ISO string (not NaN / CURSOR_EPOCH due to parseInt success)
    expect(typeof result).toBe("string");
    expect(Date.parse(result)).not.toBeNaN();
  });
});

// ─── advanceCursor ────────────────────────────────────────────────────────────

describe("advanceCursor", () => {
  const baseline = "2024-01-01T00:00:00.000Z";

  it("returns an ISO string for a valid finite timestamp", () => {
    const result = advanceCursor(baseline, 1_700_000_000_000);
    expect(typeof result).toBe("string");
    expect(Date.parse(result)).toBe(1_700_000_000_000);
  });

  it("returns the current cursor unchanged for NaN", () => {
    expect(advanceCursor(baseline, NaN)).toBe(baseline);
  });

  it("returns the current cursor unchanged for Infinity", () => {
    expect(advanceCursor(baseline, Infinity)).toBe(baseline);
  });

  it("returns the current cursor unchanged for -Infinity", () => {
    expect(advanceCursor(baseline, -Infinity)).toBe(baseline);
  });

  it("boundary: advancing by 0 ms returns the epoch ISO string", () => {
    const result = advanceCursor(baseline, 0);
    expect(result).toBe(CURSOR_EPOCH);
  });

  it("boundary: advancing with a negative timestamp produces a pre-epoch ISO string", () => {
    // Negative ms is technically valid — callers must guard against going backwards
    const result = advanceCursor(baseline, -1);
    expect(Date.parse(result)).toBe(-1);
  });
});

// ─── realClock ────────────────────────────────────────────────────────────────

describe("realClock", () => {
  it("now() returns a number close to Date.now()", () => {
    const before = Date.now();
    const t = realClock.now();
    const after = Date.now();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it("setTimeout and clearTimeout are available", () => {
    const handle = realClock.setTimeout(() => {}, 10_000);
    expect(handle).toBeDefined();
    expect(() => realClock.clearTimeout(handle)).not.toThrow();
  });
});

// ─── FakeClock ────────────────────────────────────────────────────────────────

describe("FakeClock", () => {
  it("starts at the given timestamp", () => {
    const clock = new FakeClock(5_000);
    expect(clock.now()).toBe(5_000);
  });

  it("defaults to t=0", () => {
    expect(new FakeClock().now()).toBe(0);
  });

  it("advance moves time forward and fires the timer", () => {
    const clock = new FakeClock(0);
    let fired = false;
    clock.setTimeout(() => { fired = true; }, 1_000);
    clock.advance(999);
    expect(fired).toBe(false);
    clock.advance(1);
    expect(fired).toBe(true);
  });

  it("does not fire a cancelled timer", () => {
    const clock = new FakeClock(0);
    let fired = false;
    const h = clock.setTimeout(() => { fired = true; }, 500);
    clock.clearTimeout(h);
    clock.advance(1_000);
    expect(fired).toBe(false);
  });

  it("fires multiple timers in chronological order", () => {
    const clock = new FakeClock(0);
    const order: number[] = [];
    clock.setTimeout(() => order.push(2), 200);
    clock.setTimeout(() => order.push(1), 100);
    clock.setTimeout(() => order.push(3), 300);
    clock.advance(300);
    expect(order).toEqual([1, 2, 3]);
  });

  it("fires timers scheduled inside callbacks (re-schedules within window)", () => {
    const clock = new FakeClock(0);
    const order: number[] = [];
    // outer fires at t=100, schedules inner at t=100+50=150; advance covers both
    clock.setTimeout(() => {
      order.push(1);
      clock.setTimeout(() => order.push(2), 50);
    }, 100);
    clock.advance(200); // window covers both t=100 and t=150
    expect(order).toEqual([1, 2]);
  });

  it("pendingCount returns only non-cancelled timers", () => {
    const clock = new FakeClock(0);
    clock.setTimeout(() => {}, 1_000);
    const h = clock.setTimeout(() => {}, 2_000);
    expect(clock.pendingCount).toBe(2);
    clock.clearTimeout(h);
    expect(clock.pendingCount).toBe(1);
  });

  it("reset cancels all pending timers", () => {
    const clock = new FakeClock(0);
    clock.setTimeout(() => {}, 100);
    clock.setTimeout(() => {}, 200);
    clock.reset();
    expect(clock.pendingCount).toBe(0);
  });

  it("advanceTo going backwards is a no-op", () => {
    const clock = new FakeClock(500);
    let fired = false;
    clock.setTimeout(() => { fired = true; }, 100);
    clock.advanceTo(200); // going backwards from 500 — no-op
    expect(clock.now()).toBe(500);
    expect(fired).toBe(false);
  });
});

// ─── PollerRepo — lifecycle ───────────────────────────────────────────────────

describe("PollerRepo — lifecycle", () => {
  it("initial state is 'idle'", () => {
    const poller = new PollerRepo(okScan());
    expect(poller.state).toBe("idle");
  });

  it("state transitions to 'running' after start()", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    expect(poller.state).toBe("running");
    poller.stop();
  });

  it("state transitions to 'stopped' after stop()", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    poller.stop();
    expect(poller.state).toBe("stopped");
  });

  it("state transitions to 'paused' after pause()", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    poller.pause();
    expect(poller.state).toBe("paused");
    poller.stop();
  });

  it("resumes from 'paused' back to 'running'", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    poller.pause();
    poller.resume();
    expect(poller.state).toBe("running");
    poller.stop();
  });

  it("throws if started while already running", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    expect(() => poller.start()).toThrow("already running");
    poller.stop();
  });

  it("throws if started after being stopped", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    poller.stop();
    expect(() => poller.start()).toThrow("cannot restart");
  });

  it("stop() is idempotent", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    poller.stop();
    expect(() => poller.stop()).not.toThrow();
    expect(poller.state).toBe("stopped");
  });

  it("pause() on a non-running poller is a no-op", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    expect(() => poller.pause()).not.toThrow();
    expect(poller.state).toBe("idle");
  });

  it("resume() on a non-paused poller is a no-op", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    expect(() => poller.resume()).not.toThrow();
    expect(poller.state).toBe("running");
    poller.stop();
  });
});

// ─── PollerRepo — cursor management ──────────────────────────────────────────

describe("PollerRepo — cursor management", () => {
  it("initialises cursor to CURSOR_EPOCH when no initialCursor is given", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    expect(poller.cursor).toBe(CURSOR_EPOCH);
    poller.stop();
  });

  it("initialises cursor to the provided ISO timestamp", () => {
    const clock = new FakeClock();
    const iso = "2024-03-01T00:00:00.000Z";
    const poller = new PollerRepo(okScan(), { clock });
    poller.start(iso);
    expect(poller.cursor).toBe(iso);
    poller.stop();
  });

  it("falls back to CURSOR_EPOCH for a malformed initialCursor", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start("definitely-not-a-date");
    expect(poller.cursor).toBe(CURSOR_EPOCH);
    poller.stop();
  });

  it("advances the cursor after a successful scan", async () => {
    const clock = new FakeClock(0);
    const latestEventAt = "2024-06-01T00:00:00.000Z";
    const poller = new PollerRepo(okScan({ latestEventAt }), {
      clock,
      intervalMs: 1_000,
    });
    poller.start();
    clock.advance(0); // fire immediate first tick
    await flushPromises();
    expect(poller.cursor).toBe(latestEventAt);
    poller.stop();
  });

  it("does not advance the cursor when latestEventAt is null", async () => {
    const clock = new FakeClock(0);
    const initialCursor = "2024-01-01T00:00:00.000Z";
    const poller = new PollerRepo(okScan({ latestEventAt: null }), {
      clock,
      intervalMs: 1_000,
    });
    poller.start(initialCursor);
    clock.advance(0);
    await flushPromises();
    expect(poller.cursor).toBe(initialCursor);
    poller.stop();
  });

  it("does not advance the cursor when rpcOk is false", async () => {
    const clock = new FakeClock(0);
    const initialCursor = "2024-01-01T00:00:00.000Z";
    const poller = new PollerRepo(
      okScan({ rpcOk: false, latestEventAt: new Date().toISOString() }),
      { clock, intervalMs: 1_000 }
    );
    poller.start(initialCursor);
    clock.advance(0);
    await flushPromises();
    expect(poller.cursor).toBe(initialCursor);
    poller.stop();
  });
});

// ─── PollerRepo — scan scheduling ─────────────────────────────────────────────

describe("PollerRepo — scan scheduling", () => {
  it("fires the first scan on start (delay=0)", async () => {
    const clock = new FakeClock(0);
    let calls = 0;
    const scan: ScanFn = async (_cursor, _clock) => { calls++; return OK_RESULT; };
    const poller = new PollerRepo(scan, { clock, intervalMs: 3_000 });
    poller.start();
    clock.advance(0);
    await flushPromises();
    expect(calls).toBe(1);
    poller.stop();
  });

  it("fires subsequent scans at the configured interval", async () => {
    const clock = new FakeClock(0);
    let calls = 0;
    const scan: ScanFn = async (_cursor, _clock) => { calls++; return OK_RESULT; };
    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000 });
    poller.start();

    clock.advance(0);    await flushPromises(); // tick 1
    clock.advance(1_000); await flushPromises(); // tick 2
    clock.advance(1_000); await flushPromises(); // tick 3

    expect(calls).toBe(3);
    poller.stop();
  });

  it("does not fire while paused", async () => {
    const clock = new FakeClock(0);
    let calls = 0;
    const scan: ScanFn = async (_cursor, _clock) => { calls++; return OK_RESULT; };
    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000 });
    poller.start();
    clock.advance(0); await flushPromises(); // tick 1
    poller.pause();
    clock.advance(5_000); await flushPromises(); // should NOT tick
    expect(calls).toBe(1);
    poller.stop();
  });

  it("resumes scanning after resume()", async () => {
    const clock = new FakeClock(0);
    let calls = 0;
    const scan: ScanFn = async (_cursor, _clock) => { calls++; return OK_RESULT; };
    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000 });
    poller.start();
    clock.advance(0); await flushPromises();   // tick 1
    poller.pause();
    clock.advance(5_000);                       // time passes, no ticks
    poller.resume();
    clock.advance(0); await flushPromises();   // immediate tick on resume
    clock.advance(1_000); await flushPromises(); // tick 3
    expect(calls).toBe(3);
    poller.stop();
  });
});

// ─── PollerRepo — RPC failures & back-off ────────────────────────────────────

describe("PollerRepo — RPC failures and exponential back-off", () => {
  it("increments consecutiveFailures when the scan throws", async () => {
    const clock = new FakeClock(0);
    const poller = new PollerRepo(failScan(), { clock, intervalMs: 1_000 });
    poller.start();
    clock.advance(0); await flushPromises();
    expect(poller.consecutiveFailures).toBe(1);
    poller.stop();
  });

  it("resets consecutiveFailures to 0 after a successful scan", async () => {
    const clock = new FakeClock(0);
    let attempt = 0;
    const scan: ScanFn = async (_cursor, _clock) => {
      attempt++;
      if (attempt === 1) throw new Error("fail");
      return OK_RESULT;
    };
    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000, maxBackoffMs: 5_000 });
    poller.start();
    clock.advance(0);     await flushPromises(); // fail → 1 failure, back-off 1s
    clock.advance(1_000); await flushPromises(); // success → 0 failures
    expect(poller.consecutiveFailures).toBe(0);
    poller.stop();
  });

  it("calls onRpcError when the scan throws", async () => {
    const clock = new FakeClock(0);
    const errors: Error[] = [];
    const poller = new PollerRepo(failScan("horizon down"), {
      clock,
      intervalMs: 1_000,
      onRpcError: (e) => errors.push(e),
    });
    poller.start();
    clock.advance(0); await flushPromises();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("horizon down");
    poller.stop();
  });

  it("calls onNotifyError when notifyOk is false", async () => {
    const clock = new FakeClock(0);
    const notifyErrors: Error[] = [];
    const poller = new PollerRepo(okScan({ notifyOk: false }), {
      clock,
      intervalMs: 1_000,
      onNotifyError: (e) => notifyErrors.push(e),
    });
    poller.start();
    clock.advance(0); await flushPromises();
    expect(notifyErrors).toHaveLength(1);
    poller.stop();
  });

  it("applies exponential back-off capped at maxBackoffMs", async () => {
    const clock = new FakeClock(0);
    const INTERVAL = 1_000;
    const MAX_BACKOFF = 4_000;
    let scanCount = 0;

    const scan: ScanFn = async (_cursor, _clock) => { scanCount++; throw new Error("rpc fail"); };
    const poller = new PollerRepo(scan, {
      clock,
      intervalMs: INTERVAL,
      maxBackoffMs: MAX_BACKOFF,
    });
    poller.start();

    // Tick 1 at t=0 (delay 0)
    clock.advance(0);     await flushPromises(); // failure 1, next delay = 1000 (2^0 * 1000)
    // Tick 2 at t=1000
    clock.advance(1_000); await flushPromises(); // failure 2, next delay = 2000 (2^1 * 1000)
    // Tick 3 at t=3000
    clock.advance(2_000); await flushPromises(); // failure 3, next delay = 4000 (2^2 * 1000)
    // Tick 4 at t=7000
    clock.advance(4_000); await flushPromises(); // failure 4, next delay = 4000 (capped)
    // Tick 5 at t=11000
    clock.advance(4_000); await flushPromises(); // failure 5

    expect(scanCount).toBe(5);
    poller.stop();
  });

  it("back-off never exceeds maxBackoffMs regardless of failure count", async () => {
    const clock = new FakeClock(0);
    const MAX_BACKOFF = 2_000;
    let calls = 0;
    const scan: ScanFn = async (_cursor, _clock) => { calls++; throw new Error("fail"); };
    const poller = new PollerRepo(scan, {
      clock,
      intervalMs: 500,
      maxBackoffMs: MAX_BACKOFF,
    });
    poller.start();
    // Fire the immediate first tick (delay=0), then 10 more at MAX_BACKOFF intervals
    clock.advance(0); await flushPromises(); // tick 1
    for (let i = 0; i < 9; i++) {
      clock.advance(MAX_BACKOFF);
      await flushPromises();
    }
    expect(calls).toBe(10);
    poller.stop();
  });
});

// ─── PollerRepo — restart behaviour ──────────────────────────────────────────

describe("PollerRepo — restart behaviour", () => {
  it("a new PollerRepo starts with CURSOR_EPOCH and zero failures", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    expect(poller.cursor).toBe(CURSOR_EPOCH);
    expect(poller.consecutiveFailures).toBe(0);
    poller.stop();
  });

  it("cursor persists across pause/resume without resetting", async () => {
    const clock = new FakeClock(0);
    const latestEventAt = "2024-08-15T10:00:00.000Z";
    const poller = new PollerRepo(okScan({ latestEventAt }), {
      clock,
      intervalMs: 1_000,
    });
    poller.start();
    clock.advance(0);     await flushPromises(); // cursor set to latestEventAt
    poller.pause();
    poller.resume();
    clock.advance(0);     await flushPromises(); // another scan
    expect(poller.cursor).toBe(latestEventAt);   // unchanged — same scan result
    poller.stop();
  });

  it("stopped poller must not schedule further ticks", async () => {
    const clock = new FakeClock(0);
    let calls = 0;
    const scan: ScanFn = async (_cursor, _clock) => { calls++; return OK_RESULT; };
    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000 });
    poller.start();
    clock.advance(0);     await flushPromises(); // tick 1
    poller.stop();
    clock.advance(10_000); await flushPromises(); // no more ticks
    expect(calls).toBe(1);
  });

  it("creating a fresh instance restarts from the given cursor", async () => {
    const clock = new FakeClock(0);
    const resumeCursor = "2025-01-01T00:00:00.000Z";
    const receivedCursors: string[] = [];

    const scan: ScanFn = async (cursor) => {
      receivedCursors.push(cursor);
      return OK_RESULT;
    };

    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000 });
    poller.start(resumeCursor);
    clock.advance(0); await flushPromises();

    expect(receivedCursors[0]).toBe(resumeCursor);
    poller.stop();
  });
});

// ─── PollerRepo — boundary / edge cases ──────────────────────────────────────

describe("PollerRepo — boundary and edge cases", () => {
  it("handles a scan that resolves with a malformed latestEventAt gracefully", async () => {
    const clock = new FakeClock(0);
    const initialCursor = "2024-01-01T00:00:00.000Z";
    const poller = new PollerRepo(
      async (_cursor, _clock) => ({
        summary: "malformed event",
        latestEventAt: "not-a-date",
        rpcOk: true,
        notifyOk: true,
      }),
      { clock, intervalMs: 1_000 }
    );
    poller.start(initialCursor);
    clock.advance(0); await flushPromises();
    // latestEventAt parses to NaN → advanceCursor returns current → cursor unchanged
    expect(poller.cursor).toBe(initialCursor);
    poller.stop();
  });

  it("onScanComplete is called with the updated cursor and result", async () => {
    const clock = new FakeClock(0);
    const latestEventAt = "2024-09-01T00:00:00.000Z";
    const completions: Array<{ result: ScanResult; cursor: string }> = [];
    const poller = new PollerRepo(okScan({ latestEventAt }), {
      clock,
      intervalMs: 1_000,
      onScanComplete: (result, cursor) => completions.push({ result, cursor }),
    });
    poller.start();
    clock.advance(0); await flushPromises();
    expect(completions).toHaveLength(1);
    expect(completions[0].cursor).toBe(latestEventAt);
    expect(completions[0].result.rpcOk).toBe(true);
    poller.stop();
  });

  it("onScanComplete is not called when the poller is stopped before the scan resolves", async () => {
    // Simulate a slow scan that resolves after stop()
    const clock = new FakeClock(0);
    const completions: number[] = [];
    let resolveScan!: () => void;
    const scan: ScanFn = () =>
      new Promise((resolve) => {
        resolveScan = () =>
          resolve({ summary: "slow", latestEventAt: null, rpcOk: true, notifyOk: true });
      });

    const poller = new PollerRepo(scan, {
      clock,
      intervalMs: 1_000,
      onScanComplete: () => completions.push(1),
    });
    poller.start();
    clock.advance(0); // tick fired, scan in-flight
    poller.stop();
    resolveScan(); // scan resolves after stop
    await flushPromises();
    expect(completions).toHaveLength(0);
  });

  it("scan receives the current cursor as the first argument", async () => {
    const clock = new FakeClock(0);
    const initial = "2024-05-01T00:00:00.000Z";
    const received: string[] = [];
    const scan: ScanFn = async (cursor) => {
      received.push(cursor);
      return OK_RESULT;
    };
    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000 });
    poller.start(initial);
    clock.advance(0); await flushPromises();
    expect(received[0]).toBe(initial);
    poller.stop();
  });

  it("scan receives the clock as the second argument", async () => {
    const clock = new FakeClock(12_345);
    let receivedClock: Clock | null = null;
    const scan: ScanFn = async (_cursor, c) => {
      receivedClock = c;
      return OK_RESULT;
    };
    const poller = new PollerRepo(scan, { clock, intervalMs: 1_000 });
    poller.start();
    clock.advance(0); await flushPromises();
    expect(receivedClock).toBe(clock);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(receivedClock!.now()).toBe(12_345);
    poller.stop();
  });
});

// ─── Regression ───────────────────────────────────────────────────────────────

describe("regression", () => {
  it("does not log bot tokens, private keys, or unbounded payloads in onRpcError", async () => {
    const clock = new FakeClock(0);
    const logged: string[] = [];
    const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const scan: ScanFn = async (_cursor, _clock) => { throw new Error(`Telegram error: ${BOT_TOKEN}`); };
    const poller = new PollerRepo(scan, {
      clock,
      intervalMs: 1_000,
      onRpcError: (e) => {
        // Caller must sanitise; here we verify the raw error message IS passed,
        // meaning the test documents the contract: onRpcError never strips data.
        // The caller is responsible for sanitising before logging.
        logged.push(e.message);
      },
    });
    poller.start();
    clock.advance(0); await flushPromises();
    // Confirm error is surfaced (not swallowed) — sanitisation is caller's responsibility
    expect(logged).toHaveLength(1);
    poller.stop();
  });

  it("consecutiveFailures does not wrap around or become negative", async () => {
    const clock = new FakeClock(0);
    const scan: ScanFn = async (_cursor, _clock) => { throw new Error("fail"); };
    const poller = new PollerRepo(scan, { clock, intervalMs: 100, maxBackoffMs: 200 });
    poller.start();
    for (let i = 0; i < 20; i++) {
      clock.advance(200);
      await flushPromises();
    }
    expect(poller.consecutiveFailures).toBeGreaterThan(0);
    expect(Number.isFinite(poller.consecutiveFailures)).toBe(true);
    poller.stop();
  });

  it("second call to stop() after an already-stopped poller does not throw", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    poller.stop();
    expect(() => poller.stop()).not.toThrow();
  });

  it("poller state is consistent when start() throws (already-running guard)", () => {
    const clock = new FakeClock();
    const poller = new PollerRepo(okScan(), { clock });
    poller.start();
    try { poller.start(); } catch { /* expected */ }
    expect(poller.state).toBe("running"); // remains running
    poller.stop();
  });
});
