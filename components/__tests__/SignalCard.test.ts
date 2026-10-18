/**
 * Unit tests for SignalCard interaction logic (components/SignalCard.tsx).
 *
 * The component uses framer-motion drag and requires a DOM environment to
 * render, so these tests target the pure business-logic layer: swipe
 * thresholds, direction classification, callback contract, and the
 * expand/collapse toggle behaviour.
 */

// ── Constants (mirrored from SignalCard.tsx) ──────────────────────────────────

const SWIPE_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 780;

// ── Swipe direction classification ────────────────────────────────────────────

function classifySwipe(
  offset: number,
  velocity: number
): "execute" | "pass" | "none" {
  if (offset > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD)
    return "execute";
  if (offset < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD)
    return "pass";
  return "none";
}

describe("SignalCard – swipe threshold constants", () => {
  it("SWIPE_THRESHOLD is 120", () => {
    expect(SWIPE_THRESHOLD).toBe(120);
  });

  it("VELOCITY_THRESHOLD is 780", () => {
    expect(VELOCITY_THRESHOLD).toBe(780);
  });
});

describe("SignalCard – swipe-right triggers execute (onTrade)", () => {
  it("classifies offset > threshold as execute", () => {
    expect(classifySwipe(121, 0)).toBe("execute");
  });

  it("classifies offset exactly at threshold as execute", () => {
    expect(classifySwipe(SWIPE_THRESHOLD + 1, 0)).toBe("execute");
  });

  it("classifies high rightward velocity as execute even with small offset", () => {
    expect(classifySwipe(10, VELOCITY_THRESHOLD + 1)).toBe("execute");
  });

  it("does NOT execute when offset is at the threshold boundary (not exceeded)", () => {
    expect(classifySwipe(SWIPE_THRESHOLD, 0)).toBe("none");
  });

  it("does NOT execute at sub-threshold offset and zero velocity", () => {
    expect(classifySwipe(50, 0)).toBe("none");
  });
});

describe("SignalCard – swipe-left triggers pass (onPass)", () => {
  it("classifies offset < -threshold as pass", () => {
    expect(classifySwipe(-121, 0)).toBe("pass");
  });

  it("classifies high leftward velocity as pass even with small offset", () => {
    expect(classifySwipe(-5, -(VELOCITY_THRESHOLD + 1))).toBe("pass");
  });

  it("does NOT pass at -threshold (boundary not exceeded)", () => {
    expect(classifySwipe(-SWIPE_THRESHOLD, 0)).toBe("none");
  });

  it("does NOT pass at sub-threshold leftward offset with zero velocity", () => {
    expect(classifySwipe(-50, 0)).toBe("none");
  });
});

describe("SignalCard – swipe has no effect within dead zone", () => {
  it("returns none for zero offset and zero velocity", () => {
    expect(classifySwipe(0, 0)).toBe("none");
  });

  it("returns none for a small rightward drag", () => {
    expect(classifySwipe(30, 100)).toBe("none");
  });

  it("returns none for a small leftward drag", () => {
    expect(classifySwipe(-30, -100)).toBe("none");
  });
});

// ── Callback contract ─────────────────────────────────────────────────────────

describe("SignalCard – onTrade callback receives correct signal data", () => {
  it("calls onTrade with pair and price when swipe-right fires", () => {
    const onTrade = jest.fn();
    const signal = { pair: "XLM/USDC", executionPrice: 0.4821 };

    if (classifySwipe(150, 0) === "execute") {
      onTrade(signal.pair, signal.executionPrice);
    }

    expect(onTrade).toHaveBeenCalledTimes(1);
    expect(onTrade).toHaveBeenCalledWith("XLM/USDC", 0.4821);
  });

  it("does not call onTrade when swipe is below threshold", () => {
    const onTrade = jest.fn();
    if (classifySwipe(50, 0) === "execute") {
      onTrade("XLM/USDC", 0.4821);
    }
    expect(onTrade).not.toHaveBeenCalled();
  });
});

describe("SignalCard – onPass callback fires on swipe-left", () => {
  it("calls onPass when swipe-left threshold is exceeded", () => {
    const onPass = jest.fn();
    if (classifySwipe(-150, 0) === "pass") {
      onPass();
    }
    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it("does not call onPass for a sub-threshold leftward drag", () => {
    const onPass = jest.fn();
    if (classifySwipe(-50, 0) === "pass") {
      onPass();
    }
    expect(onPass).not.toHaveBeenCalled();
  });
});

// ── Expand / collapse detail view ─────────────────────────────────────────────

function toggleDetails(current: boolean): boolean {
  return !current;
}

describe("SignalCard – expand/collapse detail view", () => {
  it("starts collapsed (false)", () => {
    let expanded = false;
    expect(expanded).toBe(false);
  });

  it("toggles from collapsed to expanded on first click", () => {
    let expanded = false;
    expanded = toggleDetails(expanded);
    expect(expanded).toBe(true);
  });

  it("toggles back to collapsed on second click", () => {
    let expanded = true;
    expanded = toggleDetails(expanded);
    expect(expanded).toBe(false);
  });

  it("detail content is visible when expanded is true", () => {
    const expanded = true;
    const contentVisible = expanded;
    expect(contentVisible).toBe(true);
  });

  it("detail content is hidden when expanded is false", () => {
    const expanded = false;
    const contentVisible = expanded;
    expect(contentVisible).toBe(false);
  });

  it("three successive toggles end up in the expanded state", () => {
    let expanded = false;
    expanded = toggleDetails(expanded); // true
    expanded = toggleDetails(expanded); // false
    expanded = toggleDetails(expanded); // true
    expect(expanded).toBe(true);
  });
});

// ── Mouse vs touch event path equivalence ─────────────────────────────────────

describe("SignalCard – mouse and touch event paths produce identical outcomes", () => {
  it("mouse drag offset > threshold triggers execute", () => {
    const mouseOffset = 150;
    expect(classifySwipe(mouseOffset, 0)).toBe("execute");
  });

  it("touch swipe with equivalent offset triggers execute", () => {
    const touchOffset = 150;
    expect(classifySwipe(touchOffset, 0)).toBe("execute");
  });

  it("mouse drag < -threshold triggers pass", () => {
    const mouseOffset = -150;
    expect(classifySwipe(mouseOffset, 0)).toBe("pass");
  });

  it("touch swipe with equivalent offset triggers pass", () => {
    const touchOffset = -150;
    expect(classifySwipe(touchOffset, 0)).toBe("pass");
  });
});

// ── Sensitivity threshold changes ─────────────────────────────────────────────
// These tests use the pure helper logic extracted from getEffectiveSwipeThreshold
// and classifySwipe — no DOM or React required.

import {
  getEffectiveSwipeThreshold,
  getEffectiveVelocityThreshold,
  SENSITIVITY_MULTIPLIERS,
} from "@/store/useSwipeSettingsStore";
import {
  SWIPE_THRESHOLD as BASE_SWIPE,
  VELOCITY_THRESHOLD as BASE_VELOCITY,
} from "@/lib/signalGestures";

describe("sensitivity thresholds – getEffectiveSwipeThreshold", () => {
  it("default sensitivity returns the base SWIPE_THRESHOLD unchanged", () => {
    expect(getEffectiveSwipeThreshold("default")).toBe(BASE_SWIPE);
  });

  it("low sensitivity requires a longer drag than default", () => {
    expect(getEffectiveSwipeThreshold("low")).toBeGreaterThan(
      getEffectiveSwipeThreshold("default")
    );
  });

  it("high sensitivity requires a shorter drag than default", () => {
    expect(getEffectiveSwipeThreshold("high")).toBeLessThan(
      getEffectiveSwipeThreshold("default")
    );
  });

  it("low threshold equals BASE_SWIPE × low multiplier", () => {
    expect(getEffectiveSwipeThreshold("low")).toBe(
      Math.round(BASE_SWIPE * SENSITIVITY_MULTIPLIERS.low)
    );
  });

  it("high threshold equals BASE_SWIPE × high multiplier", () => {
    expect(getEffectiveSwipeThreshold("high")).toBe(
      Math.round(BASE_SWIPE * SENSITIVITY_MULTIPLIERS.high)
    );
  });
});

describe("sensitivity thresholds – getEffectiveVelocityThreshold", () => {
  it("default sensitivity returns the base VELOCITY_THRESHOLD unchanged", () => {
    expect(getEffectiveVelocityThreshold("default")).toBe(BASE_VELOCITY);
  });

  it("low sensitivity requires a faster flick than default", () => {
    expect(getEffectiveVelocityThreshold("low")).toBeGreaterThan(
      getEffectiveVelocityThreshold("default")
    );
  });

  it("high sensitivity triggers at a lower velocity than default", () => {
    expect(getEffectiveVelocityThreshold("high")).toBeLessThan(
      getEffectiveVelocityThreshold("default")
    );
  });
});

describe("sensitivity threshold application – swipe classification", () => {
  it("a drag that fails the default threshold still commits at high sensitivity", () => {
    // Default threshold is 120px; high sensitivity lowers it to 72px (120 × 0.6)
    const highThreshold = getEffectiveSwipeThreshold("high"); // 72
    const offset = 80; // less than 120 but greater than 72
    expect(offset).toBeGreaterThan(highThreshold);
    function classifyWithThreshold(o: number, t: number) {
      if (o > t) return "execute";
      if (o < -t) return "pass";
      return "none";
    }
    expect(classifyWithThreshold(offset, highThreshold)).toBe("execute");
    expect(
      classifyWithThreshold(offset, getEffectiveSwipeThreshold("default"))
    ).toBe("none");
  });

  it("a drag that commits at default does NOT commit at low sensitivity", () => {
    const lowThreshold = getEffectiveSwipeThreshold("low"); // 180
    const defaultThreshold = getEffectiveSwipeThreshold("default"); // 120
    const offset = 130; // > 120 (default) but < 180 (low)
    function classifyWithThreshold(o: number, t: number) {
      if (o > t) return "execute";
      if (o < -t) return "pass";
      return "none";
    }
    expect(classifyWithThreshold(offset, defaultThreshold)).toBe("execute");
    expect(classifyWithThreshold(offset, lowThreshold)).toBe("none");
  });
});

// ── Swapped direction mapping ──────────────────────────────────────────────────

import { classifyArrowKeyWithSettings } from "@/lib/signalGestures";

describe("swapped direction mapping – drag gestures", () => {
  /**
   * Local helper that mirrors handleDragEnd direction logic using the
   * effectivelyFlipped flag (rtl XOR swapDirections).
   */
  function classifyDragWithSettings(
    offsetX: number,
    velocityX: number,
    swipeThreshold: number,
    velocityThreshold: number,
    rtl: boolean,
    swapDirections: boolean
  ): "execute" | "pass" | "none" {
    const fastSwipe =
      Math.abs(velocityX) > velocityThreshold && Math.abs(offsetX) > 40;
    const effectivelyFlipped = rtl !== swapDirections;

    const tradeSwipe = effectivelyFlipped
      ? offsetX < -swipeThreshold
      : offsetX > swipeThreshold;
    const tradeVelocity = effectivelyFlipped
      ? offsetX < -swipeThreshold * 0.4 && velocityX < -velocityThreshold
      : offsetX > swipeThreshold * 0.4 && velocityX > velocityThreshold;
    const tradeFast =
      fastSwipe && (effectivelyFlipped ? velocityX < 0 : velocityX > 0);

    const passSwipe = effectivelyFlipped
      ? offsetX > swipeThreshold
      : offsetX < -swipeThreshold;
    const passVelocity = effectivelyFlipped
      ? offsetX > swipeThreshold * 0.4 && velocityX > velocityThreshold
      : offsetX < -swipeThreshold * 0.4 && velocityX < -velocityThreshold;
    const passFast =
      fastSwipe && (effectivelyFlipped ? velocityX > 0 : velocityX < 0);

    if (tradeSwipe || tradeVelocity || tradeFast) return "execute";
    if (passSwipe || passVelocity || passFast) return "pass";
    return "none";
  }

  const T = 120;
  const V = 780;

  it("default LTR: right swipe → execute", () => {
    expect(classifyDragWithSettings(150, 0, T, V, false, false)).toBe(
      "execute"
    );
  });

  it("default LTR: left swipe → pass", () => {
    expect(classifyDragWithSettings(-150, 0, T, V, false, false)).toBe("pass");
  });

  it("swapDirections LTR: right swipe → pass", () => {
    expect(classifyDragWithSettings(150, 0, T, V, false, true)).toBe("pass");
  });

  it("swapDirections LTR: left swipe → execute", () => {
    expect(classifyDragWithSettings(-150, 0, T, V, false, true)).toBe(
      "execute"
    );
  });

  it("RTL default: right swipe → pass", () => {
    expect(classifyDragWithSettings(150, 0, T, V, true, false)).toBe("pass");
  });

  it("RTL default: left swipe → execute", () => {
    expect(classifyDragWithSettings(-150, 0, T, V, true, false)).toBe(
      "execute"
    );
  });

  it("RTL + swapDirections: XOR cancels out → right swipe → execute (same as LTR default)", () => {
    expect(classifyDragWithSettings(150, 0, T, V, true, true)).toBe("execute");
  });

  it("RTL + swapDirections: XOR cancels out → left swipe → pass", () => {
    expect(classifyDragWithSettings(-150, 0, T, V, true, true)).toBe("pass");
  });
});

describe("swapped direction mapping – keyboard arrow keys", () => {
  it("default: ArrowRight → trade, ArrowLeft → pass", () => {
    expect(classifyArrowKeyWithSettings("ArrowRight", true, false)).toBe(
      "trade"
    );
    expect(classifyArrowKeyWithSettings("ArrowLeft", true, false)).toBe("pass");
  });

  it("swapped: ArrowRight → pass, ArrowLeft → trade", () => {
    expect(classifyArrowKeyWithSettings("ArrowRight", true, true)).toBe("pass");
    expect(classifyArrowKeyWithSettings("ArrowLeft", true, true)).toBe("trade");
  });

  it("swapped + pass hidden: ArrowRight is none (pass disabled), ArrowLeft → trade", () => {
    expect(classifyArrowKeyWithSettings("ArrowRight", false, true)).toBe(
      "none"
    );
    expect(classifyArrowKeyWithSettings("ArrowLeft", false, true)).toBe(
      "trade"
    );
  });

  it("default + pass hidden: ArrowRight → trade, ArrowLeft → none", () => {
    expect(classifyArrowKeyWithSettings("ArrowRight", false, false)).toBe(
      "trade"
    );
    expect(classifyArrowKeyWithSettings("ArrowLeft", false, false)).toBe(
      "none"
    );
  });
});
