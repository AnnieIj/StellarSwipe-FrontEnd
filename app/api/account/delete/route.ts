/**
 * app/api/account/delete/route.ts
 *
 * DELETE /api/account/delete
 *
 * Accepts a DeletionRequest body and initiates the account-deactivation
 * process.  The handler:
 *
 *  1. Validates authentication (publicKey must be present in the request).
 *  2. Validates the request payload via validateDeletionRequest.
 *  3. Deduplicates repeated submissions using the idempotency key.
 *  4. Applies the retention policy — retained records are anonymised,
 *     non-essential records are scheduled for purge.
 *  5. Traces the worker span via worker-tracing.service.
 *
 * NOTE: In this front-end demo the "deletion" is simulated.  Replace the
 * `performAccountDeletion` stub with your actual Soroban / back-end call.
 */

import { NextRequest, NextResponse } from "next/server";
import { traceWorker } from "@/src/tracing/worker-tracing.service";
import {
  type DeletionRequest,
  type DeletionResponse,
  type DeletionErrorCode,
  validateDeletionRequest,
  anonymiseValue,
  DEFAULT_RETENTION_POLICY,
} from "@/lib/accountDeletion";

// ─── In-memory idempotency store ──────────────────────────────────────────────
// In production replace with Redis or a DB-backed idempotency table keyed
// by (idempotencyKey, publicKey).
const processedKeys = new Map<string, DeletionResponse>();

// ─── Route handler ────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: Partial<DeletionRequest>;

  // ── 1. Parse body ───────────────────────────────────────────────────────────
  try {
    body = (await req.json()) as Partial<DeletionRequest>;
  } catch {
    return NextResponse.json<DeletionResponse>(
      {
        success: false,
        idempotencyKey: "",
        message: "Request body must be valid JSON.",
        errorCode: "SERVER_ERROR",
      },
      { status: 400 }
    );
  }

  // ── 2. Authenticate ────────────────────────────────────────────────────────
  if (!body.publicKey) {
    return NextResponse.json<DeletionResponse>(
      {
        success: false,
        idempotencyKey: body.idempotencyKey ?? "",
        message: "Unauthenticated: publicKey is required.",
        errorCode: "UNAUTHENTICATED" as DeletionErrorCode,
      },
      { status: 401 }
    );
  }

  // ── 3. Validate payload ────────────────────────────────────────────────────
  const validationErrors = validateDeletionRequest(body);
  if (validationErrors.length > 0) {
    return NextResponse.json<DeletionResponse>(
      {
        success: false,
        idempotencyKey: body.idempotencyKey ?? "",
        message: `Validation failed: ${validationErrors.join("; ")}`,
        errorCode: "SERVER_ERROR",
      },
      { status: 422 }
    );
  }

  const request = body as DeletionRequest;

  // ── 4. Idempotency check ───────────────────────────────────────────────────
  const prior = processedKeys.get(request.idempotencyKey);
  if (prior) {
    // Return the same response as the original — do not re-process.
    return NextResponse.json<DeletionResponse>(prior, { status: 200 });
  }

  // ── 5. Process deletion with tracing ───────────────────────────────────────
  return traceWorker(
    "worker:account:delete",
    async () => {
      const result = await performAccountDeletion(request);
      // Cache for idempotency
      processedKeys.set(request.idempotencyKey, result);
      return NextResponse.json<DeletionResponse>(result, {
        status: result.success ? 200 : 500,
      });
    },
    { publicKey: anonymiseValue(request.publicKey) }
  );
}

// ─── Deletion business logic ──────────────────────────────────────────────────

/**
 * Performs the actual account deletion.
 *
 * Steps:
 *  1. Check for pending on-chain transactions (simulate guard).
 *  2. Anonymise retained records per the retention policy.
 *  3. Schedule purge of non-essential records.
 *  4. Deactivate the account.
 *
 * Replace this stub with real Soroban / database calls.
 */
async function performAccountDeletion(
  request: DeletionRequest
): Promise<DeletionResponse> {
  const { publicKey, idempotencyKey, retentionPolicy } = request;

  // Simulate guard: open positions must be closed before deletion
  const hasPendingTransactions = await checkPendingTransactions(publicKey);
  if (hasPendingTransactions) {
    return {
      success: false,
      idempotencyKey,
      message:
        "Cannot delete account while there are pending transactions. " +
        "Close all open positions first.",
      errorCode: "PENDING_TRANSACTIONS",
    };
  }

  // Anonymise retained records (financial + audit)
  const anonymisedRecords = retentionPolicy.retainAndAnonymise.map(
    (category) => ({
      category,
      anonymisedKey: anonymiseValue(`${publicKey}:${category}`),
    })
  );

  // Schedule non-essential records for purge (simulated)
  const purgedRecords = retentionPolicy.purge.map((category) => ({
    category,
    scheduledFor: new Date(
      Date.now() + retentionPolicy.retentionDays * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));

  // In production: write anonymisedRecords to DB, queue purge jobs,
  // and call the identity provider / Soroban contract to deactivate.
  void anonymisedRecords;
  void purgedRecords;
  void DEFAULT_RETENTION_POLICY; // ensure import used

  const processedAt = new Date().toISOString();

  return {
    success: true,
    idempotencyKey,
    processedAt,
    message: "Account scheduled for deletion. Financial records have been anonymised per retention policy.",
  };
}

/**
 * Guard: returns true if the account has any open / pending on-chain
 * transactions that must be settled before deletion.
 *
 * Replace with a real Horizon / Soroban contract query.
 */
async function checkPendingTransactions(publicKey: string): Promise<boolean> {
  // Demo: no pending transactions for any account.
  void publicKey;
  return false;
}
