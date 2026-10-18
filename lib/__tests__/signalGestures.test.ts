import {
  computeTintOpacity,
  classifyArrowKey,
  TINT_THRESHOLD,
  MAX_TINT_OPACITY,
} from "@/lib/signalGestures";

// ── #319: drag-direction color tint overlay ───────────────────────────────────

describe("computeTintOpacity – overlay opacity tracks drag distance", () => {
  it("is fully transparent at rest", () => {
    expect(computeTintOpacity(0)).toEqual({ green: 0, red: 0 });
  });

  it("tints green (not red) when dragged right", () => {
    const { green, red } = computeTintOpacity(TINT_THRESHOLD / 2);
    expect(green).toBeGreaterThan(0);
    expect(red).toBe(0);
  });

  it("tints red (not green) when dragged left", () => {
    const { green, red } = computeTintOpacity(-TINT_THRESHOLD / 2);
    expect(red).toBeGreaterThan(0);
    expect(green).toBe(0);
  });

  it("green opacity increases monotonically with rightward drag distance", () => {
    const near = computeTintOpacity(20).green;
    const mid = computeTintOpacity(60).green;
    const far = computeTintOpacity(100).green;
    expect(mid).toBeGreaterThan(near);
    expect(far).toBeGreaterThan(mid);
  });

  it("red opacity increases monotonically with leftward drag distance", () => {
    const near = computeTintOpacity(-20).red;
    const mid = computeTintOpacity(-60).red;
    const far = computeTintOpacity(-100).red;
    expect(mid).toBeGreaterThan(near);
    expect(far).toBeGreaterThan(mid);
  });

  it("reaches max opacity at the threshold", () => {
    expect(computeTintOpacity(TINT_THRESHOLD).green).toBeCloseTo(
      MAX_TINT_OPACITY
    );
    expect(computeTintOpacity(-TINT_THRESHOLD).red).toBeCloseTo(
      MAX_TINT_OPACITY
    );
  });

  it("clamps at max opacity past the threshold", () => {
    expect(computeTintOpacity(TINT_THRESHOLD * 5).green).toBeCloseTo(
      MAX_TINT_OPACITY
    );
    expect(computeTintOpacity(-TINT_THRESHOLD * 5).red).toBeCloseTo(
      MAX_TINT_OPACITY
    );
  });

  it("honours a configurable threshold", () => {
    // Halving the threshold doubles the opacity at a given offset (until clamped).
    const standard = computeTintOpacity(30, 120).green;
    const tighter = computeTintOpacity(30, 60).green;
    expect(tighter).toBeCloseTo(standard * 2);
  });

  it("resets to zero opacity on release (offset returns to 0)", () => {
    expect(computeTintOpacity(0)).toEqual({ green: 0, red: 0 });
  });
});

// ── #320: keyboard arrow-key alternative to swipe ─────────────────────────────

describe("classifyArrowKey – arrow keys mirror swipe actions on a focused card", () => {
  it("maps right-arrow to the trade (swipe-right) action", () => {
    expect(classifyArrowKey("ArrowRight", true)).toBe("trade");
  });

  it("maps left-arrow to the pass (swipe-left) action", () => {
    expect(classifyArrowKey("ArrowLeft", true)).toBe("pass");
  });

  it("right-arrow still trades even when the pass action is hidden", () => {
    expect(classifyArrowKey("ArrowRight", false)).toBe("trade");
  });

  it("left-arrow is a no-op when the pass action is hidden", () => {
    expect(classifyArrowKey("ArrowLeft", false)).toBe("none");
  });

  it("ignores unrelated keys so page-level shortcuts are not hijacked", () => {
    expect(classifyArrowKey("ArrowUp", true)).toBe("none");
    expect(classifyArrowKey("ArrowDown", true)).toBe("none");
    expect(classifyArrowKey("a", true)).toBe("none");
    expect(classifyArrowKey("Tab", true)).toBe("none");
  });
});

// ── classifyArrowKeyWithSettings – swapDirections support ─────────────────────

import { classifyArrowKeyWithSettings } from "@/lib/signalGestures";

describe("classifyArrowKeyWithSettings – default (swapDirections=false)", () => {
  it("behaves identically to classifyArrowKey when swapDirections is false", () => {
    expect(classifyArrowKeyWithSettings("ArrowRight", true, false)).toBe(
      "trade"
    );
    expect(classifyArrowKeyWithSettings("ArrowLeft", true, false)).toBe("pass");
    expect(classifyArrowKeyWithSettings("ArrowLeft", false, false)).toBe(
      "none"
    );
    expect(classifyArrowKeyWithSettings("ArrowUp", true, false)).toBe("none");
  });
});

describe("classifyArrowKeyWithSettings – swapped (swapDirections=true)", () => {
  it("maps ArrowRight to pass when directions are swapped", () => {
    expect(classifyArrowKeyWithSettings("ArrowRight", true, true)).toBe("pass");
  });

  it("maps ArrowLeft to trade when directions are swapped", () => {
    expect(classifyArrowKeyWithSettings("ArrowLeft", true, true)).toBe("trade");
  });

  it("ArrowLeft still trades even when pass action is hidden (left=trade in swapped mode)", () => {
    expect(classifyArrowKeyWithSettings("ArrowLeft", false, true)).toBe(
      "trade"
    );
  });

  it("ArrowRight is a no-op (pass) when pass action is hidden and directions are swapped", () => {
    // pass is disabled, so ArrowRight→pass should be none
    expect(classifyArrowKeyWithSettings("ArrowRight", false, true)).toBe(
      "none"
    );
  });

  it("ignores unrelated keys even when directions are swapped", () => {
    expect(classifyArrowKeyWithSettings("ArrowUp", true, true)).toBe("none");
    expect(classifyArrowKeyWithSettings("ArrowDown", true, true)).toBe("none");
    expect(classifyArrowKeyWithSettings("Enter", true, true)).toBe("none");
  });
});
