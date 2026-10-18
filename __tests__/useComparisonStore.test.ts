import { useComparisonStore, MAX_COMPARISON } from "@/store/useComparisonStore";
import type { Signal } from "@/lib/api-types.generated";

// Reset Zustand store state between tests
beforeEach(() => {
  useComparisonStore.setState({ signals: [], limitReached: false });
});

function makeSignal(n: number): Signal {
  return {
    id: `sig-${n}`,
    asset: `Signal ${n}`,
    action: "BUY",
    confidence: 75,
    ticker: `S${n}`,
    details: "",
    timestamp: "2024-01-01T00:00:00Z",
  } as Signal;
}

describe("useComparisonStore – addSignal", () => {
  it("adds a signal and returns true", () => {
    const result = useComparisonStore.getState().addSignal(makeSignal(1));
    expect(result).toBe(true);
    expect(useComparisonStore.getState().signals).toHaveLength(1);
  });

  it("does not add a duplicate and returns false without changing count", () => {
    useComparisonStore.getState().addSignal(makeSignal(1));
    const result = useComparisonStore.getState().addSignal(makeSignal(1));
    expect(result).toBe(false);
    expect(useComparisonStore.getState().signals).toHaveLength(1);
  });

  it(`allows up to MAX_COMPARISON (${MAX_COMPARISON}) signals`, () => {
    for (let i = 1; i <= MAX_COMPARISON; i++) {
      const ok = useComparisonStore.getState().addSignal(makeSignal(i));
      expect(ok).toBe(true);
    }
    expect(useComparisonStore.getState().signals).toHaveLength(MAX_COMPARISON);
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });

  it("rejects a signal beyond the limit, returns false, and sets limitReached", () => {
    for (let i = 1; i <= MAX_COMPARISON; i++) {
      useComparisonStore.getState().addSignal(makeSignal(i));
    }
    const result = useComparisonStore
      .getState()
      .addSignal(makeSignal(MAX_COMPARISON + 1));
    expect(result).toBe(false);
    expect(useComparisonStore.getState().signals).toHaveLength(MAX_COMPARISON);
    expect(useComparisonStore.getState().limitReached).toBe(true);
  });

  it("clears limitReached once a slot frees up after removal", () => {
    for (let i = 1; i <= MAX_COMPARISON; i++) {
      useComparisonStore.getState().addSignal(makeSignal(i));
    }
    // Hit the limit
    useComparisonStore.getState().addSignal(makeSignal(99));
    expect(useComparisonStore.getState().limitReached).toBe(true);

    // Remove one — limitReached should clear
    useComparisonStore.getState().removeSignal("sig-1");
    expect(useComparisonStore.getState().limitReached).toBe(false);

    // Now adding should succeed
    const ok = useComparisonStore.getState().addSignal(makeSignal(99));
    expect(ok).toBe(true);
    expect(useComparisonStore.getState().signals).toHaveLength(MAX_COMPARISON);
  });
});

describe("useComparisonStore – removeSignal (per-item removal)", () => {
  it("removes only the targeted signal by id", () => {
    useComparisonStore.getState().addSignal(makeSignal(1));
    useComparisonStore.getState().addSignal(makeSignal(2));
    useComparisonStore.getState().addSignal(makeSignal(3));

    useComparisonStore.getState().removeSignal("sig-2");

    const { signals } = useComparisonStore.getState();
    expect(signals).toHaveLength(2);
    expect(signals.map((s) => s.id)).toEqual(["sig-1", "sig-3"]);
  });

  it("is a no-op when the id does not exist", () => {
    useComparisonStore.getState().addSignal(makeSignal(1));
    useComparisonStore.getState().removeSignal("does-not-exist");
    expect(useComparisonStore.getState().signals).toHaveLength(1);
  });

  it("resets limitReached when removing a signal", () => {
    for (let i = 1; i <= MAX_COMPARISON; i++) {
      useComparisonStore.getState().addSignal(makeSignal(i));
    }
    useComparisonStore.setState({ limitReached: true });

    useComparisonStore.getState().removeSignal("sig-1");
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });
});

describe("useComparisonStore – clearAll", () => {
  it("removes all signals and resets limitReached", () => {
    for (let i = 1; i <= MAX_COMPARISON; i++) {
      useComparisonStore.getState().addSignal(makeSignal(i));
    }
    useComparisonStore.setState({ limitReached: true });

    useComparisonStore.getState().clearAll();

    expect(useComparisonStore.getState().signals).toHaveLength(0);
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });
});

describe("useComparisonStore – dismissLimitMessage", () => {
  it("sets limitReached to false without touching signals", () => {
    useComparisonStore.getState().addSignal(makeSignal(1));
    useComparisonStore.setState({ limitReached: true });

    useComparisonStore.getState().dismissLimitMessage();

    expect(useComparisonStore.getState().limitReached).toBe(false);
    expect(useComparisonStore.getState().signals).toHaveLength(1);
  });
});
