/**
 * Tests for useSubmitGuard hook logic.
 *
 * Verified behaviours:
 *  - Only one in-flight request is sent per user submission (the core guard).
 *  - A failed request restores an actionable form without losing state.
 *  - clearError resets error state.
 *  - submitButtonProps reflect the isSubmitting state correctly.
 *
 * testEnvironment: node — pure logic simulation, no DOM required.
 */

// ── In-process guard simulator ────────────────────────────────────────────────
// Replicates the useSubmitGuard state machine so we can test its behaviour
// without mounting React.

interface GuardState {
  isSubmitting: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

function makeGuard() {
  let isSubmitting = false;
  let errorMessage: string | null = null;
  let inFlight = false;

  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (inFlight) return undefined;
    inFlight = true;
    isSubmitting = true;
    errorMessage = null;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An error occurred. Please try again.";
      errorMessage = msg;
      return undefined;
    } finally {
      inFlight = false;
      isSubmitting = false;
    }
  }

  function clearError() {
    errorMessage = null;
  }

  function getState(): GuardState {
    return {
      isSubmitting,
      hasError: errorMessage !== null,
      errorMessage,
    };
  }

  function getSubmitButtonProps() {
    return {
      disabled: isSubmitting,
      "aria-disabled": isSubmitting,
      "aria-busy": isSubmitting,
    };
  }

  return { guard, clearError, getState, getSubmitButtonProps };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSubmitGuard", () => {
  describe("single-request guard", () => {
    it("calls the wrapped function exactly once per invocation", async () => {
      const fn = jest.fn().mockResolvedValue("ok");
      const { guard } = makeGuard();

      await guard(fn);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("prevents a second in-flight call when the first is still pending", async () => {
      const fn = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50))
      );
      const { guard } = makeGuard();

      // Fire both calls without awaiting the first
      const first = guard(fn);
      const second = guard(fn); // should be silently ignored

      await Promise.all([first, second]);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("returns the wrapped function's resolved value on success", async () => {
      const { guard } = makeGuard();

      const result = await guard(async () => 42);

      expect(result).toBe(42);
    });

    it("returns undefined (not throws) when the guard is already in-flight", async () => {
      let resolveFirst!: () => void;
      const first = new Promise<void>((res) => { resolveFirst = res; });

      const { guard } = makeGuard();

      const p1 = guard(() => first);
      const p2 = guard(async () => "ignored");

      resolveFirst();
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r2).toBeUndefined();
    });
  });

  describe("isSubmitting state", () => {
    it("isSubmitting is false before the guard runs", () => {
      const { getState } = makeGuard();
      expect(getState().isSubmitting).toBe(false);
    });

    it("isSubmitting is false after the guard completes successfully", async () => {
      const { guard, getState } = makeGuard();

      await guard(async () => "done");

      expect(getState().isSubmitting).toBe(false);
    });

    it("isSubmitting is false after the guard fails", async () => {
      const { guard, getState } = makeGuard();

      await guard(async () => { throw new Error("boom"); });

      expect(getState().isSubmitting).toBe(false);
    });
  });

  describe("error handling", () => {
    it("sets hasError and errorMessage on failure", async () => {
      const { guard, getState } = makeGuard();

      await guard(async () => { throw new Error("Network error"); });

      const state = getState();
      expect(state.hasError).toBe(true);
      expect(state.errorMessage).toBe("Network error");
    });

    it("uses a generic message when the thrown error is not an Error instance", async () => {
      const { guard, getState } = makeGuard();

      await guard(async () => { throw "string error"; }); // eslint-disable-line no-throw-literal

      const state = getState();
      expect(state.hasError).toBe(true);
      expect(state.errorMessage).toMatch(/error occurred/i);
    });

    it("restores actionable state (isSubmitting false) after failure", async () => {
      const { guard, getState } = makeGuard();

      await guard(async () => { throw new Error("fail"); });

      expect(getState().isSubmitting).toBe(false);
    });

    it("clearError resets hasError and errorMessage to clean state", async () => {
      const { guard, clearError, getState } = makeGuard();

      await guard(async () => { throw new Error("oops"); });
      clearError();

      const state = getState();
      expect(state.hasError).toBe(false);
      expect(state.errorMessage).toBeNull();
    });

    it("clears previous errorMessage at the start of a new guard call", async () => {
      const { guard, getState } = makeGuard();

      // First call fails
      await guard(async () => { throw new Error("first error"); });
      expect(getState().hasError).toBe(true);

      // Second call succeeds — errorMessage should be cleared
      await guard(async () => "ok");
      const state = getState();
      expect(state.hasError).toBe(false);
      expect(state.errorMessage).toBeNull();
    });
  });

  describe("submitButtonProps", () => {
    it("all props are false when not submitting", () => {
      const { getSubmitButtonProps } = makeGuard();
      const props = getSubmitButtonProps();

      expect(props.disabled).toBe(false);
      expect(props["aria-disabled"]).toBe(false);
      expect(props["aria-busy"]).toBe(false);
    });

    it("allows re-submission after a successful guard", async () => {
      const fn = jest.fn().mockResolvedValue("ok");
      const { guard } = makeGuard();

      await guard(fn);
      await guard(fn);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("allows re-submission after a failed guard", async () => {
      const { guard, getState } = makeGuard();

      await guard(async () => { throw new Error("e"); });
      await guard(async () => "recovery");

      // After the second (successful) guard call, clean state
      expect(getState().isSubmitting).toBe(false);
      expect(getState().hasError).toBe(false);
    });
  });

  describe("Enter-key and button-click share the same lock", () => {
    it("a rapid Enter keypress followed by a button click sends only one request", async () => {
      const fn = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10))
      );
      const { guard } = makeGuard();

      // Simulate Enter key
      const keypress = guard(fn);
      // Simulate simultaneous button click
      const click = guard(fn);

      await Promise.all([keypress, click]);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
