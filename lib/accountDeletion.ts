/**
 * accountDeletion.ts
 *
 * Types, constants, and pure helpers for the account-deletion workflow.
 *
 * Design goals
 * ─────────────
 * • Every deletion request moves through a finite, trackable state machine.
 * • Financial records and audit logs are retained / anonymised rather than
 *   hard-deleted, satisfying policy requirements (AML, KYC audit trails, etc.).
 * • Idempotency keys prevent double-submission on network retry.
 */

// ─── State machine ────────────────────────────────────────────────────────────

/**
 * The full lifecycle of a deletion request, in order.
 *
 * IDLE        – no pending request
 * REQUESTED   – user has opened the dialog / confirmed intent
 * PENDING     – DELETE request is in-flight
 * COMPLETED   – server confirmed deletion; user will be signed out
 * FAILED      – server returned an error; user may retry
 */
export type DeletionState =
  | "IDLE"
  | "REQUESTED"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

// ─── Retention policy ─────────────────────────────────────────────────────────

/**
 * Records that must be retained even after account deletion, per financial
 * compliance requirements.  These are anonymised rather than erased.
 */
export const RETENTION_CATEGORIES = [
  "trade_history",    // all executed trades (audit trail)
  "tax_records",      // annual tax-reporting snapshots
  "kyc_documents",    // identity-verification artefacts
  "audit_logs",       // authentication and action logs
] as const;

export type RetentionCategory = (typeof RETENTION_CATEGORIES)[number];

export interface RetentionPolicy {
  /** Records we must keep, but will anonymise by replacing PII with the hash. */
  retainAndAnonymise: RetentionCategory[];
  /** Records that may be purged immediately. */
  purge: string[];
  /** Minimum retention period in days (regulatory floor). */
  retentionDays: number;
}

/** Default retention policy applied to every deletion request. */
export const DEFAULT_RETENTION_POLICY: Readonly<RetentionPolicy> = {
  retainAndAnonymise: [...RETENTION_CATEGORIES],
  purge: ["session_tokens", "notification_preferences", "ui_preferences"],
  retentionDays: 2555, // 7 years — typical AML / financial record requirement
};

// ─── Request / response shapes ────────────────────────────────────────────────

export interface DeletionRequest {
  /** Idempotency key — generate once, reuse on retry so the server deduplicates. */
  idempotencyKey: string;
  /** Stellar public key of the authenticated account. */
  publicKey: string;
  /** ISO-8601 timestamp of when the user confirmed deletion. */
  confirmedAt: string;
  /** The retention policy applied to this request. */
  retentionPolicy: RetentionPolicy;
}

export interface DeletionResponse {
  /** Whether deletion was accepted by the server. */
  success: boolean;
  /** Echo of the idempotency key so the client can confirm deduplication. */
  idempotencyKey: string;
  /** ISO-8601 timestamp set by the server. */
  processedAt?: string;
  /** Human-readable message on failure. */
  message?: string;
  /** Structured error code for programmatic handling. */
  errorCode?: DeletionErrorCode;
}

// ─── Error codes ──────────────────────────────────────────────────────────────

export type DeletionErrorCode =
  | "UNAUTHENTICATED"       // no valid session / wallet not connected
  | "ALREADY_DELETED"       // account already deactivated
  | "PENDING_TRANSACTIONS"  // open positions must be closed first
  | "RATE_LIMITED"          // too many requests; back off
  | "SERVER_ERROR";         // unexpected server failure

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Generates a collision-resistant idempotency key.
 * Format: `del_<publicKey_prefix>_<random>_<ts>`
 *
 * Safe to call multiple times — each call returns a **new** key.
 * Callers must cache the key and reuse it on retries.
 */
export function generateIdempotencyKey(publicKey: string): string {
  const prefix = publicKey.slice(0, 8).toLowerCase();
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `del_${prefix}_${random}_${ts}`;
}

/**
 * Returns a SHA-256-like hex placeholder for anonymised PII.
 * In production this would be a real HMAC/SHA-256 of the original value.
 * We keep this synchronous and dependency-free for the front-end boundary.
 */
export function anonymiseValue(value: string): string {
  // Deterministic-looking hash built from char codes — NOT cryptographically
  // strong.  Real anonymisation happens server-side; this is a display helper.
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `anon_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Validates that a deletion request payload is structurally complete before
 * sending it to the API.  Returns a list of validation error messages (empty
 * means valid).
 */
export function validateDeletionRequest(
  req: Partial<DeletionRequest>
): string[] {
  const errors: string[] = [];
  if (!req.idempotencyKey) errors.push("idempotencyKey is required");
  if (!req.publicKey) errors.push("publicKey is required");
  if (!req.confirmedAt) errors.push("confirmedAt is required");
  if (!req.retentionPolicy) errors.push("retentionPolicy is required");
  return errors;
}

/**
 * The phrase the user must type to confirm irreversible deletion.
 * Exporting as a constant makes it easy to assert in tests.
 */
export const DELETION_CONFIRM_PHRASE = "delete my account" as const;
