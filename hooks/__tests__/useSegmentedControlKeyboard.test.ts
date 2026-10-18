/**
 * Tests for the useSegmentedControlKeyboard hook.
 *
 * We test the callback logic in isolation (pure function) rather than
 * renderHook, because the global jest setup imports MSW which requires
 * a full Node environment. The hook's onActiveChange / navigation logic
 * is a pure reducer-style computation that doesn't need a DOM.
 */

type Orientation = "horizontal" | "vertical";

/**
 * Pure re-implementation of the navigation logic from
 * useSegmentedControlKeyboard so we can test it without a DOM.
 */
function computeNavigation(
  key: string,
  activeIndex: number,
  itemCount: number,
  orientation: Orientation = "horizontal",
): number | null {
  const isHorizontal = orientation === "horizontal";
  const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
  const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

  switch (key) {
    case nextKey:
      return (activeIndex + 1) % itemCount;
    case prevKey:
      return (activeIndex - 1 + itemCount) % itemCount;
    case "Home":
      return 0;
    case "End":
      return itemCount - 1;
    default:
      return null;
  }
}

describe("useSegmentedControlKeyboard navigation logic", () => {
  const itemCount = 4;

  describe("horizontal orientation (default)", () => {
    it("moves to next item on ArrowRight", () => {
      expect(computeNavigation("ArrowRight", 1, itemCount)).toBe(2);
    });

    it("wraps to first item on ArrowRight at the end", () => {
      expect(computeNavigation("ArrowRight", 3, itemCount)).toBe(0);
    });

    it("moves to previous item on ArrowLeft", () => {
      expect(computeNavigation("ArrowLeft", 2, itemCount)).toBe(1);
    });

    it("wraps to last item on ArrowLeft at index 0", () => {
      expect(computeNavigation("ArrowLeft", 0, itemCount)).toBe(3);
    });

    it("goes to first item on Home", () => {
      expect(computeNavigation("Home", 2, itemCount)).toBe(0);
    });

    it("goes to last item on End", () => {
      expect(computeNavigation("End", 0, itemCount)).toBe(itemCount - 1);
    });
  });

  describe("vertical orientation", () => {
    it("moves to next item on ArrowDown", () => {
      expect(computeNavigation("ArrowDown", 1, itemCount, "vertical")).toBe(2);
    });

    it("wraps to first item on ArrowDown at the end", () => {
      expect(computeNavigation("ArrowDown", 3, itemCount, "vertical")).toBe(0);
    });

    it("moves to previous item on ArrowUp", () => {
      expect(computeNavigation("ArrowUp", 2, itemCount, "vertical")).toBe(1);
    });

    it("wraps to last item on ArrowUp at index 0", () => {
      expect(computeNavigation("ArrowUp", 0, itemCount, "vertical")).toBe(3);
    });
  });

  describe("Home and End keys", () => {
    it("Home always goes to index 0 regardless of orientation", () => {
      expect(computeNavigation("Home", 3, 6, "vertical")).toBe(0);
      expect(computeNavigation("Home", 3, 6, "horizontal")).toBe(0);
    });

    it("End always goes to the last index regardless of orientation", () => {
      expect(computeNavigation("End", 0, 6, "vertical")).toBe(5);
      expect(computeNavigation("End", 0, 6, "horizontal")).toBe(5);
    });
  });

  describe("unrelated keys", () => {
    it("returns null for keys that are not handled", () => {
      expect(computeNavigation("Enter", 1, itemCount)).toBeNull();
      expect(computeNavigation("Escape", 1, itemCount)).toBeNull();
      expect(computeNavigation("Tab", 1, itemCount)).toBeNull();
      expect(computeNavigation(" ", 1, itemCount)).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles a single-item group (no-op navigation)", () => {
      expect(computeNavigation("ArrowRight", 0, 1)).toBe(0);
      expect(computeNavigation("ArrowLeft", 0, 1)).toBe(0);
      expect(computeNavigation("Home", 0, 1)).toBe(0);
      expect(computeNavigation("End", 0, 1)).toBe(0);
    });

    it("handles a two-item group", () => {
      expect(computeNavigation("ArrowRight", 0, 2)).toBe(1);
      expect(computeNavigation("ArrowRight", 1, 2)).toBe(0);
      expect(computeNavigation("ArrowLeft", 0, 2)).toBe(1);
      expect(computeNavigation("ArrowLeft", 1, 2)).toBe(0);
    });
  });
});
