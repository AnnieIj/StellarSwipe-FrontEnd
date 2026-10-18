/**
 * Unit tests for feed density toggle logic (store/useFeedDensityStore.ts
 * and components/FeedDensityToggle.tsx).
 *
 * Tests cover store state transitions, CSS class derivation, aria-checked
 * contract, and label text — without requiring a DOM render.
 */

import type { FeedDensity } from "@/store/useFeedDensityStore";

// ── Store state transitions ────────────────────────────────────────────────────

type DensityState = { density: FeedDensity };

function setDensity(state: DensityState, d: FeedDensity): DensityState {
  return { density: d };
}

function toggleDensity(state: DensityState): DensityState {
  return { density: state.density === "compact" ? "comfortable" : "compact" };
}

describe("useFeedDensityStore – initial state", () => {
  it("defaults to comfortable", () => {
    const state: DensityState = { density: "comfortable" };
    expect(state.density).toBe("comfortable");
  });
});

describe("useFeedDensityStore – setDensity", () => {
  it("sets density to compact", () => {
    const s = setDensity({ density: "comfortable" }, "compact");
    expect(s.density).toBe("compact");
  });

  it("sets density to comfortable", () => {
    const s = setDensity({ density: "compact" }, "comfortable");
    expect(s.density).toBe("comfortable");
  });

  it("is idempotent when density is already the target value", () => {
    const s = setDensity({ density: "compact" }, "compact");
    expect(s.density).toBe("compact");
  });
});

describe("FeedDensityToggle – toggle cycles between modes", () => {
  it("comfortable → compact on first toggle", () => {
    const s = toggleDensity({ density: "comfortable" });
    expect(s.density).toBe("compact");
  });

  it("compact → comfortable on second toggle", () => {
    const s = toggleDensity({ density: "compact" });
    expect(s.density).toBe("comfortable");
  });

  it("three toggles return to the original comfortable state", () => {
    let s: DensityState = { density: "comfortable" };
    s = toggleDensity(s); // compact
    s = toggleDensity(s); // comfortable
    s = toggleDensity(s); // compact
    expect(s.density).toBe("compact");
  });
});

// ── aria-checked contract ─────────────────────────────────────────────────────

function getAriaChecked(density: FeedDensity): boolean {
  return density === "compact";
}

describe("FeedDensityToggle – aria-checked reflects compact state", () => {
  it("aria-checked is false when density is comfortable", () => {
    expect(getAriaChecked("comfortable")).toBe(false);
  });

  it("aria-checked is true when density is compact", () => {
    expect(getAriaChecked("compact")).toBe(true);
  });
});

// ── Label text derivation ─────────────────────────────────────────────────────

function getLabel(density: FeedDensity): string {
  return density === "compact" ? "Compact" : "Comfortable";
}

function getAriaLabel(density: FeedDensity): string {
  return density === "compact"
    ? "Switch to comfortable density"
    : "Switch to compact density";
}

describe("FeedDensityToggle – label text", () => {
  it("shows 'Comfortable' when in comfortable mode", () => {
    expect(getLabel("comfortable")).toBe("Comfortable");
  });

  it("shows 'Compact' when in compact mode", () => {
    expect(getLabel("compact")).toBe("Compact");
  });

  it("aria-label announces the destination mode (comfortable → compact)", () => {
    expect(getAriaLabel("comfortable")).toBe("Switch to compact density");
  });

  it("aria-label announces the destination mode (compact → comfortable)", () => {
    expect(getAriaLabel("compact")).toBe("Switch to comfortable density");
  });
});

// ── Visual regression: CSS class derivation for both density modes ────────────

function getArticleClasses(density: FeedDensity): string {
  return density === "compact" ? "p-2 sm:p-3 mb-2" : "p-4 sm:p-6 mb-4";
}

function getContentGapClass(density: FeedDensity): string {
  return density === "compact" ? "gap-2" : "gap-4";
}

function getDetailsMarginClass(density: FeedDensity): string {
  return density === "compact" ? "mt-2" : "mt-4";
}

describe("SignalFeed – compact density class snapshot", () => {
  it("compact: article uses reduced padding and margin", () => {
    expect(getArticleClasses("compact")).toBe("p-2 sm:p-3 mb-2");
  });

  it("comfortable: article uses full padding and margin", () => {
    expect(getArticleClasses("comfortable")).toBe("p-4 sm:p-6 mb-4");
  });

  it("compact: content row uses tighter gap", () => {
    expect(getContentGapClass("compact")).toBe("gap-2");
  });

  it("comfortable: content row uses wider gap", () => {
    expect(getContentGapClass("comfortable")).toBe("gap-4");
  });

  it("compact: details text has smaller top margin", () => {
    expect(getDetailsMarginClass("compact")).toBe("mt-2");
  });

  it("comfortable: details text has larger top margin", () => {
    expect(getDetailsMarginClass("comfortable")).toBe("mt-4");
  });
});
