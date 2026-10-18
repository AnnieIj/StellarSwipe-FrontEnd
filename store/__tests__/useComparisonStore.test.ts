/**
 * Unit tests for store/useComparisonStore.ts
 *
 * Covers:
 *  - addSignal / deduplication
 *  - MAX_SIGNALS (3) limit enforcement and limitReached flag
 *  - dismissLimitMessage
 *  - removeSignal (per-item removal) — including limitReached reset
 *  - clearSignals — preserves existing 'clear all' behaviour
 *  - canAdd / isSelected helpers
 *  - toggleMetric
 */

import { useComparisonStore, MAX_SIGNALS } from "@/store/useComparisonStore";
import type { Signal } from "@/lib/api-types.generated";

// ---------------------------------------------------------------------------
// Minimal Signal factory
// ---------------------------------------------------------------------------
function makeSignal(id: string, ticker = "XLM"): Signal {
  return {
    id,
    ticker,
    details: "",
    timestamp: "2024-01-01T00:00:00Z",
  } as Signal;
}

// Reset store to a clean slate before each test
beforeEach(() => {
  useComparisonStore.setState({
    signals: [],
    hiddenMetrics: [],
    limitReached: false,
  });
});

// ---------------------------------------------------------------------------
// addSignal — happy path
// ---------------------------------------------------------------------------
describe("addSignal – happy path", () => {
  it("adds a signal and returns true", () => {
    const added = useComparisonStore.getState().addSignal(makeSignal("s1"));
    expect(added).toBe(true);
    expect(useComparisonStore.getState().signals).toHaveLength(1);
  });

  it("stores the signal with the correct id", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1", "AQUA"));
    const { signals } = useComparisonStore.getState();
    expect(signals[0].id).toBe("s1");
    expect(signals[0].ticker).toBe("AQUA");
  });

  it("clears limitReached when adding successfully", () => {
    useComparisonStore.setState({ limitReached: true });
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addSignal — deduplication
// ---------------------------------------------------------------------------
describe("addSignal – deduplication", () => {
  it("returns false when adding a duplicate signal", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    const second = useComparisonStore.getState().addSignal(makeSignal("s1"));
    expect(second).toBe(false);
    expect(useComparisonStore.getState().signals).toHaveLength(1);
  });

  it("does not set limitReached for a duplicate add", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MAX_SIGNALS limit
// ---------------------------------------------------------------------------
describe(`addSignal – MAX_SIGNALS (${MAX_SIGNALS}) limit`, () => {
  it("allows adding exactly MAX_SIGNALS signals", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      const added = useComparisonStore
        .getState()
        .addSignal(makeSignal(`s${i}`));
      expect(added).toBe(true);
    }
    expect(useComparisonStore.getState().signals).toHaveLength(MAX_SIGNALS);
  });

  it("returns false when attempting to add a signal beyond the limit", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      useComparisonStore.getState().addSignal(makeSignal(`s${i}`));
    }
    const overflow = useComparisonStore
      .getState()
      .addSignal(makeSignal("s-extra"));
    expect(overflow).toBe(false);
  });

  it("sets limitReached to true when the limit is hit", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      useComparisonStore.getState().addSignal(makeSignal(`s${i}`));
    }
    useComparisonStore.getState().addSignal(makeSignal("s-extra"));
    expect(useComparisonStore.getState().limitReached).toBe(true);
  });

  it("does not add the overflow signal to the list", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      useComparisonStore.getState().addSignal(makeSignal(`s${i}`));
    }
    useComparisonStore.getState().addSignal(makeSignal("s-extra"));
    const ids = useComparisonStore.getState().signals.map((s) => s.id);
    expect(ids).not.toContain("s-extra");
    expect(ids).toHaveLength(MAX_SIGNALS);
  });

  it("canAdd returns false once the limit is reached", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      useComparisonStore.getState().addSignal(makeSignal(`s${i}`));
    }
    expect(useComparisonStore.getState().canAdd()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dismissLimitMessage
// ---------------------------------------------------------------------------
describe("dismissLimitMessage", () => {
  it("sets limitReached to false", () => {
    useComparisonStore.setState({ limitReached: true });
    useComparisonStore.getState().dismissLimitMessage();
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });

  it("is idempotent when limitReached is already false", () => {
    useComparisonStore.getState().dismissLimitMessage();
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// removeSignal — per-item removal
// ---------------------------------------------------------------------------
describe("removeSignal – per-item removal", () => {
  it("removes only the targeted signal", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    useComparisonStore.getState().addSignal(makeSignal("s2"));
    useComparisonStore.getState().addSignal(makeSignal("s3"));

    useComparisonStore.getState().removeSignal("s2");

    const ids = useComparisonStore.getState().signals.map((s) => s.id);
    expect(ids).toEqual(["s1", "s3"]);
  });

  it("leaves the list unchanged when the id is not present", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    useComparisonStore.getState().removeSignal("nonexistent");
    expect(useComparisonStore.getState().signals).toHaveLength(1);
  });

  it("clears limitReached after removal (a slot is now free)", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      useComparisonStore.getState().addSignal(makeSignal(`s${i}`));
    }
    // Trigger the limit banner
    useComparisonStore.getState().addSignal(makeSignal("s-extra"));
    expect(useComparisonStore.getState().limitReached).toBe(true);

    // Remove one — banner should clear
    useComparisonStore.getState().removeSignal("s1");
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });

  it("allows a new signal to be added after removing one when at limit", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      useComparisonStore.getState().addSignal(makeSignal(`s${i}`));
    }
    useComparisonStore.getState().removeSignal("s1");

    const added = useComparisonStore.getState().addSignal(makeSignal("s-new"));
    expect(added).toBe(true);
    expect(useComparisonStore.getState().signals).toHaveLength(MAX_SIGNALS);
  });
});

// ---------------------------------------------------------------------------
// clearSignals — existing 'clear all' behaviour preserved
// ---------------------------------------------------------------------------
describe("clearSignals – clear all", () => {
  it("removes all signals", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    useComparisonStore.getState().addSignal(makeSignal("s2"));
    useComparisonStore.getState().clearSignals();
    expect(useComparisonStore.getState().signals).toHaveLength(0);
  });

  it("also resets limitReached", () => {
    useComparisonStore.setState({ limitReached: true });
    useComparisonStore.getState().clearSignals();
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });

  it("allows adding signals again after clearing", () => {
    for (let i = 1; i <= MAX_SIGNALS; i++) {
      useComparisonStore.getState().addSignal(makeSignal(`s${i}`));
    }
    useComparisonStore.getState().clearSignals();
    const added = useComparisonStore
      .getState()
      .addSignal(makeSignal("s-fresh"));
    expect(added).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canAdd / isSelected helpers
// ---------------------------------------------------------------------------
describe("canAdd / isSelected", () => {
  it("canAdd returns true when the list is empty", () => {
    expect(useComparisonStore.getState().canAdd()).toBe(true);
  });

  it("canAdd returns true when below the limit", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    expect(useComparisonStore.getState().canAdd()).toBe(true);
  });

  it("isSelected returns false for an absent id", () => {
    expect(useComparisonStore.getState().isSelected("missing")).toBe(false);
  });

  it("isSelected returns true after adding the signal", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    expect(useComparisonStore.getState().isSelected("s1")).toBe(true);
  });

  it("isSelected returns false after the signal is removed", () => {
    useComparisonStore.getState().addSignal(makeSignal("s1"));
    useComparisonStore.getState().removeSignal("s1");
    expect(useComparisonStore.getState().isSelected("s1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toggleMetric
// ---------------------------------------------------------------------------
describe("toggleMetric", () => {
  it("adds a metric key to hiddenMetrics", () => {
    useComparisonStore.getState().toggleMetric("confidence");
    expect(useComparisonStore.getState().hiddenMetrics).toContain("confidence");
  });

  it("removes the key when toggled again", () => {
    useComparisonStore.getState().toggleMetric("confidence");
    useComparisonStore.getState().toggleMetric("confidence");
    expect(useComparisonStore.getState().hiddenMetrics).not.toContain(
      "confidence"
    );
  });

  it("does not affect other hidden metrics when toggling one key", () => {
    useComparisonStore.getState().toggleMetric("entryPrice");
    useComparisonStore.getState().toggleMetric("confidence");
    useComparisonStore.getState().toggleMetric("confidence");
    expect(useComparisonStore.getState().hiddenMetrics).toContain("entryPrice");
    expect(useComparisonStore.getState().hiddenMetrics).not.toContain(
      "confidence"
    );
  });
});
