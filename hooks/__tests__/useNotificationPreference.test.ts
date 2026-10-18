/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useNotificationPreference } from "../useNotificationPreference";

describe("useNotificationPreference hook", () => {
  beforeAll(() => {
    const mockCache = {
      put: jest.fn().mockResolvedValue(undefined),
    };
    const mockCacheStorage = {
      open: jest.fn().mockResolvedValue(mockCache),
    };
    Object.defineProperty(window, "caches", {
      value: mockCacheStorage,
      writable: true,
    });
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("loads default category preferences when localStorage is empty", () => {
    const { result } = renderHook(() => useNotificationPreference());

    expect(result.current.categoryPreferences).toEqual({
      priceAlerts: true,
      newSignals: true,
      systemUpdates: true,
    });
  });

  it("can toggle categories independently and persist them", () => {
    const { result } = renderHook(() => useNotificationPreference());

    act(() => {
      result.current.toggleCategory("priceAlerts", false);
    });

    expect(result.current.categoryPreferences.priceAlerts).toBe(false);
    expect(result.current.categoryPreferences.newSignals).toBe(true);
    expect(result.current.categoryPreferences.systemUpdates).toBe(true);

    const stored = localStorage.getItem("stellarswipe:notification-categories");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({
      priceAlerts: false,
      newSignals: true,
      systemUpdates: true,
    });

    act(() => {
      result.current.toggleCategory("newSignals", false);
    });

    expect(result.current.categoryPreferences.priceAlerts).toBe(false);
    expect(result.current.categoryPreferences.newSignals).toBe(false);
    expect(result.current.categoryPreferences.systemUpdates).toBe(true);

    act(() => {
      result.current.toggleCategory("priceAlerts", true);
    });

    expect(result.current.categoryPreferences.priceAlerts).toBe(true);
    expect(result.current.categoryPreferences.newSignals).toBe(false);
    expect(result.current.categoryPreferences.systemUpdates).toBe(true);
  });

  it("respects pre-existing categories in localStorage upon initialization", () => {
    const initialPrefs = {
      priceAlerts: false,
      newSignals: true,
      systemUpdates: false,
    };
    localStorage.setItem(
      "stellarswipe:notification-categories",
      JSON.stringify(initialPrefs)
    );

    const { result } = renderHook(() => useNotificationPreference());

    expect(result.current.categoryPreferences).toEqual(initialPrefs);
  });
});
