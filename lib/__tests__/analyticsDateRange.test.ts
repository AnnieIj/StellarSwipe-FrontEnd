import { parseAnalyticsRange, serializeAnalyticsRange } from "@/lib/analyticsDateRange";

describe("analytics date range URL state", () => {
  it("round-trips valid inclusive dates", () => {
    const range = { start: new Date(2026, 0, 2), end: new Date(2026, 0, 8) };
    expect(parseAnalyticsRange(serializeAnalyticsRange(range))).toEqual(range);
  });

  it("rejects invalid and reversed ranges", () => {
    expect(parseAnalyticsRange("?start=2026-02-30&end=2026-03-01")).toBeNull();
    expect(parseAnalyticsRange("?start=2026-03-02&end=2026-03-01")).toBeNull();
  });
});