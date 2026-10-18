"use client";

import { useEffect, useRef } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useThemeStore } from "@/store/useThemeStore";
import { toast } from "@/lib/toast";

/**
 * #265 – Cross-tab state synchronization.
 * Listens to the native `storage` event (fired in OTHER tabs when localStorage
 * changes) and re-hydrates the relevant Zustand store so the UI stays in sync
 * without a page refresh.  Writing to the same store from the event handler
 * does NOT emit another storage event in the same tab, so there is no loop.
 *
 * Conflict resolution policy: last-write-wins by wall-clock arrival time.
 * When a remote sync message arrives for a setting that this tab also changed
 * within the last CONFLICT_WINDOW_MS milliseconds, the remote value is applied
 * (because the storage event always carries the final persisted value) and a
 * brief, dismissible notice is shown so the user is aware of the outcome.
 */

/** How recent a local change must be (ms) to count as a conflict. */
const CONFLICT_WINDOW_MS = 2000;

export function useCrossTabSync() {
  // Tracks the timestamp of the last LOCAL change per storage key.
  // Updated by store subscriptions; cleared or ignored when we apply a remote change.
  const lastLocalChange = useRef<Record<string, number>>({});

  // Set to true while we are applying a remote value so the store subscription
  // doesn't misidentify our own setState call as a local user change.
  const isApplyingRemote = useRef(false);

  useEffect(() => {
    // Subscribe to local wallet store changes so we can record when this tab
    // last made a change to the wallet setting.
    const unsubWallet = useWalletStore.subscribe(() => {
      if (!isApplyingRemote.current) {
        lastLocalChange.current["wallet-store"] = Date.now();
      }
    });

    // Subscribe to local theme store changes for the same purpose.
    const unsubTheme = useThemeStore.subscribe(() => {
      if (!isApplyingRemote.current) {
        lastLocalChange.current["stellar-theme"] = Date.now();
      }
    });

    function handleStorage(e: StorageEvent) {
      // Wallet store
      if (e.key === "wallet-store" && e.newValue) {
        const localTs = lastLocalChange.current["wallet-store"];
        const isConflict =
          localTs !== undefined && Date.now() - localTs < CONFLICT_WINDOW_MS;

        try {
          isApplyingRemote.current = true;
          const { state } = JSON.parse(e.newValue);
          useWalletStore.setState({
            publicKey: state.publicKey ?? null,
            isConnected: state.isConnected ?? false,
            network: state.network ?? "TESTNET",
          });
        } catch {
          // ignore malformed data
        } finally {
          isApplyingRemote.current = false;
        }

        if (isConflict) {
          toast.info("Wallet updated from another tab", {
            description:
              "Both tabs changed this setting at the same time. The other tab's value was applied (last-write-wins).",
          });
        }
      }

      // Theme store
      if (e.key === "stellar-theme" && e.newValue) {
        const localTs = lastLocalChange.current["stellar-theme"];
        const isConflict =
          localTs !== undefined && Date.now() - localTs < CONFLICT_WINDOW_MS;

        try {
          isApplyingRemote.current = true;
          const { state } = JSON.parse(e.newValue);
          if (state.theme === "dark" || state.theme === "light") {
            useThemeStore.setState({ theme: state.theme });
          }
        } catch {
          // ignore malformed data
        } finally {
          isApplyingRemote.current = false;
        }

        if (isConflict) {
          toast.info("Theme updated from another tab", {
            description:
              "Both tabs changed this setting at the same time. The other tab's value was applied (last-write-wins).",
          });
        }
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      unsubWallet();
      unsubTheme();
    };
  }, []);
}
