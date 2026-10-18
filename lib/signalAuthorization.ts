import type { Signal } from "@/lib/signals";

/**
 * The caller performing a mutation. Must be resolved from the server-side
 * session, never taken from request bodies, query params, or headers.
 */
export interface SignalActor {
  /** Provider the authenticated user operates as, if any */
  providerId?: string;
  isAdmin: boolean;
}

/**
 * Only the owning provider or an administrator may mutate a provider signal.
 * Unauthenticated callers (null actor) and providers without a matching
 * `provider` owner are denied.
 */
export function canMutateProviderSignal(
  actor: SignalActor | null,
  signal: Pick<Signal, "provider">
): boolean {
  if (!actor) return false;
  if (actor.isAdmin) return true;
  return Boolean(actor.providerId) && actor.providerId === signal.provider;
}
