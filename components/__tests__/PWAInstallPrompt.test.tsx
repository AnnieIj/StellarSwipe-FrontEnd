/**
 * @jest-environment jsdom
 *
 * Tests for PWAInstallPrompt
 *
 * The component delegates all logic to useInstallPrompt, so we mock the hook
 * and focus on what the component renders + the interactions it exposes.
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import * as useInstallPromptModule from "@/hooks/useInstallPrompt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockHookReturn = ReturnType<typeof useInstallPromptModule.useInstallPrompt>;

function mockHook(overrides: Partial<MockHookReturn> = {}) {
  const defaults: MockHookReturn = {
    state: "available",
    eligibility: {
      installable: true,
      state: "available",
      reason: null,
      guidance: "browser_prompt",
    },
    shouldShow: true,
    triggerPrompt: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn(),
  };
  jest
    .spyOn(useInstallPromptModule, "useInstallPrompt")
    .mockReturnValue({ ...defaults, ...overrides });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests — Android / browser_prompt flow
// ---------------------------------------------------------------------------

describe("PWAInstallPrompt – Android browser_prompt flow", () => {
  it("renders nothing before the delay elapses", () => {
    mockHook();
    render(<PWAInstallPrompt />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the prompt after the 3-second delay", () => {
    mockHook();
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the correct heading text", () => {
    mockHook();
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(
      screen.getByText(/add stellarswipe to your home screen/i),
    ).toBeInTheDocument();
  });

  it("shows Install app and Not now buttons", () => {
    mockHook();
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByRole("button", { name: /install app/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /not now/i })).toBeInTheDocument();
  });

  it("calls triggerPrompt when Install app is clicked", async () => {
    const triggerPrompt = jest.fn().mockResolvedValue(undefined);
    mockHook({ triggerPrompt });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /install app/i }));
    });
    expect(triggerPrompt).toHaveBeenCalledTimes(1);
  });

  it("calls dismiss when Not now is clicked", () => {
    const dismiss = jest.fn();
    mockHook({ dismiss });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: /not now/i }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("calls dismiss when the × close button is clicked", () => {
    const dismiss = jest.fn();
    mockHook({ dismiss });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: /dismiss install prompt/i }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("hides the prompt after the close button is clicked", () => {
    mockHook();
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: /dismiss install prompt/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — iOS manual-steps flow
// ---------------------------------------------------------------------------

describe("PWAInstallPrompt – iOS ios_manual flow", () => {
  it("renders iOS step-by-step instructions", () => {
    mockHook({
      eligibility: {
        installable: false,
        state: "available",
        reason: "ios_requires_manual_install",
        guidance: "ios_manual",
      },
    });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText(/tap the share icon/i)).toBeInTheDocument();
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  });

  it("shows 'Got it' instead of 'Install app' on iOS", () => {
    mockHook({
      eligibility: {
        installable: false,
        state: "available",
        reason: "ios_requires_manual_install",
        guidance: "ios_manual",
      },
    });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /install app/i })).not.toBeInTheDocument();
  });

  it("calls dismiss when Got it is clicked", () => {
    const dismiss = jest.fn();
    mockHook({
      dismiss,
      eligibility: {
        installable: false,
        state: "available",
        reason: "ios_requires_manual_install",
        guidance: "ios_manual",
      },
    });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests — Suppressed / hidden states
// ---------------------------------------------------------------------------

describe("PWAInstallPrompt – suppressed states", () => {
  it("renders nothing when shouldShow is false", () => {
    mockHook({ shouldShow: false });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when guidance is none", () => {
    mockHook({
      eligibility: {
        installable: false,
        state: "installed",
        reason: "already_installed",
        guidance: "none",
      },
    });
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe("PWAInstallPrompt – accessibility", () => {
  it("has role=dialog with aria-labelledby and aria-describedby", () => {
    mockHook();
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "pwa-install-title");
    expect(dialog).toHaveAttribute("aria-describedby", "pwa-install-description");
  });

  it("close button has a visible accessible label", () => {
    mockHook();
    render(<PWAInstallPrompt />);
    act(() => jest.advanceTimersByTime(3000));
    expect(
      screen.getByRole("button", { name: /dismiss install prompt/i }),
    ).toBeInTheDocument();
  });
});
