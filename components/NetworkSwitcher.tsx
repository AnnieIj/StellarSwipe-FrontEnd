"use client";

import { useState } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { NETWORK_LABELS, type StellarNetworkId } from "@/lib/assetIssuer";
import {
  NetworkSwitchDialog,
  type ConfirmWalletSwitch,
} from "@/components/NetworkSwitchDialog";

const NETWORKS = Object.keys(NETWORK_LABELS) as StellarNetworkId[];

export interface NetworkSwitcherProps {
  /** Override the wallet confirmation (tests, other wallet adapters). */
  confirmWalletSwitch?: ConfirmWalletSwitch;
}

/**
 * NetworkSwitcher (#800)
 *
 * Picking a network never applies it directly — it opens a confirmation that
 * previews the impact, and the selection only changes once the wallet has
 * confirmed the switch.
 */
export function NetworkSwitcher({ confirmWalletSwitch }: NetworkSwitcherProps) {
  const network = useWalletStore((s) => s.network);
  const [target, setTarget] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor="network-switcher" className="text-xs font-medium text-foreground">
          Stellar network
        </label>
        <p className="text-xs text-foreground-muted">
          Changes only after your wallet confirms the switch.
        </p>
      </div>
      <select
        id="network-switcher"
        value={network.toUpperCase()}
        onChange={(e) => {
          if (e.target.value !== network.toUpperCase()) setTarget(e.target.value);
        }}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
      >
        {NETWORKS.map((id) => (
          <option key={id} value={id}>
            {NETWORK_LABELS[id]}
          </option>
        ))}
      </select>

      {target && (
        <NetworkSwitchDialog
          open
          targetNetwork={target}
          confirmWalletSwitch={confirmWalletSwitch}
          onOpenChange={(open) => {
            if (!open) setTarget(null);
          }}
        />
      )}
    </div>
  );
}
