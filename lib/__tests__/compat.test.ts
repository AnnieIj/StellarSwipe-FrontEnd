/**
 * Tests for upgrade compatibility shims (lib/compat.ts).
 * Validates that deprecated entry points:
 *   1. Delegate to the current implementation and return correct data.
 *   2. Emit a console.warn deprecation notice.
 *   3. Map legacy params (e.g. `limit` → `pageSize`) correctly.
 */

import { fetchSignalFeed, getSubscriptions } from "@/lib/compat";
import * as api from "@/lib/api";

jest.mock("@/lib/api");

const mockFetchSignals = api.fetchSignals as jest.MockedFunction<typeof api.fetchSignals>;
const mockFetchSubscriptions = api.fetchSubscriptions as jest.MockedFunction<
  typeof api.fetchSubscriptions
>;

const signalPage = {
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
  nextPage: null,
  hasMore: false,
};

const subscriptionsResponse = { subscriptions: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSignals.mockResolvedValue(signalPage);
  mockFetchSubscriptions.mockResolvedValue(subscriptionsResponse);
});

describe("fetchSignalFeed (deprecated shim)", () => {
  it("delegates to fetchSignals and returns its result", async () => {
    const result = await fetchSignalFeed({ page: 1, pageSize: 10 });
    expect(mockFetchSignals).toHaveBeenCalledTimes(1);
    expect(result).toBe(signalPage);
  });

  it("maps legacy `limit` param to `pageSize`", async () => {
    await fetchSignalFeed({ page: 2, limit: 20 });
    expect(mockFetchSignals).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
  });

  it("emits a deprecation warning", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await fetchSignalFeed();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"fetchSignalFeed" is deprecated')
    );
    warnSpy.mockRestore();
  });
});

describe("getSubscriptions (deprecated shim)", () => {
  it("delegates to fetchSubscriptions and returns its result", async () => {
    const result = await getSubscriptions({ status: "active" });
    expect(mockFetchSubscriptions).toHaveBeenCalledWith({ status: "active" });
    expect(result).toBe(subscriptionsResponse);
  });

  it("emits a deprecation warning", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await getSubscriptions();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"getSubscriptions" is deprecated')
    );
    warnSpy.mockRestore();
  });
});

describe("current entry points (fetchSignals, fetchSubscriptions)", () => {
  it("fetchSignals is called directly without deprecation warning", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await api.fetchSignals({ page: 1 });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("fetchSubscriptions is called directly without deprecation warning", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await api.fetchSubscriptions();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
