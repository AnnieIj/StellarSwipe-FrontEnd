import {
  useSnoozeStore,
  selectVisibleSignals,
  DEFAULT_SNOOZE_DURATION_MS,
} from "@/store/useSnoozeStore";

const NOW = 1_700_000_000_000;

beforeEach(() => {
  useSnoozeStore.setState({ snoozed: {} });
});

// ── Snoozing ──────────────────────────────────────────────────────────────────

describe("useSnoozeStore – snoozing a signal", () => {
  it("records an expiry timestamp at now + duration", () => {
    useSnoozeStore
      .getState()
      .snoozeSignal("sig-1", DEFAULT_SNOOZE_DURATION_MS, NOW);
    expect(useSnoozeStore.getState().snoozed["sig-1"]).toBe(
      NOW + DEFAULT_SNOOZE_DURATION_MS
    );
  });

  it("uses the default duration when none is provided", () => {
    useSnoozeStore.getState().snoozeSignal("sig-1", undefined, NOW);
    expect(useSnoozeStore.getState().snoozed["sig-1"]).toBe(
      NOW + DEFAULT_SNOOZE_DURATION_MS
    );
  });

  it("supports a configurable duration", () => {
    const tenMinutes = 10 * 60 * 1000;
    useSnoozeStore.getState().snoozeSignal("sig-1", tenMinutes, NOW);
    expect(useSnoozeStore.getState().snoozed["sig-1"]).toBe(NOW + tenMinutes);
  });

  it("reports a freshly snoozed signal as snoozed", () => {
    useSnoozeStore
      .getState()
      .snoozeSignal("sig-1", DEFAULT_SNOOZE_DURATION_MS, NOW);
    expect(useSnoozeStore.getState().isSnoozed("sig-1", NOW)).toBe(true);
  });

  it("does not report an un-snoozed signal as snoozed", () => {
    expect(useSnoozeStore.getState().isSnoozed("unknown", NOW)).toBe(false);
  });

  it("lists active snoozes", () => {
    const s = useSnoozeStore.getState();
    s.snoozeSignal("sig-1", DEFAULT_SNOOZE_DURATION_MS, NOW);
    s.snoozeSignal("sig-2", DEFAULT_SNOOZE_DURATION_MS, NOW);
    expect(useSnoozeStore.getState().getActiveSnoozes(NOW).sort()).toEqual([
      "sig-1",
      "sig-2",
    ]);
  });

  it("unsnoozeSignal returns a signal early", () => {
    const s = useSnoozeStore.getState();
    s.snoozeSignal("sig-1", DEFAULT_SNOOZE_DURATION_MS, NOW);
    s.unsnoozeSignal("sig-1");
    expect(useSnoozeStore.getState().isSnoozed("sig-1", NOW)).toBe(false);
  });
});

// ── Expiry ────────────────────────────────────────────────────────────────────

describe("useSnoozeStore – snooze expiry", () => {
  it("reports the signal as snoozed before expiry", () => {
    useSnoozeStore.getState().snoozeSignal("sig-1", 1000, NOW);
    expect(useSnoozeStore.getState().isSnoozed("sig-1", NOW + 500)).toBe(true);
  });

  it("reports the signal as no longer snoozed at/after expiry", () => {
    useSnoozeStore.getState().snoozeSignal("sig-1", 1000, NOW);
    expect(useSnoozeStore.getState().isSnoozed("sig-1", NOW + 1000)).toBe(
      false
    );
    expect(useSnoozeStore.getState().isSnoozed("sig-1", NOW + 5000)).toBe(
      false
    );
  });

  it("excludes expired entries from the active list", () => {
    const s = useSnoozeStore.getState();
    s.snoozeSignal("fresh", 5000, NOW);
    s.snoozeSignal("stale", 1000, NOW);
    expect(useSnoozeStore.getState().getActiveSnoozes(NOW + 2000)).toEqual([
      "fresh",
    ]);
  });

  it("pruneExpired drops only entries whose expiry has passed", () => {
    const s = useSnoozeStore.getState();
    s.snoozeSignal("fresh", 5000, NOW);
    s.snoozeSignal("stale", 1000, NOW);
    s.pruneExpired(NOW + 2000);
    const { snoozed } = useSnoozeStore.getState();
    expect(snoozed).toHaveProperty("fresh");
    expect(snoozed).not.toHaveProperty("stale");
  });
});

// ── Feed re-insertion ─────────────────────────────────────────────────────────

describe("selectVisibleSignals – snoozed signals leave and re-enter the feed", () => {
  const feed = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("returns every signal when nothing is snoozed", () => {
    expect(selectVisibleSignals(feed, {}, NOW)).toEqual(feed);
  });

  it("hides a snoozed signal from the feed", () => {
    useSnoozeStore.getState().snoozeSignal("b", 1000, NOW);
    const visible = selectVisibleSignals(
      feed,
      useSnoozeStore.getState().snoozed,
      NOW
    );
    expect(visible.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("automatically re-inserts the signal once its snooze elapses", () => {
    useSnoozeStore.getState().snoozeSignal("b", 1000, NOW);

    // While snoozed: hidden.
    expect(
      selectVisibleSignals(
        feed,
        useSnoozeStore.getState().snoozed,
        NOW + 500
      ).map((s) => s.id)
    ).toEqual(["a", "c"]);

    // After expiry: back in the feed in its original position.
    expect(
      selectVisibleSignals(
        feed,
        useSnoozeStore.getState().snoozed,
        NOW + 1500
      ).map((s) => s.id)
    ).toEqual(["a", "b", "c"]);
  });

  it("re-inserts immediately when manually unsnoozed", () => {
    const s = useSnoozeStore.getState();
    s.snoozeSignal("b", DEFAULT_SNOOZE_DURATION_MS, NOW);
    s.unsnoozeSignal("b");
    expect(
      selectVisibleSignals(feed, useSnoozeStore.getState().snoozed, NOW).map(
        (s) => s.id
      )
    ).toEqual(["a", "b", "c"]);
  });
});
