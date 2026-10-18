/**
 * @jest-environment jsdom
 *
 * Tests for useInstallPrompt
 *
 * Strategy: exercise the hook through renderHook + act, mocking the relevant
 * browser globals (beforeinstallprompt, appinstalled, localStorage, matchMedia,
 * navigator.serviceWorker, window.isSecureContext).
 */

import { act, renderHook } from "@testing-library/react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  INSTALL_DISMISSAL_STORAGE_KEY,
  INSTALL_DISMISSAL_COOLDOWN_MS,
} from "@/lib/pwaInstall";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DeferredPromptEvent = {
  preventDefault: jest.Mock;
  prompt: jest.Mock;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function makeDeferredPromptEvent(
  outcome: "accepted" | "dismissed" = "accepted",
): DeferredPromptEvent {
  return {
    preventDefault: jest.fn(),
    prompt: jest.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  };
}

function fireEvent(name: string, detail?: unknown) {
  window.dispatchEvent(
    detail
      ? Object.assign(new Event(name), detail)
      : new Event(name),
  );
}

function mockMatchMedia(standalone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query === "(display-mode: standalone)" ? standalone : false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
}

function mockUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    writable: true,
    configurable: true,
    value: ua,
  });
}

function mockServiceWorker(available: boolean) {
  if (available) {
    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: {},
    });
  } else {
    // Remove the property so "serviceWorker" in navigator evaluates to false
    const nav = navigator as unknown as Record<string, unknown>;
    delete nav.serviceWorker;
  }
}

function mockSecureContext(value: boolean) {
  Object.defineProperty(window, "isSecureContext", {
    writable: true,
    configurable: true,
    value,
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  mockMatchMedia(false);
  mockSecureContext(true);
  mockServiceWorker(true);
  mockUserAgent("Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36");
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useInstallPrompt – Android / browser_prompt flow", () => {
  it("starts in unavailable state and becomes available on beforeinstallprompt", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("unavailable");

    act(() => {
      fireEvent("beforeinstallprompt", makeDeferredPromptEvent());
    });

    expect(result.current.state).toBe("available");
  });

  it("shouldShow is false before the browser event fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.shouldShow).toBe(false);
  });

  it("shouldShow becomes true after the event (no prior dismissal)", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      fireEvent("beforeinstallprompt", makeDeferredPromptEvent());
    });
    expect(result.current.shouldShow).toBe(true);
  });

  it("shouldShow is false when the dismissal cooldown is active", () => {
    const now = Date.now();
    localStorage.setItem(INSTALL_DISMISSAL_STORAGE_KEY, String(now));

    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      fireEvent("beforeinstallprompt", makeDeferredPromptEvent());
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it("shouldShow becomes true after the cooldown has elapsed", () => {
    const expired = Date.now() - INSTALL_DISMISSAL_COOLDOWN_MS - 1;
    localStorage.setItem(INSTALL_DISMISSAL_STORAGE_KEY, String(expired));

    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      fireEvent("beforeinstallprompt", makeDeferredPromptEvent());
    });
    expect(result.current.shouldShow).toBe(true);
  });

  it("transitions to accepted when the user accepts the native prompt", async () => {
    const deferred = makeDeferredPromptEvent("accepted");
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      fireEvent("beforeinstallprompt", deferred);
    });

    await act(async () => {
      await result.current.triggerPrompt();
    });

    expect(result.current.state).toBe("accepted");
    expect(deferred.prompt).toHaveBeenCalledTimes(1);
  });

  it("transitions to dismissed when the user rejects the native prompt", async () => {
    const deferred = makeDeferredPromptEvent("dismissed");
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      fireEvent("beforeinstallprompt", deferred);
    });

    await act(async () => {
      await result.current.triggerPrompt();
    });

    expect(result.current.state).toBe("dismissed");
  });

  it("dismiss() records the timestamp in localStorage and hides the prompt", () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      fireEvent("beforeinstallprompt", makeDeferredPromptEvent());
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.state).toBe("dismissed");
    expect(result.current.shouldShow).toBe(false);
    expect(
      localStorage.getItem(INSTALL_DISMISSAL_STORAGE_KEY),
    ).not.toBeNull();
  });

  it("transitions to installed when the appinstalled event fires", () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      fireEvent("appinstalled");
    });

    expect(result.current.state).toBe("installed");
    expect(result.current.shouldShow).toBe(false);
  });
});

describe("useInstallPrompt – iOS flow", () => {
  beforeEach(() => {
    mockUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)");
  });

  it("detects iOS and sets guidance to ios_manual", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.eligibility.guidance).toBe("ios_manual");
  });

  it("becomes available immediately on iOS (no browser event needed)", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("available");
  });

  it("shouldShow is true on iOS when no dismissal is stored", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.shouldShow).toBe(true);
  });

  it("shouldShow is false on iOS when dismissed within the cooldown", () => {
    localStorage.setItem(INSTALL_DISMISSAL_STORAGE_KEY, String(Date.now()));
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.shouldShow).toBe(false);
  });

  it("triggerPrompt is a no-op on iOS (no deferred event)", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    // Should resolve without throwing
    await act(async () => {
      await result.current.triggerPrompt();
    });
    // State stays available — nothing bad happened
    expect(result.current.state).toBe("available");
  });
});

describe("useInstallPrompt – already installed", () => {
  it("stays in installed state when running in standalone mode", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("installed");
    expect(result.current.shouldShow).toBe(false);
  });
});

describe("useInstallPrompt – unsupported environment", () => {
  it("is unsupported when no service worker is available", () => {
    mockServiceWorker(false);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("unsupported");
    expect(result.current.shouldShow).toBe(false);
  });

  it("is unsupported outside a secure context", () => {
    mockSecureContext(false);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("unsupported");
    expect(result.current.shouldShow).toBe(false);
  });
});
