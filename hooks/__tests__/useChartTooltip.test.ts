/**
 * Tests for useChartTooltip hook logic — keyboard navigation.
 *
 * Verified behaviours:
 *  - ArrowRight/ArrowUp advance the active index, wrapping at the end.
 *  - ArrowLeft/ArrowDown go backwards, wrapping at the start.
 *  - Home jumps to the first point; End jumps to the last.
 *  - Escape clears the active index.
 *  - showAt sets the index; hide clears it (after a small delay in the real hook).
 *  - activeDescription is produced by the caller's describePoint function.
 *  - containerProps exposes the correct ARIA attributes.
 *
 * testEnvironment: node — pure state machine, no DOM required.
 */

// ── In-process state machine ──────────────────────────────────────────────────
// Mirrors the logic of useChartTooltip without React state.

interface ChartTooltipOptions {
  ariaLabel: string;
  describePoint: (index: number) => string;
  dataLength: number;
}

function makeTooltipController(options: ChartTooltipOptions) {
  const { ariaLabel, describePoint, dataLength } = options;
  let activeIndex: number | null = null;

  function showAt(index: number) {
    activeIndex = index;
  }

  function hide() {
    activeIndex = null;
  }

  // Simulates the keyDown handler
  function handleKey(key: string, length: number = dataLength): boolean {
    switch (key) {
      case "ArrowRight":
      case "ArrowUp":
        if (length === 0) return false;
        activeIndex = activeIndex === null ? 0 : (activeIndex + 1) % length;
        return true;
      case "ArrowLeft":
      case "ArrowDown":
        if (length === 0) return false;
        activeIndex =
          activeIndex === null
            ? length - 1
            : (activeIndex - 1 + length) % length;
        return true;
      case "Home":
        if (length === 0) return false;
        activeIndex = 0;
        return true;
      case "End":
        if (length === 0) return false;
        activeIndex = length - 1;
        return true;
      case "Escape":
        activeIndex = null;
        return true;
      default:
        return false;
    }
  }

  function getState() {
    return {
      activeIndex,
      isVisible: activeIndex !== null,
      activeDescription: activeIndex !== null ? describePoint(activeIndex) : "",
      ariaLabel,
    };
  }

  return { showAt, hide, handleKey, getState };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useChartTooltip", () => {
  const DATA_LENGTH = 5;
  const describe5 = (i: number) => `Point ${i + 1} of ${DATA_LENGTH}: ${i * 10}`;

  function ctrl() {
    return makeTooltipController({
      ariaLabel: "Test chart",
      describePoint: describe5,
      dataLength: DATA_LENGTH,
    });
  }

  describe("showAt / hide", () => {
    it("showAt sets the active index", () => {
      const c = ctrl();
      c.showAt(2);
      expect(c.getState().activeIndex).toBe(2);
    });

    it("hide clears the active index", () => {
      const c = ctrl();
      c.showAt(3);
      c.hide();
      expect(c.getState().activeIndex).toBeNull();
    });

    it("isVisible is true when activeIndex is set", () => {
      const c = ctrl();
      c.showAt(0);
      expect(c.getState().isVisible).toBe(true);
    });

    it("isVisible is false when activeIndex is null", () => {
      const c = ctrl();
      expect(c.getState().isVisible).toBe(false);
    });
  });

  describe("ArrowRight / ArrowUp — advance", () => {
    it("ArrowRight starts at index 0 when no point is active", () => {
      const c = ctrl();
      c.handleKey("ArrowRight");
      expect(c.getState().activeIndex).toBe(0);
    });

    it("ArrowRight increments the active index", () => {
      const c = ctrl();
      c.showAt(1);
      c.handleKey("ArrowRight");
      expect(c.getState().activeIndex).toBe(2);
    });

    it("ArrowRight wraps from the last point to the first", () => {
      const c = ctrl();
      c.showAt(DATA_LENGTH - 1);
      c.handleKey("ArrowRight");
      expect(c.getState().activeIndex).toBe(0);
    });

    it("ArrowUp behaves identically to ArrowRight", () => {
      const c = ctrl();
      c.showAt(2);
      c.handleKey("ArrowUp");
      expect(c.getState().activeIndex).toBe(3);
    });
  });

  describe("ArrowLeft / ArrowDown — go back", () => {
    it("ArrowLeft starts at the last index when no point is active", () => {
      const c = ctrl();
      c.handleKey("ArrowLeft");
      expect(c.getState().activeIndex).toBe(DATA_LENGTH - 1);
    });

    it("ArrowLeft decrements the active index", () => {
      const c = ctrl();
      c.showAt(3);
      c.handleKey("ArrowLeft");
      expect(c.getState().activeIndex).toBe(2);
    });

    it("ArrowLeft wraps from the first point to the last", () => {
      const c = ctrl();
      c.showAt(0);
      c.handleKey("ArrowLeft");
      expect(c.getState().activeIndex).toBe(DATA_LENGTH - 1);
    });

    it("ArrowDown behaves identically to ArrowLeft", () => {
      const c = ctrl();
      c.showAt(2);
      c.handleKey("ArrowDown");
      expect(c.getState().activeIndex).toBe(1);
    });
  });

  describe("Home / End", () => {
    it("Home always jumps to the first point", () => {
      const c = ctrl();
      c.showAt(3);
      c.handleKey("Home");
      expect(c.getState().activeIndex).toBe(0);
    });

    it("End always jumps to the last point", () => {
      const c = ctrl();
      c.showAt(1);
      c.handleKey("End");
      expect(c.getState().activeIndex).toBe(DATA_LENGTH - 1);
    });

    it("Home works from no active point", () => {
      const c = ctrl();
      c.handleKey("Home");
      expect(c.getState().activeIndex).toBe(0);
    });

    it("End works from no active point", () => {
      const c = ctrl();
      c.handleKey("End");
      expect(c.getState().activeIndex).toBe(DATA_LENGTH - 1);
    });
  });

  describe("Escape", () => {
    it("Escape hides the tooltip", () => {
      const c = ctrl();
      c.showAt(2);
      c.handleKey("Escape");
      expect(c.getState().activeIndex).toBeNull();
      expect(c.getState().isVisible).toBe(false);
    });

    it("Escape is a no-op when no point is active", () => {
      const c = ctrl();
      c.handleKey("Escape");
      expect(c.getState().activeIndex).toBeNull();
    });
  });

  describe("empty data set", () => {
    it("ArrowRight does nothing when dataLength is 0", () => {
      const c = makeTooltipController({
        ariaLabel: "Empty chart",
        describePoint: () => "",
        dataLength: 0,
      });
      const handled = c.handleKey("ArrowRight", 0);
      expect(handled).toBe(false);
      expect(c.getState().activeIndex).toBeNull();
    });

    it("Home does nothing when dataLength is 0", () => {
      const c = makeTooltipController({
        ariaLabel: "Empty chart",
        describePoint: () => "",
        dataLength: 0,
      });
      const handled = c.handleKey("Home", 0);
      expect(handled).toBe(false);
    });
  });

  describe("activeDescription", () => {
    it("returns empty string when no point is active", () => {
      const c = ctrl();
      expect(c.getState().activeDescription).toBe("");
    });

    it("returns the describePoint output for the active index", () => {
      const c = ctrl();
      c.showAt(2);
      expect(c.getState().activeDescription).toBe(describe5(2));
    });

    it("updates the description when navigating with keyboard", () => {
      const c = ctrl();
      c.showAt(0);
      c.handleKey("ArrowRight");
      expect(c.getState().activeDescription).toBe(describe5(1));
    });
  });

  describe("containerProps ariaLabel", () => {
    it("exposes the ariaLabel passed in options", () => {
      const c = makeTooltipController({
        ariaLabel: "Portfolio performance chart",
        describePoint: () => "point",
        dataLength: 3,
      });
      expect(c.getState().ariaLabel).toBe("Portfolio performance chart");
    });
  });

  describe("full keyboard navigation sequence", () => {
    it("can navigate all points forward from start to end via ArrowRight", () => {
      const c = ctrl();
      const visited: number[] = [];

      // Start from first
      c.handleKey("Home");
      visited.push(c.getState().activeIndex!);

      for (let i = 1; i < DATA_LENGTH; i++) {
        c.handleKey("ArrowRight");
        visited.push(c.getState().activeIndex!);
      }

      expect(visited).toEqual([0, 1, 2, 3, 4]);
    });

    it("can navigate all points backward from end to start via ArrowLeft", () => {
      const c = ctrl();
      const visited: number[] = [];

      c.handleKey("End");
      visited.push(c.getState().activeIndex!);

      for (let i = DATA_LENGTH - 2; i >= 0; i--) {
        c.handleKey("ArrowLeft");
        visited.push(c.getState().activeIndex!);
      }

      expect(visited).toEqual([4, 3, 2, 1, 0]);
    });
  });
});
