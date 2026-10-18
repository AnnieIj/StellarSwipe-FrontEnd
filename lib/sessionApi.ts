/**
 * sessionApi.ts
 *
 * Thin async wrappers around the sessions backend.
 *
 * In the absence of a real backend these functions target the mock MSW
 * handlers (src/mocks/handlers.ts). Swap the fetch URLs for real
 * endpoints once the API is available.
 */

import type { AccountActivity, Session } from "./sessionUtils";

export class SessionApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "SessionApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SessionApiError(
      text || `Request failed with status ${res.status}`,
      res.status
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch all active sessions for the authenticated user.
 */
export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch("/api/sessions");
  return handleResponse<Session[]>(res);
}

/**
 * Revoke a single session by ID.
 * Throws {@link SessionApiError} on non-2xx responses so callers can
 * roll back optimistic updates.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  await handleResponse<void>(res);
}

/**
 * Revoke all sessions except the current one.
 */
export async function revokeAllOtherSessions(): Promise<void> {
  const res = await fetch("/api/sessions/revoke-others", { method: "POST" });
  await handleResponse<void>(res);
}

/**
 * Fetch recent sign-in and session events for the authenticated user.
 */
export async function fetchAccountActivity(): Promise<AccountActivity[]> {
  const res = await fetch("/api/account/activity");
  return handleResponse<AccountActivity[]>(res);
}
