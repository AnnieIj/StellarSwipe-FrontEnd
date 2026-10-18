"use client";

import { useQuery } from "@tanstack/react-query";
import { SubscriptionStatus } from "@/lib/subscriptionStatus";

interface Subscription {
  id: string;
  status: SubscriptionStatus;
}

async function fetchSubscriptions(
  status?: SubscriptionStatus,
  signal?: AbortSignal
): Promise<Subscription[]> {
  const url = new URL("/api/subscriptions", window.location.origin);
  if (status) url.searchParams.set("status", status);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "Failed to fetch subscriptions");
  }
  const data = await res.json();
  return data.subscriptions;
}

export function useSubscriptions(status?: SubscriptionStatus) {
  return useQuery({
    queryKey: ["subscriptions", status ?? "all"],
    // Forward React Query's per-call AbortSignal so a superseded request
    // (e.g. the status filter changes again before this resolves) is
    // actually cancelled at the network layer.
    queryFn: ({ signal }) => fetchSubscriptions(status, signal),
  });
}
