import analyticsService from "@/services/analytics";
import { useAnalyticsConsentStore } from "@/store/useAnalyticsConsentStore";

// Silence console.debug output during tests
beforeAll(() => jest.spyOn(console, "debug").mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

function setConsent(enabled: boolean) {
  useAnalyticsConsentStore.setState({ analyticsEnabled: enabled });
}

describe("analytics consent gating", () => {
  beforeEach(() => setConsent(true));

  it("calls console.debug when analytics is enabled", () => {
    // Use fake timers so scheduleNonBlocking (setTimeout) runs synchronously
    jest.useFakeTimers();
    analyticsService.track("test_event", { key: "value" });
    jest.runAllTimers();
    expect(console.debug).toHaveBeenCalledWith(
      "Analytics Event:",
      "test_event",
      { key: "value" }
    );
    jest.useRealTimers();
  });

  it("suppresses console.debug when analytics is disabled", () => {
    jest.useFakeTimers();
    setConsent(false);
    (console.debug as jest.Mock).mockClear();
    analyticsService.track("test_event");
    jest.runAllTimers();
    expect(console.debug).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("notifies dev listeners when opted in", () => {
    jest.useFakeTimers();
    const { subscribeToAnalyticsEvents } = require("@/services/analytics");
    const listener = jest.fn();
    const unsub = subscribeToAnalyticsEvents(listener);
    analyticsService.track("opted_in_event");
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ name: "opted_in_event" })
    );
    jest.useRealTimers();
    unsub();
  });

  it("does not notify dev listeners when opted out", () => {
    jest.useFakeTimers();
    const { subscribeToAnalyticsEvents } = require("@/services/analytics");
    setConsent(false);
    const listener = jest.fn();
    const unsub = subscribeToAnalyticsEvents(listener);
    analyticsService.track("opted_out_event");
    expect(listener).not.toHaveBeenCalled();
    jest.useRealTimers();
    unsub();
  });

  it("resumes tracking after re-enabling consent", () => {
    jest.useFakeTimers();
    setConsent(false);
    analyticsService.track("should_be_suppressed");

    setConsent(true);
    (console.debug as jest.Mock).mockClear();
    analyticsService.track("should_be_tracked");
    jest.runAllTimers();
    expect(console.debug).toHaveBeenCalledWith(
      "Analytics Event:",
      "should_be_tracked",
      undefined
    );
    jest.useRealTimers();
  });
});
