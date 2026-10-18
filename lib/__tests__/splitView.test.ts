import {
  clampSplitRatio,
  computeSplitRatioFromClientX,
  persistSplitRatio,
  readPersistedSplitRatio,
} from "@/lib/splitView";

describe("split-view ratio helpers", () => {
  it("clamps ratio to guard rails", () => {
    expect(clampSplitRatio(0.05)).toBe(0.3);
    expect(clampSplitRatio(0.5)).toBe(0.5);
    expect(clampSplitRatio(0.99)).toBe(0.7);
  });

  it("enforces min width constraints while dragging", () => {
    const ratio = computeSplitRatioFromClientX(80, 0, 1000, 320, 320);
    expect(ratio).toBe(0.32);
  });

  it("enforces max width constraints while dragging", () => {
    const ratio = computeSplitRatioFromClientX(920, 0, 1000, 320, 320);
    expect(ratio).toBe(0.68);
  });

  it("persists and restores a chosen split ratio", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    const saved = persistSplitRatio(storage, 0.61);
    const restored = readPersistedSplitRatio(storage);

    expect(saved).toBe(0.61);
    expect(restored).toBe(0.61);
  });

  it("falls back to default when stored value is invalid", () => {
    const storage = {
      getItem: () => "not-a-number",
    };

    expect(readPersistedSplitRatio(storage)).toBe(0.5);
  });
});
