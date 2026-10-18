import {
  PULL_DAMPING_FACTOR,
  PULL_MAX_INDICATOR_PX,
  PULL_THRESHOLD_PX,
  dampPullDistance,
  derivePullState,
} from "@/lib/pullToRefreshState";

describe("dampPullDistance – the pull resists the finger", () => {
  it("halves the raw distance by default", () => {
    expect(dampPullDistance(100)).toBe(100 * PULL_DAMPING_FACTOR);
  });

  it("never returns a negative distance", () => {
    expect(dampPullDistance(-20)).toBe(0);
    expect(dampPullDistance(0)).toBe(0);
  });

  it("ignores a nonsense distance", () => {
    expect(dampPullDistance(Number.NaN)).toBe(0);
  });

  it("honours a custom factor", () => {
    expect(dampPullDistance(100, 0.25)).toBe(25);
  });
});

describe("derivePullState – the gesture is predictable", () => {
  it("stays idle at rest", () => {
    expect(derivePullState({ distance: 0, isRefreshing: false })).toEqual({
      phase: "idle",
      pullDistance: 0,
      canRefresh: false,
      progress: 0,
      indicatorOffset: 0,
      shouldCapture: false,
    });
  });

  it("arms only once the damped pull passes the threshold", () => {
    const armed = PULL_THRESHOLD_PX / PULL_DAMPING_FACTOR;
    expect(derivePullState({ distance: armed - 1, isRefreshing: false }).phase).toBe(
      "pulling",
    );
    expect(derivePullState({ distance: armed, isRefreshing: false }).phase).toBe(
      "armed",
    );
  });

  it("reports readiness and progress together", () => {
    const state = derivePullState({
      distance: PULL_THRESHOLD_PX / PULL_DAMPING_FACTOR,
      isRefreshing: false,
    });
    expect(state.canRefresh).toBe(true);
    expect(state.progress).toBe(1);
    expect(state.shouldCapture).toBe(true);
  });

  it("reports partial progress while still pulling", () => {
    const state = derivePullState({ distance: 80, isRefreshing: false });
    expect(state.phase).toBe("pulling");
    expect(state.canRefresh).toBe(false);
    expect(state.progress).toBeCloseTo(0.5);
  });

  it("ignores the gesture when the feature is disabled", () => {
    expect(
      derivePullState({ distance: 400, isRefreshing: false, isEnabled: false }),
    ).toEqual({
      phase: "idle",
      pullDistance: 0,
      canRefresh: false,
      progress: 0,
      indicatorOffset: 0,
      shouldCapture: false,
    });
  });

  it("ignores the gesture when the feed is scrolled away from the top", () => {
    expect(
      derivePullState({ distance: 400, isRefreshing: false, atTop: false }).phase,
    ).toBe("idle");
  });

  it("stops capturing while a refresh is already running", () => {
    const state = derivePullState({ distance: 400, isRefreshing: true });
    expect(state.phase).toBe("refreshing");
    expect(state.shouldCapture).toBe(false);
    expect(state.canRefresh).toBe(false);
    expect(state.progress).toBe(1);
  });

  it("caps the indicator so the page cannot be dragged off screen", () => {
    const state = derivePullState({ distance: 5_000, isRefreshing: false });
    expect(state.indicatorOffset).toBe(PULL_MAX_INDICATOR_PX);
  });

  it("honours a custom threshold", () => {
    const state = derivePullState({
      distance: 100,
      isRefreshing: false,
      threshold: 25,
    });
    expect(state.phase).toBe("armed");
  });

  it("falls back to the default threshold for a nonsense one", () => {
    const state = derivePullState({
      distance: PULL_THRESHOLD_PX / PULL_DAMPING_FACTOR,
      isRefreshing: false,
      threshold: 0,
    });
    expect(state.phase).toBe("armed");
  });
});
