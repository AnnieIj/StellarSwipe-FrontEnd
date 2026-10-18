/**
 * Upgrade compatibility shims for deprecated entry points.
 *
 * Each export here wraps a current implementation and emits a deprecation
 * warning so callers can migrate at their own pace without breaking.
 *
 * @deprecated All exports in this module are deprecated. Migrate to the
 * current equivalents documented in each function's JSDoc.
 */

import { fetchSignals, fetchSubscriptions } from "@/lib/api";
import type {
  GetSignalsParams,
  SignalFeedPage,
  GetSubscriptionsParams,
  SubscriptionsResponse,
} from "@/lib/api-types.generated";

function warn(deprecated: string, replacement: string) {
  // eslint-disable-next-line no-console
  console.warn(
    `[StellarSwipe] "${deprecated}" is deprecated and will be removed in a future release. ` +
      `Use "${replacement}" instead.`
  );
}

/**
 * @deprecated Use `fetchSignals` from `@/lib/api` instead.
 *
 * Legacy param `limit` is mapped to `pageSize` for backwards compatibility.
 */
export async function fetchSignalFeed(
  params: GetSignalsParams & { limit?: number } = {}
): Promise<SignalFeedPage> {
  warn("fetchSignalFeed", "fetchSignals");
  const { limit, ...rest } = params;
  return fetchSignals({ pageSize: limit, ...rest });
}

/**
 * @deprecated Use `fetchSubscriptions` from `@/lib/api` instead.
 */
export async function getSubscriptions(
  params: GetSubscriptionsParams = {}
): Promise<SubscriptionsResponse> {
  warn("getSubscriptions", "fetchSubscriptions");
  return fetchSubscriptions(params);
}
