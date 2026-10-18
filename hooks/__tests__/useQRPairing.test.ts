/**
 * @jest-environment jsdom
 *
 * Fake-timer tests for useQRPairing: code generation/display, TTL-driven
 * expiry, API-error handling, and the success/paired transition.
 *
 * Issue #242 follow-up — the hook previously shipped with no test coverage
 * for its countdown, polling, and status-transition logic.
 */

import { renderHook, act } from "@testing-library/react";
import {
  useQRPairing,
  formatCountdown,
  describeCountdown,
} from "@/hooks/useQRPairing";
import { useWalletStore } from "@/store/useWalletStore";

const QR_TTL_MS = 120_000;
const POLL_MS = 2_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pendingResponse(): Response {
  return new Response(null, { status: 404 });
}

/** A fetch response the test resolves manually, to simulate a slow network. */
function deferredResponse() {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const PUBLIC_KEY = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS";

/** Advance fake timers and flush pending promise reactions from the poll. */
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe("useQRPairing", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    useWalletStore.setState({
      wallets: [],
      activePublicKey: null,
      publicKey: null,
      isConnected: false,
      network: "TESTNET",
    });
    fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(pendingResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchSpy.mockRestore();
  });

  it("generates and displays a pairing code when a session starts", () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.sessionId).toBeTruthy();
    expect(result.current.uri).toBe(
      `stellarswipe://pair?s=${result.current.sessionId}&o=${encodeURIComponent(
        window.location.origin
      )}`
    );
    expect(result.current.secondsLeft).toBe(QR_TTL_MS / 1000);
    expect(result.current.errorMessage).toBeNull();
  });

  it("expires the code once the TTL elapses and stops polling", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    // Just before expiry: still pending.
    await advance(QR_TTL_MS - 1_000);
    expect(result.current.status).toBe("pending");

    await advance(1_000);
    expect(result.current.status).toBe("expired");
    expect(result.current.errorMessage).toMatch(/expired/i);
    expect(result.current.secondsLeft).toBe(0);

    const callsAtExpiry = fetchSpy.mock.calls.length;
    await advance(POLL_MS * 3);
    expect(fetchSpy.mock.calls.length).toBe(callsAtExpiry); // polling has stopped
  });

  it("regenerating after expiry returns to pending with a fresh code and full TTL", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });
    const firstSessionId = result.current.sessionId;

    await advance(QR_TTL_MS);
    expect(result.current.status).toBe("expired");

    act(() => {
      result.current.regenerate();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.secondsLeft).toBe(QR_TTL_MS / 1000);
    expect(result.current.sessionId).not.toBe(firstSessionId);
    expect(result.current.errorMessage).toBeNull();
  });

  it("surfaces a distinct error state when the pairing API errors, with a retry path", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    fetchSpy.mockResolvedValue(new Response(null, { status: 500 }));

    await advance(POLL_MS);

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/error occurred/i);
    expect(result.current.status).not.toBe("expired");
    expect(result.current.status).not.toBe("rejected");

    // Retry: regenerate() (the "New code" action) takes it back to pending.
    fetchSpy.mockResolvedValue(pendingResponse());
    act(() => {
      result.current.regenerate();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.errorMessage).toBeNull();
  });

  it("surfaces a rejected state distinct from a generic error", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    fetchSpy.mockResolvedValue(jsonResponse({ status: "rejected" }));
    await advance(POLL_MS);

    expect(result.current.status).toBe("rejected");
    expect(result.current.errorMessage).toMatch(/rejected/i);
  });

  it("transitions to the paired/connected state on a successful pairing event", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    const publicKey = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS";
    fetchSpy.mockResolvedValue(
      jsonResponse({ status: "paired", publicKey })
    );

    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    await advance(POLL_MS);

    expect(result.current.status).toBe("paired");
    expect(result.current.publicKey).toBe(publicKey);
    expect(useWalletStore.getState().publicKey).toBe(publicKey);
    expect(useWalletStore.getState().isConnected).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "wallet-connected" })
    );

    // Polling/countdown stop once paired.
    const callsAtPaired = fetchSpy.mock.calls.length;
    await advance(POLL_MS * 3);
    expect(fetchSpy.mock.calls.length).toBe(callsAtPaired);

    dispatchSpy.mockRestore();
  });

  it("cancel resets the session to idle and stops timers", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });
    await advance(POLL_MS);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.uri).toBeNull();
    expect(result.current.sessionId).toBeNull();

    const callsAtCancel = fetchSpy.mock.calls.length;
    await advance(QR_TTL_MS);
    expect(fetchSpy.mock.calls.length).toBe(callsAtCancel);
    expect(result.current.status).toBe("idle");
  });
  describe("countdown formatting (#801)", () => {
    it("formats a readable m:ss label", () => {
      expect(formatCountdown(120)).toBe("2:00");
      expect(formatCountdown(65)).toBe("1:05");
      expect(formatCountdown(9)).toBe("0:09");
      expect(formatCountdown(-3)).toBe("0:00");
    });

    it("describes the countdown in words for screen readers", () => {
      expect(describeCountdown(120)).toBe("2 minutes");
      expect(describeCountdown(61)).toBe("1 minute 1 second");
      expect(describeCountdown(30)).toBe("30 seconds");
      expect(describeCountdown(0)).toBe("0 seconds");
    });
  });

  it("exposes the expiry time of the current code", () => {
    const { result } = renderHook(() => useQRPairing());
    const before = Date.now();

    act(() => {
      result.current.startSession();
    });

    expect(result.current.expiresAt).toBe(before + QR_TTL_MS);
  });

  it("requestNewCode after expiry replaces the old code and restarts the countdown", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });
    const firstUri = result.current.uri;

    await advance(QR_TTL_MS);
    expect(result.current.status).toBe("expired");

    act(() => {
      result.current.requestNewCode();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.uri).not.toBe(firstUri);
    expect(result.current.secondsLeft).toBe(QR_TTL_MS / 1000);

    // The new code counts down and polls normally.
    const callsAtRenewal = fetchSpy.mock.calls.length;
    await advance(POLL_MS * 2);
    expect(result.current.secondsLeft).toBe(QR_TTL_MS / 1000 - 4);
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsAtRenewal);
  });

  it("ignores a paired response that arrives after the code expired", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    // Let the last poll before expiry hang.
    await advance(QR_TTL_MS - POLL_MS - 1);
    const slow = deferredResponse();
    fetchSpy.mockReturnValueOnce(slow.promise);
    await advance(1); // poll fires at TTL - POLL_MS, request in flight
    await advance(POLL_MS); // TTL reached → expired

    expect(result.current.status).toBe("expired");

    // The wallet answers late.
    await act(async () => {
      slow.resolve(jsonResponse({ status: "paired", publicKey: PUBLIC_KEY }));
    });
    await advance(0);

    expect(result.current.status).toBe("expired");
    expect(result.current.publicKey).toBeNull();
    expect(useWalletStore.getState().isConnected).toBe(false);
    expect(useWalletStore.getState().publicKey).toBeNull();
  });

  it("ignores a late response from a replaced session and keeps the new code", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });
    const firstSessionId = result.current.sessionId;

    const slow = deferredResponse();
    fetchSpy.mockReturnValueOnce(slow.promise);
    await advance(POLL_MS); // first session's poll is in flight

    act(() => {
      result.current.regenerate();
    });
    const secondSessionId = result.current.sessionId;
    const secondUri = result.current.uri;
    expect(secondSessionId).not.toBe(firstSessionId);

    // Old session's response resolves after the replacement.
    await act(async () => {
      slow.resolve(jsonResponse({ status: "paired", publicKey: PUBLIC_KEY }));
    });
    await advance(0);

    expect(result.current.status).toBe("pending");
    expect(result.current.sessionId).toBe(secondSessionId);
    expect(result.current.uri).toBe(secondUri);
    expect(useWalletStore.getState().isConnected).toBe(false);

    // The new session can still pair normally.
    fetchSpy.mockResolvedValue(jsonResponse({ status: "paired", publicKey: PUBLIC_KEY }));
    await advance(POLL_MS);

    expect(result.current.status).toBe("paired");
    expect(result.current.sessionId).toBe(secondSessionId);
    expect(useWalletStore.getState().publicKey).toBe(PUBLIC_KEY);
  });

  it("ignores a late response after cancel", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    const slow = deferredResponse();
    fetchSpy.mockReturnValueOnce(slow.promise);
    await advance(POLL_MS);

    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      slow.resolve(jsonResponse({ status: "paired", publicKey: PUBLIC_KEY }));
    });
    await advance(0);

    expect(result.current.status).toBe("idle");
    expect(useWalletStore.getState().isConnected).toBe(false);
  });

  it("does not start overlapping polls while a request is in flight", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    const slow = deferredResponse();
    fetchSpy.mockReturnValueOnce(slow.promise);
    await advance(POLL_MS);
    const callsWhileInFlight = fetchSpy.mock.calls.length;

    await advance(POLL_MS * 3);
    expect(fetchSpy.mock.calls.length).toBe(callsWhileInFlight);

    await act(async () => {
      slow.resolve(pendingResponse());
    });
    await advance(POLL_MS);
    expect(fetchSpy.mock.calls.length).toBe(callsWhileInFlight + 1);
  });

  it("moves to the scanning state when the wallet reports a scan", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    fetchSpy.mockResolvedValue(jsonResponse({ status: "scanning" }));
    await advance(POLL_MS);

    expect(result.current.status).toBe("scanning");

    // A scanned-but-unapproved code still expires.
    await advance(QR_TTL_MS);
    expect(result.current.status).toBe("expired");
  });
});
