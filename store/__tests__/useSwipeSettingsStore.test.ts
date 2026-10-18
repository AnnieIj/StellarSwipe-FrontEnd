/**
 * Unit tests for store/useSwipeSettingsStore.ts
 *
 * Tests cover:
 *  - Default state values
 *  - setSensitivity / setSwapDirections actions
 *  - resetToDefaults
 *  - getEffectiveSwipeThreshold / getEffectiveVelocityThreshold helpers
 *  - SENSITIVITY_MULTIPLIERS values preserve intended ordering
 */

import {
  useSwipeSettingsStore,
  getEffectiveSwipeThreshold,
  getEffectiveVelocityThreshold,
  SENSITIVITY_MULTIPLIERS,
} from "@/store/useSwipeSettingsStore";
import { SWIPE_THRESHOLD, VELOCITY_THRESHOLD } from "@/lib/signalGestures";

// Reset the store to its initial state before each test so tests are isolated.
beforeEach(() => {
  useSwipeSettingsStore.getState().resetToDefaults();
});

// ── Default state ─────────────────────────────────────────────────────────────

describe("useSwipeSettingsStore – default state", () => {
  it("default sensitivity is 'default'", () => {
    expect(useSwipeSettingsStore.getState().sensitivity).toBe("default");
  });

  it("swapDirections is false by default", () => {
    expect(useSwipeSettingsStore.getState().swapDirections).toBe(false);
  });
});

// ── Actions ───────────────────────────────────────────────────────────────────

describe("useSwipeSettingsStore – setSensitivity", () => {
  it("updates sensitivity to 'high'", () => {
    useSwipeSettingsStore.getState().setSensitivity("high");
    expect(useSwipeSettingsStore.getState().sensitivity).toBe("high");
  });

  it("updates sensitivity to 'low'", () => {
    useSwipeSettingsStore.getState().setSensitivity("low");
    expect(useSwipeSettingsStore.getState().sensitivity).toBe("low");
  });

  it("can be reset back to 'default'", () => {
    useSwipeSettingsStore.getState().setSensitivity("high");
    useSwipeSettingsStore.getState().setSensitivity("default");
    expect(useSwipeSettingsStore.getState().sensitivity).toBe("default");
  });
});

describe("useSwipeSettingsStore – setSwapDirections", () => {
  it("sets swapDirections to true", () => {
    useSwipeSettingsStore.getState().setSwapDirections(true);
    expect(useSwipeSettingsStore.getState().swapDirections).toBe(true);
  });

  it("toggles back to false", () => {
    useSwipeSettingsStore.getState().setSwapDirections(true);
    useSwipeSettingsStore.getState().setSwapDirections(false);
    expect(useSwipeSettingsStore.getState().swapDirections).toBe(false);
  });
});

describe("useSwipeSettingsStore – resetToDefaults", () => {
  it("resets all settings to their defaults", () => {
    useSwipeSettingsStore.getState().setSensitivity("high");
    useSwipeSettingsStore.getState().setSwapDirections(true);
    useSwipeSettingsStore.getState().resetToDefaults();
    const { sensitivity, swapDirections } = useSwipeSettingsStore.getState();
    expect(sensitivity).toBe("default");
    expect(swapDirections).toBe(false);
  });
});

// ── SENSITIVITY_MULTIPLIERS ordering ─────────────────────────────────────────

describe("SENSITIVITY_MULTIPLIERS – ordering", () => {
  it("default multiplier is 1 (no change)", () => {
    expect(SENSITIVITY_MULTIPLIERS.default).toBe(1);
  });

  it("low multiplier is greater than 1 (requires more drag)", () => {
    expect(SENSITIVITY_MULTIPLIERS.low).toBeGreaterThan(1);
  });

  it("high multiplier is less than 1 (requires less drag)", () => {
    expect(SENSITIVITY_MULTIPLIERS.high).toBeGreaterThan(0);
    expect(SENSITIVITY_MULTIPLIERS.high).toBeLessThan(1);
  });

  it("ordering: high < default < low", () => {
    expect(SENSITIVITY_MULTIPLIERS.high).toBeLessThan(
      SENSITIVITY_MULTIPLIERS.default
    );
    expect(SENSITIVITY_MULTIPLIERS.default).toBeLessThan(
      SENSITIVITY_MULTIPLIERS.low
    );
  });
});

// ── getEffectiveSwipeThreshold ────────────────────────────────────────────────

describe("getEffectiveSwipeThreshold", () => {
  it("default returns base SWIPE_THRESHOLD (120)", () => {
    expect(getEffectiveSwipeThreshold("default")).toBe(SWIPE_THRESHOLD);
  });

  it("low returns a value greater than the base threshold", () => {
    expect(getEffectiveSwipeThreshold("low")).toBeGreaterThan(SWIPE_THRESHOLD);
  });

  it("high returns a value less than the base threshold", () => {
    expect(getEffectiveSwipeThreshold("high")).toBeLessThan(SWIPE_THRESHOLD);
  });

  it("computed value is Math.round(base × multiplier)", () => {
    expect(getEffectiveSwipeThreshold("low")).toBe(
      Math.round(SWIPE_THRESHOLD * SENSITIVITY_MULTIPLIERS.low)
    );
    expect(getEffectiveSwipeThreshold("high")).toBe(
      Math.round(SWIPE_THRESHOLD * SENSITIVITY_MULTIPLIERS.high)
    );
  });

  it("thresholds preserve the correct ordering: high < default < low", () => {
    expect(getEffectiveSwipeThreshold("high")).toBeLessThan(
      getEffectiveSwipeThreshold("default")
    );
    expect(getEffectiveSwipeThreshold("default")).toBeLessThan(
      getEffectiveSwipeThreshold("low")
    );
  });
});

// ── getEffectiveVelocityThreshold ─────────────────────────────────────────────

describe("getEffectiveVelocityThreshold", () => {
  it("default returns base VELOCITY_THRESHOLD (780)", () => {
    expect(getEffectiveVelocityThreshold("default")).toBe(VELOCITY_THRESHOLD);
  });

  it("low returns a higher velocity threshold (harder fast-swipe)", () => {
    expect(getEffectiveVelocityThreshold("low")).toBeGreaterThan(
      VELOCITY_THRESHOLD
    );
  });

  it("high returns a lower velocity threshold (easier fast-swipe)", () => {
    expect(getEffectiveVelocityThreshold("high")).toBeLessThan(
      VELOCITY_THRESHOLD
    );
  });

  it("computed value is Math.round(base × multiplier)", () => {
    expect(getEffectiveVelocityThreshold("low")).toBe(
      Math.round(VELOCITY_THRESHOLD * SENSITIVITY_MULTIPLIERS.low)
    );
    expect(getEffectiveVelocityThreshold("high")).toBe(
      Math.round(VELOCITY_THRESHOLD * SENSITIVITY_MULTIPLIERS.high)
    );
  });
});
