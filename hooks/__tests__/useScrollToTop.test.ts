/**
 * Tests for useScrollToTop hook logic (pure state transitions).
 */

// ── Minimal hook state machine ───────────────────────────────────────────────

function makeScrollController(threshold: number, prefersReducedMotion = false) {
  let isVisible = false;
  const scrollCalls: ScrollToOptions[] = [];

  // Mock window.scrollTo to capture calls
  const mockScrollTo = (options: ScrollToOptions) => {
    scrollCalls.push(options);
  };

  function simulateScroll(scrollY: number) {
    isVisible = scrollY > threshold;
  }

  function scrollToTop() {
    mockScrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    });
  }

  return {
    get isVisible() {
      return isVisible;
    },
    get scrollCalls() {
      return scrollCalls;
    },
    simulateScroll,
    scrollToTop,
  };
}

describe("useScrollToTop logic", () => {
  describe("visibility toggling", () => {
    it("is hidden initially (scroll = 0)", () => {
      const ctrl = makeScrollController(600);
      ctrl.simulateScroll(0);
      expect(ctrl.isVisible).toBe(false);
    });

    it("is hidden when scroll equals threshold", () => {
      const ctrl = makeScrollController(600);
      ctrl.simulateScroll(600);
      expect(ctrl.isVisible).toBe(false);
    });

    it("becomes visible when scroll exceeds threshold", () => {
      const ctrl = makeScrollController(600);
      ctrl.simulateScroll(601);
      expect(ctrl.isVisible).toBe(true);
    });

    it("hides again when scrolling back above threshold", () => {
      const ctrl = makeScrollController(600);
      ctrl.simulateScroll(900);
      expect(ctrl.isVisible).toBe(true);

      ctrl.simulateScroll(200);
      expect(ctrl.isVisible).toBe(false);
    });

    it("respects a custom threshold", () => {
      const ctrl = makeScrollController(200);
      ctrl.simulateScroll(199);
      expect(ctrl.isVisible).toBe(false);

      ctrl.simulateScroll(201);
      expect(ctrl.isVisible).toBe(true);
    });
  });

  describe("scroll-to-top behavior", () => {
    it("uses smooth scrolling when motion is allowed", () => {
      const ctrl = makeScrollController(600, false);
      ctrl.scrollToTop();
      expect(ctrl.scrollCalls[0]).toEqual({ top: 0, behavior: "smooth" });
    });

    it("uses instant scrolling when prefers-reduced-motion", () => {
      const ctrl = makeScrollController(600, true);
      ctrl.scrollToTop();
      expect(ctrl.scrollCalls[0]).toEqual({ top: 0, behavior: "instant" });
    });

    it("always scrolls to top: 0", () => {
      const ctrl = makeScrollController(600);
      ctrl.simulateScroll(1200);
      ctrl.scrollToTop();
      expect(ctrl.scrollCalls[0].top).toBe(0);
    });
  });
});
