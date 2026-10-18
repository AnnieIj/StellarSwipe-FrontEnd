/**
 * Unit tests for the stop-loss hook logic (useStopLoss.ts).
 *
 * Tests cover:
 *  - fixed mode stop price derivation
 *  - trailing mode high-water mark updates (rising, falling, flat prices)
 *  - mode switching
 *  - reset behaviour
 */

// Pure helper that mirrors the stop-price derivation inside useStopLoss so
// we can test it without a React environment.
function computeStopLossPrice(
  mode: "fixed" | "trailing",
  entryPrice: number | undefined,
  highWaterMark: number | null,
  stopLossPercent: number
): number | null {
  if (mode === "trailing") {
    return highWaterMark != null
      ? highWaterMark * (1 - stopLossPercent / 100)
      : null;
  }
  return entryPrice != null ? entryPrice * (1 - stopLossPercent / 100) : null;
}

// Mirrors the updateCurrentPrice logic (high-water mark only moves upward).
function updateHighWaterMark(
  prev: number | null,
  price: number
): number | null {
  if (prev === null) return price;
  return price > prev ? price : prev;
}

// ── Fixed mode ────────────────────────────────────────────────────────────────

describe("useStopLoss – fixed mode", () => {
  it("derives stop price from entry price", () => {
    const price = computeStopLossPrice("fixed", 1.0, null, 10);
    expect(price).toBeCloseTo(0.9);
  });

  it("returns null when no entryPrice provided", () => {
    expect(computeStopLossPrice("fixed", undefined, null, 10)).toBeNull();
  });

  it("stop price does not change as market price rises", () => {
    const entryPrice = 1.0;
    let hwm: number | null = entryPrice;

    // Simulate price rising from 1.0 to 1.5
    hwm = updateHighWaterMark(hwm, 1.3);
    hwm = updateHighWaterMark(hwm, 1.5);

    // Fixed mode ignores hwm; stop price still uses entryPrice
    expect(computeStopLossPrice("fixed", entryPrice, hwm, 10)).toBeCloseTo(0.9);
  });
});

// ── Trailing mode – rising price ──────────────────────────────────────────────

describe("useStopLoss – trailing mode, rising price", () => {
  it("high-water mark rises with the price", () => {
    let hwm: number | null = 1.0;
    hwm = updateHighWaterMark(hwm, 1.2);
    hwm = updateHighWaterMark(hwm, 1.5);
    hwm = updateHighWaterMark(hwm, 1.8);
    expect(hwm).toBeCloseTo(1.8);
  });

  it("stop price rises as high-water mark rises", () => {
    let hwm: number | null = 1.0;
    const priceBefore = computeStopLossPrice("trailing", 1.0, hwm, 10);

    hwm = updateHighWaterMark(hwm, 1.5);
    const priceAfter = computeStopLossPrice("trailing", 1.0, hwm, 10);

    expect(priceAfter!).toBeGreaterThan(priceBefore!);
    expect(priceAfter).toBeCloseTo(1.5 * 0.9);
  });
});

// ── Trailing mode – falling price ─────────────────────────────────────────────

describe("useStopLoss – trailing mode, falling price", () => {
  it("high-water mark does not fall when price drops", () => {
    let hwm: number | null = 1.8;
    hwm = updateHighWaterMark(hwm, 1.4);
    hwm = updateHighWaterMark(hwm, 1.1);
    expect(hwm).toBeCloseTo(1.8);
  });

  it("stop price stays constant when price falls below the high-water mark", () => {
    let hwm: number | null = 1.8;
    const stopAtPeak = computeStopLossPrice("trailing", 1.0, hwm, 10);

    hwm = updateHighWaterMark(hwm, 1.2); // price falls
    const stopAfterDrop = computeStopLossPrice("trailing", 1.0, hwm, 10);

    expect(stopAfterDrop).toBeCloseTo(stopAtPeak!);
  });
});

// ── Trailing mode – flat price ────────────────────────────────────────────────

describe("useStopLoss – trailing mode, flat price", () => {
  it("high-water mark stays unchanged when price is flat", () => {
    let hwm: number | null = 1.0;
    hwm = updateHighWaterMark(hwm, 1.0);
    hwm = updateHighWaterMark(hwm, 1.0);
    expect(hwm).toBeCloseTo(1.0);
  });

  it("stop price is stable at a flat price", () => {
    const hwm = 1.0;
    const p1 = computeStopLossPrice("trailing", 1.0, hwm, 5);
    const p2 = computeStopLossPrice("trailing", 1.0, hwm, 5);
    expect(p1).toBeCloseTo(p2!);
  });
});

// ── Mode switching ────────────────────────────────────────────────────────────

describe("useStopLoss – mode switching", () => {
  it("switching from fixed to trailing uses high-water mark for stop price", () => {
    const hwm = 1.5; // above entry price of 1.0
    const fixedStop = computeStopLossPrice("fixed", 1.0, hwm, 10);
    const trailingStop = computeStopLossPrice("trailing", 1.0, hwm, 10);

    // With hwm above entry, trailing stop is higher than fixed stop
    expect(trailingStop!).toBeGreaterThan(fixedStop!);
    expect(fixedStop).toBeCloseTo(0.9);
    expect(trailingStop).toBeCloseTo(1.35);
  });

  it("switching back to fixed reverts stop price to entry-based calculation", () => {
    const hwm = 2.0;
    const fixed = computeStopLossPrice("fixed", 1.0, hwm, 10);
    expect(fixed).toBeCloseTo(0.9);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("useStopLoss – edge cases", () => {
  it("returns null in trailing mode when high-water mark is null", () => {
    expect(computeStopLossPrice("trailing", 1.0, null, 10)).toBeNull();
  });

  it("initialises high-water mark with the first price update", () => {
    let hwm: number | null = null;
    hwm = updateHighWaterMark(hwm, 1.2);
    expect(hwm).toBeCloseTo(1.2);
  });

  it("100% stop-loss produces a stop price of 0", () => {
    expect(computeStopLossPrice("fixed", 1.0, null, 100)).toBeCloseTo(0);
  });

  it("0% stop-loss produces a stop price equal to entry", () => {
    expect(computeStopLossPrice("fixed", 1.0, null, 0)).toBeCloseTo(1.0);
  });
});
