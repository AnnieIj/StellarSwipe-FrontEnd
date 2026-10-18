/**
 * providerFollows.ts
 *
 * Server-side store for user → signal provider follow relationships.
 *
 * In-memory for now (same as the push subscription store in
 * app/api/push/route.ts). Replace the Map with a database table keyed by
 * (userId, providerId) once persistence is available.
 */

const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const followsByUser = new Map<string, Set<string>>();

/**
 * Resolves the authenticated user for a request, or `null` when the caller is
 * not authenticated.
 *
 * TODO: replace the `x-user-id` header with the verified session identity from
 * your auth provider. Trusting a client-supplied header is only a placeholder.
 */
export function getRequestUserId(req: Request): string | null {
  const userId = req.headers.get("x-user-id")?.trim();

  return userId ? userId : null;
}

export function isValidProviderId(providerId: unknown): providerId is string {
  return typeof providerId === "string" && PROVIDER_ID_PATTERN.test(providerId);
}

/**
 * Adds the follow relationship. Returns `true` when it was newly created and
 * `false` when the user already followed the provider.
 */
export function followProvider(userId: string, providerId: string): boolean {
  const follows = followsByUser.get(userId) ?? new Set<string>();
  const created = !follows.has(providerId);

  follows.add(providerId);
  followsByUser.set(userId, follows);

  return created;
}

/**
 * Removes the follow relationship. Returns `true` when a relationship was
 * removed and `false` when the user was not following the provider.
 */
export function unfollowProvider(userId: string, providerId: string): boolean {
  const follows = followsByUser.get(userId);

  if (!follows) return false;

  const removed = follows.delete(providerId);

  if (follows.size === 0) followsByUser.delete(userId);

  return removed;
}

/** Lists the providers followed by a single user. Never includes other users' follows. */
export function listFollowedProviders(userId: string): string[] {
  return Array.from(followsByUser.get(userId) ?? []);
}
