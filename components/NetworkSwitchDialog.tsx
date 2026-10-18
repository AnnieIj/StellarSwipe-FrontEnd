"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, PenLine, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/store/useWalletStore";
import { useActiveFlowsStore } from "@/store/useActiveFlowsStore";
import { getNetworkLabel } from "@/lib/assetIssuer";
import {
  readFreighterNetwork,
  waitForWalletNetwork,
} from "@/lib/networkSwitch";

/** Views whose data is network-specific and gets reloaded after a switch. */
const AFFECTED_VIEWS = [
  "Portfolio balances and open positions",
  "Signal prices, quotes and price alerts",
  "Asset issuers — the same code can be a different asset on another network",
];

export type ConfirmWalletSwitch = (
  target: string,
  signal: AbortSignal
) => Promise<void>;

const defaultConfirmWalletSwitch: ConfirmWalletSwitch = (target, signal) =>
  waitForWalletNetwork(target, { readNetwork: readFreighterNetwork, signal });

export interface NetworkSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Network the user wants to move to, e.g. "PUBLIC". */
  targetNetwork: string;
  /**
   * Resolves once the wallet reports `target`, rejects if it doesn't switch.
   * Defaults to polling Freighter until it reports the destination network.
   */
  confirmWalletSwitch?: ConfirmWalletSwitch;
  /** Called after the wallet confirmed and the app view was updated. */
  onSwitched?: (network: string) => void;
}

type Phase = "review" | "awaiting" | "failed";

/**
 * NetworkSwitchDialog (#800)
 *
 * Previews what a network switch affects before it happens: names the
 * current and destination networks, lists in-progress trade and signing
 * flows (cancellable ones can be cancelled right here), and only updates the
 * app's network after the wallet confirms the change.
 */
export function NetworkSwitchDialog({
  open,
  onOpenChange,
  targetNetwork,
  confirmWalletSwitch = defaultConfirmWalletSwitch,
  onSwitched,
}: NetworkSwitchDialogProps) {
  const currentNetwork = useWalletStore((s) => s.network);
  const setNetwork = useWalletStore((s) => s.setNetwork);
  const flows = useActiveFlowsStore((s) => s.flows);
  const cancelFlow = useActiveFlowsStore((s) => s.cancelFlow);

  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentLabel = getNetworkLabel(currentNetwork);
  const targetLabel = getNetworkLabel(targetNetwork);
  const cancellable = flows.filter((f) => f.cancel);
  const blocked = flows.length > 0;

  // Reset each time the dialog opens; stop waiting if it closes mid-switch.
  useEffect(() => {
    if (open) {
      setPhase("review");
      setError(null);
    }
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [open]);

  const handleSwitch = useCallback(async () => {
    if (blocked || phase === "awaiting") return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("awaiting");
    setError(null);
    try {
      await confirmWalletSwitch(targetNetwork, controller.signal);
      // Ignore a confirmation that lands after the user stopped waiting.
      if (controller.signal.aborted) return;
      setNetwork(targetNetwork);
      onSwitched?.(targetNetwork.toUpperCase());
      onOpenChange(false);
    } catch (err) {
      if (abortRef.current !== controller) return; // dialog closed/reset
      setPhase("failed");
      setError(
        err instanceof Error && err.message
          ? err.message
          : "The wallet did not switch networks."
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [
    blocked,
    phase,
    confirmWalletSwitch,
    targetNetwork,
    setNetwork,
    onSwitched,
    onOpenChange,
  ]);

  const handleStopWaiting = useCallback(() => {
    const controller = abortRef.current;
    abortRef.current = null;
    controller?.abort();
    setPhase("failed");
    setError("You stopped waiting for the wallet.");
  }, []);

  const handleCancelAll = useCallback(() => {
    cancellable.forEach((f) => cancelFlow(f.id));
  }, [cancellable, cancelFlow]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Switch to {targetLabel}?</DialogTitle>
          <DialogDescription>
            Review what changes before moving from {currentLabel} to{" "}
            {targetLabel}.
          </DialogDescription>
        </DialogHeader>

        <dl
          className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
          aria-label="Network change"
        >
          <div>
            <dt className="text-xs text-muted-foreground">Current network</dt>
            <dd className="font-semibold">{currentLabel}</dd>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="text-right">
            <dt className="text-xs text-muted-foreground">Destination network</dt>
            <dd className="font-semibold">{targetLabel}</dd>
          </div>
        </dl>

        <section aria-labelledby="network-switch-affected" className="space-y-1.5">
          <h3 id="network-switch-affected" className="text-xs font-semibold text-muted-foreground">
            Will reload for {targetLabel}
          </h3>
          <ul className="list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">
            {AFFECTED_VIEWS.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </section>

        {blocked && (
          <section
            aria-labelledby="network-switch-flows"
            className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
          >
            <h3
              id="network-switch-flows"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              In progress on {currentLabel} — won&apos;t be valid on {targetLabel}
            </h3>
            <ul className="space-y-1.5" aria-label="In-progress flows">
              {flows.map((flow) => (
                <li
                  key={flow.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {flow.kind === "trade" ? (
                      <Repeat className="h-3 w-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <PenLine className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                      {flow.kind === "trade" ? "Trade:" : "Signing:"}{" "}
                    </span>
                    <span className="truncate">{flow.label}</span>
                  </span>
                  {flow.cancel ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0"
                      onClick={() => cancelFlow(flow.id)}
                      aria-label={`Cancel ${flow.label}`}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <span className="shrink-0 text-muted-foreground">
                      Finish or reject in your wallet
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {cancellable.length > 1 && (
              <Button size="sm" variant="outline" onClick={handleCancelAll}>
                Cancel all
              </Button>
            )}
          </section>
        )}

        {phase === "awaiting" && (
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-lg border p-3 text-xs"
          >
            <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
            <span>
              Switch to {targetLabel} in your wallet. This page will update once
              your wallet confirms.
            </span>
          </p>
        )}

        {phase === "failed" && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300"
          >
            Still on {currentLabel}. {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          {phase === "awaiting" ? (
            <Button variant="outline" onClick={handleStopWaiting}>
              Stop waiting
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Stay on {currentLabel}
            </Button>
          )}
          <Button
            onClick={handleSwitch}
            disabled={blocked || phase === "awaiting"}
            aria-describedby={blocked ? "network-switch-flows" : undefined}
          >
            {phase === "failed" ? "Try again" : `Switch to ${targetLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
