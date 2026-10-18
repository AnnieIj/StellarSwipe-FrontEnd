import {
  PRICE_STALE_THRESHOLD_MS,
  ageSince,
  derivePriceRefreshStatus,
  deriveSyncState,
  formatAgeParts,
  isPriceStale,
  type PriceRefreshInput,
} from "@/lib/priceRefreshStatus";

const NOW = 1_700_000_000_000;

function input(overrides: Partial<PriceRefreshInput> = {}): PriceRefreshInput {
  return {
    online: true,
    isFetching: false,
    lastSyncedAt: NOW - 1_000,
    now: NOW,
    ...overrides,
  };
}

describe("deriveSyncState – one status the whole app can trust", () => {
  it("reports synced while data is fresh", () => {
    expect(deriveSyncState(input())).toBe("synced");
  });

  it("reports offline before anything else", () => {
    expect(deriveSyncState(input({ online: false }))).toBe("offline");
    expect(
      deriveSyncState(input({ online: false, isFetching: true, lastSyncedAt: null })),
    ).toBe("offline");
  });

  it("reports never when nothing has been synced yet", () => {
    expect(deriveSyncState(input({ lastSyncedAt: null }))).toBe("never");
  });

  it("treats an invalid timestamp as never synced", () => {
    expect(
      deriveSyncState(input({ lastSyncedAt: Number.NaN })),
    ).toBe("never");
  });

  it("reports syncing when fresh data is on its way", () => {
    expect(deriveSyncState(input({ isFetching: true }))).toBe("syncing");
  });

  it("keeps reporting syncing even when the current copy is stale", () => {
    expect(
      deriveSyncState(
        input({ isFetching: true, lastSyncedAt: NOW - PRICE_STALE_THRESHOLD_MS * 2 }),
      ),
    ).toBe("syncing");
  });

  it("reports stale once the threshold is crossed", () => {
    expect(
      deriveSyncState(input({ lastSyncedAt: NOW - PRICE_STALE_THRESHOLD_MS })),
    ).toBe("stale");
  });

  it("stays synced one millisecond before the threshold", () => {
    expect(
      deriveSyncState(
        input({ lastSyncedAt: NOW - PRICE_STALE_THRESHOLD_MS + 1 }),
      ),
    ).toBe("synced");
  });

  it("honours a custom threshold", () => {
    expect(
      deriveSyncState(
        input({ lastSyncedAt: NOW - 10_000, staleThresholdMs: 5_000 }),
      ),
    ).toBe("stale");
  });
});

describe("derivePriceRefreshStatus – flags for the price panel", () => {
  it("marks fresh data as live", () => {
    const status = derivePriceRefreshStatus(input());
    expect(status).toEqual({
      state: "synced",
      isLive: true,
      isStale: false,
      ageMs: 1_000,
      i18nKey: "sync.status.synced",
    });
  });

  it("marks stale and never-synced data as not live", () => {
    expect(derivePriceRefreshStatus(input({ lastSyncedAt: null })).isLive).toBe(
      false,
    );
    expect(
      derivePriceRefreshStatus(input({ lastSyncedAt: NOW - 10 * 60 * 1000 }))
        .isStale,
    ).toBe(true);
  });

  it("never reports a refreshing price as live", () => {
    const status = derivePriceRefreshStatus(input({ isFetching: true }));
    expect(status.state).toBe("syncing");
    expect(status.isLive).toBe(false);
  });

  it("exposes a translation key per state", () => {
    expect(derivePriceRefreshStatus(input({ online: false })).i18nKey).toBe(
      "sync.status.offline",
    );
  });
});

describe("age helpers", () => {
  it("clamps a future timestamp to zero", () => {
    expect(ageSince(NOW + 5_000, NOW)).toBe(0);
  });

  it("returns null without a usable timestamp", () => {
    expect(ageSince(null, NOW)).toBeNull();
  });

  it("treats never-synced data as not stale", () => {
    expect(isPriceStale(null, NOW)).toBe(false);
  });
});

describe("formatAgeParts – a compact, translatable age", () => {
  it("uses seconds under a minute", () => {
    expect(formatAgeParts(42_000)).toEqual({ value: 42, unit: "second" });
  });

  it("uses minutes under an hour", () => {
    expect(formatAgeParts(3 * 60_000)).toEqual({ value: 3, unit: "minute" });
  });

  it("uses hours beyond that", () => {
    expect(formatAgeParts(2 * 60 * 60_000)).toEqual({ value: 2, unit: "hour" });
  });

  it("returns nothing when there is no age to show", () => {
    expect(formatAgeParts(null)).toBeNull();
    expect(formatAgeParts(-1)).toBeNull();
  });
});
