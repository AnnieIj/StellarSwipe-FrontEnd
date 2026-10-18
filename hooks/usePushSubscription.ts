"use client";

import { useState, useEffect } from "react";
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
} from "@/lib/notifications";

type PushState = "idle" | "subscribed" | "unsupported";

export function usePushSubscription() {
  const [pushState, setPushState] = useState<PushState>("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await getExistingSubscription(reg);
      if (sub) setPushState("subscribed");
    });
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const reg = await registerServiceWorker();
      if (!reg) return;
      const sub = await subscribeToPush(reg);
      if (!sub) return;
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setPushState("subscribed");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await getExistingSubscription(reg);
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await unsubscribeFromPush(reg);
      }
      setPushState("idle");
    } finally {
      setLoading(false);
    }
  };

  return { pushState, loading, subscribe, unsubscribe };
}
