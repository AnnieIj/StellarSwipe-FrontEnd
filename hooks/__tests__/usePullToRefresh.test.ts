/**
 * @jest-environment jsdom
 *
 * Tests for usePullToRefresh hook.
 * Simulates touch events to verify gesture detection, debouncing, and state updates.
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import {
  usePullToRefresh,
  PULL_TO_REFRESH_THRESHOLD,
  PULL_TO_REFRESH_DEBOUNCE_MS,
} from "@/hooks/usePullToRefresh";

describe("usePullToRefresh – pull-to-refresh gesture detection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a scrollable container for testing
    container = document.createElement("div");
    container.style.height = "300px";
    container.style.overflowY = "auto";
    container.scrollTop = 0;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllTimers();
  });

  it("initializes with zero pull distance and not refreshing", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh: jest.fn(),
      })
    );

    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("does not track pull when container is not at scroll top", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh: jest.fn(),
      })
    );

    // Scroll down
    container.scrollTop = 100;

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 150 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    expect(result.current.pullDistance).toBe(0);
  });

  it("tracks pull distance when at scroll top", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh: jest.fn(),
      })
    );

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 150 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    expect(result.current.pullDistance).toBe(50);
  });

  it("dampens pull distance beyond threshold", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh: jest.fn(),
        threshold: 80,
      })
    );

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      // Pull 80px (at threshold) + 20px more (should be dampened)
      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 200 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    // Distance should be dampened: 80 + (20 * 0.5) = 90
    expect(result.current.pullDistance).toBe(90);
  });

  it("triggers refresh callback when threshold reached", async () => {
    jest.useFakeTimers();
    const onRefresh = jest.fn();

    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh,
        threshold: 80,
      })
    );

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      // Pull to threshold (80px)
      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    act(() => {
      // Release
      const touchEnd = new TouchEvent("touchend", {
        touches: [] as any,
      } as TouchEventInit);
      container.dispatchEvent(touchEnd);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it("does not trigger refresh if threshold not reached", () => {
    const onRefresh = jest.fn();

    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh,
        threshold: 80,
      })
    );

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      // Pull only 50px (below threshold)
      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 150 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);

      // Release
      const touchEnd = new TouchEvent("touchend", {
        touches: [] as any,
      } as TouchEventInit);
      container.dispatchEvent(touchEnd);
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.pullDistance).toBe(0);
  });

  it("debounces refresh while one is in progress", async () => {
    jest.useFakeTimers();
    const onRefresh = jest.fn();

    const { result, rerender } = renderHook(
      ({ disabled }: { disabled: boolean }) =>
        usePullToRefresh({
          container,
          onRefresh,
          disabled,
          threshold: 80,
        }),
      { initialProps: { disabled: false } }
    );

    // First pull
    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    act(() => {
      const touchEnd = new TouchEvent("touchend", {
        touches: [] as any,
      } as TouchEventInit);
      container.dispatchEvent(touchEnd);
    });

    expect(result.current.isRefreshing).toBe(true);

    // Try to pull again immediately (should be blocked)
    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    act(() => {
      const touchEnd = new TouchEvent("touchend", {
        touches: [] as any,
      } as TouchEventInit);
      container.dispatchEvent(touchEnd);
    });

    // Should only have been called once (debounced)
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // After debounce timeout, isRefreshing should be false
    await act(async () => {
      await jest.advanceTimersByTimeAsync(PULL_TO_REFRESH_DEBOUNCE_MS);
    });

    // Re-render to see updated state
    rerender({ disabled: false });

    // Now the hook should allow another refresh
    expect(result.current.isRefreshing).toBe(false);

    jest.useRealTimers();
  });

  it("respects disabled prop", () => {
    const onRefresh = jest.fn();

    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh,
        disabled: true,
      })
    );

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 150 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    expect(result.current.pullDistance).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("resets pull distance on touchend", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh: jest.fn(),
        threshold: 80,
      })
    );

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 150 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    expect(result.current.pullDistance).toBe(50);

    act(() => {
      const touchEnd = new TouchEvent("touchend", {
        touches: [] as any,
      } as TouchEventInit);
      container.dispatchEvent(touchEnd);
    });

    expect(result.current.pullDistance).toBe(0);
  });

  it("handles async refresh callback", async () => {
    jest.useFakeTimers();
    const onRefresh = jest.fn(
      () => new Promise<void>((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh,
        threshold: 80,
      })
    );

    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 } as any],
      } as TouchEventInit);
      container.dispatchEvent(touchMove);
    });

    act(() => {
      const touchEnd = new TouchEvent("touchend", {
        touches: [] as any,
      } as TouchEventInit);
      container.dispatchEvent(touchEnd);
    });

    expect(result.current.isRefreshing).toBe(true);

    // Fast-forward through async operation
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should still be refreshing (debounce time not reached)
    expect(result.current.isRefreshing).toBe(true);

    // Fast-forward through debounce timeout
    act(() => {
      jest.advanceTimersByTime(PULL_TO_REFRESH_DEBOUNCE_MS);
    });

    jest.useRealTimers();
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(container, "removeEventListener");

    const { unmount } = renderHook(() =>
      usePullToRefresh({
        container,
        onRefresh: jest.fn(),
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchend",
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});
