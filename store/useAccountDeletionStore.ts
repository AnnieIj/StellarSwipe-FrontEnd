/**
 * useAccountDeletionStore.ts
 *
 * Zustand store that drives the account-deletion state machine.
 *
 * State transitions
 * ──────────────────
 *   IDLE → REQUESTED  (requestDeletion)
 *   REQUESTED → PENDING  (submitDeletion — starts API call)
 *   PENDING → COMPLETED  (handleSuccess)
 *   PENDING → FAILED     (handleFailure)
 *   FAILED  → PENDING    (retryDeletion — reuses same idempotency key)
 *   any     → IDLE       (reset)
 *
 * Idempotency
 * ───────────
 * The idempotency key is generated once on `requestDeletion` and kept
 * until `reset` is called.  `retryDeletion` resubmits with the same key
 * so the server can deduplicate.
 */

import { create } from "zustand";
import {
  type DeletionState,
  type DeletionRequest,
  type DeletionResponse,
  type DeletionErrorCode,
  DEFAULT_RETENTION_POLICY,
  generateIdempotencyKey,
  validateDeletionRequest,
} from "@/lib/accountDeletion";

// ─── Shape ────────────────────────────────────────────────────────────────────

export interface AccountDeletionState {
  /** Current position in the deletion state machine. */
  state: DeletionState;

  /** The pending deletion request (set once, reused on retry). */
  currentRequest: DeletionRequest | null;

  /** Last error code returned by the API. */
  lastErrorCode: DeletionErrorCode | null;

  /** Human-readable error message from the API. */
  lastErrorMessage: string | null;

  /** ISO-8601 timestamp when the server confirmed the deletion. */
  completedAt: string | null;

  /** How many times we have attempted to submit (for retry back-off UI). */
  attemptCount: number;

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Move from IDLE → REQUESTED and build the idempotency key.
   * Validates `publicKey` before proceeding.
   * Throws if the store is not in IDLE state (prevents duplicate flows).
   */
  requestDeletion: (publicKey: string) => void;

  /**
   * Move from REQUESTED/FAILED → PENDING and call the DELETE API.
   * Returns the server response so the dialog can react without re-reading
   * store state inside an effect.
   */
  submitDeletion: () => Promise<DeletionResponse>;

  /**
   * Retry after a FAILED state.  Reuses the stored idempotency key.
   * Calls `submitDeletion` internally.
   */
  retryDeletion: () => Promise<DeletionResponse>;

  /**
   * Move to COMPLETED with the server timestamp.
   */
  handleSuccess: (response: DeletionResponse) => void;

  /**
   * Move to FAILED with an error code and message.
   */
  handleFailure: (code: DeletionErrorCode, message: string) => void;

  /**
   * Reset the store back to IDLE, clearing all transient state.
   * Call this when the dialog is closed without completing.
   */
  reset: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: Pick<
  AccountDeletionState,
  | "state"
  | "currentRequest"
  | "lastErrorCode"
  | "lastErrorMessage"
  | "completedAt"
  | "attemptCount"
> = {
  state: "IDLE",
  currentRequest: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  completedAt: null,
  attemptCount: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAccountDeletionStore = create<AccountDeletionState>()(
  (set, get) => ({
    ...INITIAL_STATE,

    // ── requestDeletion ───────────────────────────────────────────────────────
    requestDeletion(publicKey: string) {
      const { state } = get();
      if (state !== "IDLE") {
        throw new Error(
          `requestDeletion called in invalid state "${state}". Reset first.`
        );
      }
      if (!publicKey) {
        throw new Error("publicKey is required to request account deletion.");
      }

      const request: DeletionRequest = {
        idempotencyKey: generateIdempotencyKey(publicKey),
        publicKey,
        confirmedAt: new Date().toISOString(),
        retentionPolicy: DEFAULT_RETENTION_POLICY,
      };

      set({ state: "REQUESTED", currentRequest: request });
    },

    // ── submitDeletion ────────────────────────────────────────────────────────
    async submitDeletion(): Promise<DeletionResponse> {
      const { state, currentRequest, attemptCount } = get();

      if (state !== "REQUESTED" && state !== "FAILED") {
        const msg = `submitDeletion called in invalid state "${state}".`;
        throw new Error(msg);
      }
      if (!currentRequest) {
        throw new Error("No deletion request found. Call requestDeletion first.");
      }

      // Validate before hitting the network
      const errors = validateDeletionRequest(currentRequest);
      if (errors.length > 0) {
        const msg = `Invalid deletion request: ${errors.join(", ")}`;
        get().handleFailure("SERVER_ERROR", msg);
        return { success: false, idempotencyKey: currentRequest.idempotencyKey, message: msg };
      }

      set({ state: "PENDING", attemptCount: attemptCount + 1 });

      try {
        const res = await fetch("/api/account/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentRequest),
        });

        const data: DeletionResponse = await res.json();

        if (data.success) {
          get().handleSuccess(data);
        } else {
          get().handleFailure(
            data.errorCode ?? "SERVER_ERROR",
            data.message ?? "Deletion failed. Please try again."
          );
        }

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error — check your connection.";
        get().handleFailure("SERVER_ERROR", message);
        return {
          success: false,
          idempotencyKey: currentRequest.idempotencyKey,
          message,
          errorCode: "SERVER_ERROR",
        };
      }
    },

    // ── retryDeletion ─────────────────────────────────────────────────────────
    async retryDeletion(): Promise<DeletionResponse> {
      const { state } = get();
      if (state !== "FAILED") {
        throw new Error(`retryDeletion called in state "${state}". Only valid after FAILED.`);
      }
      // Re-enter REQUESTED so submitDeletion accepts the call
      set({ state: "REQUESTED" });
      return get().submitDeletion();
    },

    // ── handleSuccess ─────────────────────────────────────────────────────────
    handleSuccess(response: DeletionResponse) {
      set({
        state: "COMPLETED",
        completedAt: response.processedAt ?? new Date().toISOString(),
        lastErrorCode: null,
        lastErrorMessage: null,
      });
    },

    // ── handleFailure ─────────────────────────────────────────────────────────
    handleFailure(code: DeletionErrorCode, message: string) {
      set({
        state: "FAILED",
        lastErrorCode: code,
        lastErrorMessage: message,
      });
    },

    // ── reset ─────────────────────────────────────────────────────────────────
    reset() {
      set(INITIAL_STATE);
    },
  })
);
