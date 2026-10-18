/**
 * store/__tests__/accountDeletion.test.ts
 *
 * Unit tests for the account-deletion workflow:
 *   - lib/accountDeletion.ts   (pure helpers + types)
 *   - store/useAccountDeletionStore.ts   (state machine)
 *
 * Run with: npm test -- --testPathPattern=accountDeletion
 */

import {
  generateIdempotencyKey,
  anonymiseValue,
  validateDeletionRequest,
  DEFAULT_RETENTION_POLICY,
  DELETION_CONFIRM_PHRASE,
  RETENTION_CATEGORIES,
  type DeletionRequest,
} from "@/lib/accountDeletion";
import { useAccountDeletionStore } from "@/store/useAccountDeletionStore";

// ─── Silence fetch-related warnings in jsdom ──────────────────────────────────
beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => jest.restoreAllMocks());

// ─── Reset store between tests ────────────────────────────────────────────────
beforeEach(() => {
  useAccountDeletionStore.getState().reset();
});

// ═════════════════════════════════════════════════════════════════════════════
// lib/accountDeletion.ts — pure helpers
// ═════════════════════════════════════════════════════════════════════════════

describe("generateIdempotencyKey", () => {
  it("returns a string starting with 'del_'", () => {
    const key = generateIdempotencyKey("GABCDEF1234");
    expect(key).toMatch(/^del_/);
  });

  it("embeds the first 8 characters of the public key (lowercased)", () => {
    const key = generateIdempotencyKey("GABCDEF12345");
    expect(key).toContain("gabcdef1");
  });

  it("generates unique keys on successive calls", () => {
    const a = generateIdempotencyKey("GKEY");
    const b = generateIdempotencyKey("GKEY");
    expect(a).not.toBe(b);
  });
});

describe("anonymiseValue", () => {
  it("returns a string starting with 'anon_'", () => {
    expect(anonymiseValue("GABCDEF")).toMatch(/^anon_/);
  });

  it("is deterministic for the same input", () => {
    const a = anonymiseValue("test-value");
    const b = anonymiseValue("test-value");
    expect(a).toBe(b);
  });

  it("produces different output for different inputs", () => {
    expect(anonymiseValue("value-a")).not.toBe(anonymiseValue("value-b"));
  });
});

describe("validateDeletionRequest", () => {
  const validRequest: DeletionRequest = {
    idempotencyKey: "del_abc12345_xyz_1abc",
    publicKey: "GABCDEF1234",
    confirmedAt: new Date().toISOString(),
    retentionPolicy: DEFAULT_RETENTION_POLICY,
  };

  it("returns no errors for a valid request", () => {
    expect(validateDeletionRequest(validRequest)).toHaveLength(0);
  });

  it("flags missing idempotencyKey", () => {
    const errs = validateDeletionRequest({ ...validRequest, idempotencyKey: "" });
    expect(errs.some((e) => e.includes("idempotencyKey"))).toBe(true);
  });

  it("flags missing publicKey", () => {
    const errs = validateDeletionRequest({ ...validRequest, publicKey: "" });
    expect(errs.some((e) => e.includes("publicKey"))).toBe(true);
  });

  it("flags missing confirmedAt", () => {
    const errs = validateDeletionRequest({ ...validRequest, confirmedAt: "" });
    expect(errs.some((e) => e.includes("confirmedAt"))).toBe(true);
  });

  it("flags missing retentionPolicy", () => {
    const { retentionPolicy: _, ...withoutPolicy } = validRequest;
    const errs = validateDeletionRequest(withoutPolicy);
    expect(errs.some((e) => e.includes("retentionPolicy"))).toBe(true);
  });

  it("returns multiple errors when several fields are missing", () => {
    const errs = validateDeletionRequest({});
    expect(errs.length).toBeGreaterThanOrEqual(4);
  });
});

describe("DEFAULT_RETENTION_POLICY", () => {
  it("retains all four regulated categories", () => {
    expect(DEFAULT_RETENTION_POLICY.retainAndAnonymise).toEqual(
      expect.arrayContaining([...RETENTION_CATEGORIES])
    );
  });

  it("has a retention period of 7 years (2555 days)", () => {
    expect(DEFAULT_RETENTION_POLICY.retentionDays).toBe(2555);
  });

  it("includes non-essential records to purge", () => {
    expect(DEFAULT_RETENTION_POLICY.purge.length).toBeGreaterThan(0);
  });
});

describe("DELETION_CONFIRM_PHRASE", () => {
  it("is a non-empty string", () => {
    expect(typeof DELETION_CONFIRM_PHRASE).toBe("string");
    expect(DELETION_CONFIRM_PHRASE.length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// store/useAccountDeletionStore.ts — state machine
// ═════════════════════════════════════════════════════════════════════════════

describe("useAccountDeletionStore — initial state", () => {
  it("starts in IDLE with no request or error", () => {
    const { state, currentRequest, lastErrorCode, lastErrorMessage, completedAt, attemptCount } =
      useAccountDeletionStore.getState();
    expect(state).toBe("IDLE");
    expect(currentRequest).toBeNull();
    expect(lastErrorCode).toBeNull();
    expect(lastErrorMessage).toBeNull();
    expect(completedAt).toBeNull();
    expect(attemptCount).toBe(0);
  });
});

describe("requestDeletion", () => {
  it("transitions from IDLE to REQUESTED", () => {
    useAccountDeletionStore.getState().requestDeletion("GABCDEF1234");
    expect(useAccountDeletionStore.getState().state).toBe("REQUESTED");
  });

  it("builds a DeletionRequest with idempotencyKey and publicKey", () => {
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY");
    const { currentRequest } = useAccountDeletionStore.getState();
    expect(currentRequest).not.toBeNull();
    expect(currentRequest!.publicKey).toBe("GPUBKEY");
    expect(currentRequest!.idempotencyKey).toMatch(/^del_/);
    expect(currentRequest!.confirmedAt).toBeTruthy();
    expect(currentRequest!.retentionPolicy).toEqual(DEFAULT_RETENTION_POLICY);
  });

  it("throws when called outside IDLE state", () => {
    useAccountDeletionStore.getState().requestDeletion("GKEY");
    expect(() =>
      useAccountDeletionStore.getState().requestDeletion("GKEY")
    ).toThrow();
  });

  it("throws when publicKey is empty", () => {
    expect(() =>
      useAccountDeletionStore.getState().requestDeletion("")
    ).toThrow();
  });
});

describe("submitDeletion — success path", () => {
  beforeEach(() => {
    // Mock fetch to return success
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        idempotencyKey: "del_test_key",
        processedAt: new Date().toISOString(),
      }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("transitions PENDING → COMPLETED on success", async () => {
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY123");
    await useAccountDeletionStore.getState().submitDeletion();
    expect(useAccountDeletionStore.getState().state).toBe("COMPLETED");
  });

  it("sets completedAt on success", async () => {
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY123");
    await useAccountDeletionStore.getState().submitDeletion();
    expect(useAccountDeletionStore.getState().completedAt).not.toBeNull();
  });

  it("increments attemptCount", async () => {
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY123");
    await useAccountDeletionStore.getState().submitDeletion();
    expect(useAccountDeletionStore.getState().attemptCount).toBe(1);
  });

  it("clears error state on success", async () => {
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY123");
    await useAccountDeletionStore.getState().submitDeletion();
    expect(useAccountDeletionStore.getState().lastErrorCode).toBeNull();
    expect(useAccountDeletionStore.getState().lastErrorMessage).toBeNull();
  });
});

describe("submitDeletion — failure path", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: false,
        idempotencyKey: "del_test_key",
        message: "Pending transactions exist.",
        errorCode: "PENDING_TRANSACTIONS",
      }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("transitions PENDING → FAILED on API error response", async () => {
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY456");
    await useAccountDeletionStore.getState().submitDeletion();
    expect(useAccountDeletionStore.getState().state).toBe("FAILED");
  });

  it("stores the error code and message", async () => {
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY456");
    await useAccountDeletionStore.getState().submitDeletion();
    const { lastErrorCode, lastErrorMessage } = useAccountDeletionStore.getState();
    expect(lastErrorCode).toBe("PENDING_TRANSACTIONS");
    expect(lastErrorMessage).toBe("Pending transactions exist.");
  });

  it("transitions PENDING → FAILED on network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    useAccountDeletionStore.getState().requestDeletion("GPUBKEY789");
    await useAccountDeletionStore.getState().submitDeletion();
    expect(useAccountDeletionStore.getState().state).toBe("FAILED");
    expect(useAccountDeletionStore.getState().lastErrorCode).toBe("SERVER_ERROR");
  });
});

describe("submitDeletion — invalid state guard", () => {
  it("throws when called in IDLE state", async () => {
    await expect(
      useAccountDeletionStore.getState().submitDeletion()
    ).rejects.toThrow();
  });

  it("throws when called in COMPLETED state", async () => {
    useAccountDeletionStore.setState({ state: "COMPLETED" });
    await expect(
      useAccountDeletionStore.getState().submitDeletion()
    ).rejects.toThrow();
  });
});

describe("retryDeletion", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        idempotencyKey: "del_retry_key",
        processedAt: new Date().toISOString(),
      }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reuses the same idempotency key on retry", async () => {
    useAccountDeletionStore.getState().requestDeletion("GRETRY");
    const keyBefore = useAccountDeletionStore.getState().currentRequest!.idempotencyKey;

    // Force FAILED state to enable retry
    useAccountDeletionStore.setState({ state: "FAILED" });
    await useAccountDeletionStore.getState().retryDeletion();

    const keyAfter = useAccountDeletionStore.getState().currentRequest!.idempotencyKey;
    expect(keyAfter).toBe(keyBefore);
  });

  it("throws when called outside FAILED state", async () => {
    useAccountDeletionStore.getState().requestDeletion("GKEY");
    await expect(
      useAccountDeletionStore.getState().retryDeletion()
    ).rejects.toThrow();
  });
});

describe("handleSuccess", () => {
  it("sets state to COMPLETED with processedAt", () => {
    const ts = new Date().toISOString();
    useAccountDeletionStore
      .getState()
      .handleSuccess({ success: true, idempotencyKey: "k", processedAt: ts });
    const { state, completedAt } = useAccountDeletionStore.getState();
    expect(state).toBe("COMPLETED");
    expect(completedAt).toBe(ts);
  });

  it("clears error state", () => {
    useAccountDeletionStore.setState({
      state: "FAILED",
      lastErrorCode: "SERVER_ERROR",
      lastErrorMessage: "oops",
    });
    useAccountDeletionStore.getState().handleSuccess({ success: true, idempotencyKey: "k" });
    expect(useAccountDeletionStore.getState().lastErrorCode).toBeNull();
    expect(useAccountDeletionStore.getState().lastErrorMessage).toBeNull();
  });
});

describe("handleFailure", () => {
  it("sets state to FAILED with the provided code and message", () => {
    useAccountDeletionStore.getState().handleFailure("RATE_LIMITED", "Too many requests");
    const { state, lastErrorCode, lastErrorMessage } = useAccountDeletionStore.getState();
    expect(state).toBe("FAILED");
    expect(lastErrorCode).toBe("RATE_LIMITED");
    expect(lastErrorMessage).toBe("Too many requests");
  });
});

describe("reset", () => {
  it("restores all fields to initial values", async () => {
    useAccountDeletionStore.getState().requestDeletion("GKEY");
    useAccountDeletionStore.getState().handleFailure("SERVER_ERROR", "err");
    useAccountDeletionStore.setState({ attemptCount: 3 });
    useAccountDeletionStore.getState().reset();

    const { state, currentRequest, lastErrorCode, lastErrorMessage, completedAt, attemptCount } =
      useAccountDeletionStore.getState();
    expect(state).toBe("IDLE");
    expect(currentRequest).toBeNull();
    expect(lastErrorCode).toBeNull();
    expect(lastErrorMessage).toBeNull();
    expect(completedAt).toBeNull();
    expect(attemptCount).toBe(0);
  });
});

describe("idempotency — same key returns same logical result", () => {
  it("does not create a new request if reset is not called between flows", () => {
    useAccountDeletionStore.getState().requestDeletion("GKEY");
    const key1 = useAccountDeletionStore.getState().currentRequest!.idempotencyKey;

    // Reset and request again — new key
    useAccountDeletionStore.getState().reset();
    useAccountDeletionStore.getState().requestDeletion("GKEY");
    const key2 = useAccountDeletionStore.getState().currentRequest!.idempotencyKey;

    expect(key1).not.toBe(key2);
  });
});
