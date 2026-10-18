"use client";

import { useEffect } from "react";
import type { Signal } from "@/lib/signals";
import {
  EXPIRY_IDLE_INTERVAL_MS,
  EXPIRY_MAX_ATTEMPTS,
  nextPassDelayMs,
  retryDelayMs,
  runExpiryPass,
  type ExpiryEvent,
} from "@/lib/signalExpiry";
import { useSignalExpiryStore } from "@/store/useSignalExpiryStore";
import { traceWorker } from "@/src/tracing/worker-tracing.service";

type CommitExpiry = (events: ExpiryEvent[]) => void | Promise<void>;

const defaultCommit: CommitExpiry = (events) => {
  useSignalExpiryStore.getState().recordExpired(events);
};

/**
 * Scheduled worker that moves expired signals out of the active feed.
 *
 * Runs on its own timer, so expiry does not wait for a user fetch. A pass whose
 * commit throws is retried with exponential backoff up to EXPIRY_MAX_ATTEMPTS;
 * after that the worker falls back to the idle interval. Each pass is traced as
 * `worker:signals:expire` and its outcome is exposed on the store's `stats`.
 */
export function useSignalExpiryWorker(
  signals: Signal[],
  commit: CommitExpiry = defaultCommit
) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let failedAttempts = 0;

    const schedule = (delayMs: number) => {
      useSignalExpiryStore
        .getState()
        .setStats({ nextRunAt: Date.now() + delayMs });
      timer = setTimeout(runPass, delayMs);
    };

    const runPass = async () => {
      if (cancelled) return;

      const startedAt = Date.now();
      try {
        const pass = await traceWorker(
          "worker:signals:expire",
          async () => {
            const result = runExpiryPass(
              signals,
              useSignalExpiryStore.getState().expired,
              startedAt
            );
            if (result.events.length > 0) await commit(result.events);
            return result;
          },
          { attempt: failedAttempts + 1, signalCount: signals.length }
        );

        failedAttempts = 0;
        useSignalExpiryStore.getState().setStats({
          lastRunAt: startedAt,
          lastDurationMs: Date.now() - startedAt,
          lastBatches: pass.batches,
          consecutiveFailures: 0,
        });
        schedule(nextPassDelayMs(pass.nextExpiryAt));
      } catch {
        failedAttempts += 1;
        const { totalFailures, consecutiveFailures } =
          useSignalExpiryStore.getState().stats;
        useSignalExpiryStore.getState().setStats({
          totalFailures: totalFailures + 1,
          consecutiveFailures: consecutiveFailures + 1,
        });

        if (failedAttempts < EXPIRY_MAX_ATTEMPTS) {
          schedule(retryDelayMs(failedAttempts));
        } else {
          failedAttempts = 0;
          schedule(EXPIRY_IDLE_INTERVAL_MS);
        }
      }
    };

    schedule(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signals, commit]);
}
