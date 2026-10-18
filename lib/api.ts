/**
 * Typed API client for StellarSwipe backend endpoints.
 *
 * Types are generated from openapi.yaml — run `npm run api:generate` to
 * regenerate after the spec changes. Import request/response shapes from
 * `@/lib/api-types.generated` rather than defining them here.
 */

import type {
  SignalFeedPage,
  GetSignalsParams,
  SubscriptionsResponse,
  GetSubscriptionsParams,
} from "./api-types.generated";

export class NetworkError extends Error {
  constructor() {
    super("Network error — check your connection and try again.");
    this.name = "NetworkError";
  }
}

export class ServerError extends Error {
  constructor(public status: number) {
    super(`Server error (${status}) — please try again later.`);
    this.name = "ServerError";
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs / 1000}s — please try again.`);
    this.name = "TimeoutError";
  }
}

async function apiFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    const fetchUrl = url.startsWith("/") ? `http://localhost${url}` : url;
    res = await fetch(fetchUrl, { signal });
  } catch (error) {
    // A caller-initiated abort (e.g. the owning route/component was torn
    // down) is not a network failure — rethrow as-is so it's ignored
    // upstream (React Query treats a cancelled queryFn as a no-op) instead
    // of surfacing as a user-facing NetworkError.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new NetworkError();
  }
  if (!res.ok) throw new ServerError(res.status);
  return res.json() as Promise<T>;
}

/**
 * Fetch a paginated page of signals from `/api/signals`.
 *
 * @param params - Optional `page` (default 1) and `pageSize` (default 10).
 * @returns A {@link SignalFeedPage} with items and pagination metadata.
 *
 * @example
 * const feed = await fetchSignals({ page: 2, pageSize: 20 });
 * console.log(feed.items, feed.hasMore);
 */
export async function fetchSignals(
  params: GetSignalsParams & { signal?: AbortSignal } = {}
): Promise<SignalFeedPage> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.pageSize !== undefined)
    qs.set("pageSize", String(params.pageSize));
  const query = qs.toString();
  return apiFetch<SignalFeedPage>(
    `/api/signals${query ? `?${query}` : ""}`,
    params.signal
  );
}

/**
 * Fetch subscriptions from `/api/subscriptions`, optionally filtering by
 * `status`.
 *
 * @param params - Optional `status` filter (e.g. `"active"`).
 * @returns A {@link SubscriptionsResponse} containing the subscription array.
 *
 * @example
 * const { subscriptions } = await fetchSubscriptions({ status: "active" });
 */
export async function fetchSubscriptions(
  params: GetSubscriptionsParams & { signal?: AbortSignal } = {}
): Promise<SubscriptionsResponse> {
  const qs = new URLSearchParams();
  if (params.status !== undefined) qs.set("status", params.status);
  const query = qs.toString();
  return apiFetch<SubscriptionsResponse>(
    `/api/subscriptions${query ? `?${query}` : ""}`,
    params.signal
  );
}
