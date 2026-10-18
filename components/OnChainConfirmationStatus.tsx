"use client";

import { ExternalLink, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnChainConfirmationStatusProps {
  status?: "PENDING" | "SUCCEEDED" | "FAILED";
  transactionHash?: string;
}

const statusMap = {
  PENDING: {
    label: "Pending confirmation",
    icon: Clock3,
    style: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
  },
  SUCCEEDED: {
    label: "On-chain confirmed",
    icon: CheckCircle2,
    style: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  },
  FAILED: {
    label: "Confirmation failed",
    icon: XCircle,
    style: "border-red-500/20 bg-red-500/10 text-red-200",
  },
};

export function OnChainConfirmationStatus({
  status = "PENDING",
  transactionHash,
}: OnChainConfirmationStatusProps) {
  const metadata = statusMap[status];
  const explorerUrl = transactionHash
    ? `https://stellar.expert/explorer/testnet/tx/${transactionHash}`
    : undefined;

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <metadata.icon size={18} className={cn("shrink-0", metadata.style)} />
          <div>
            <p className="font-semibold text-foreground">{metadata.label}</p>
            <p className="text-sm text-muted-foreground">
              {transactionHash
                ? "Tracking the latest pending transaction on Stellar."
                : "No active on-chain transaction yet."}
            </p>
          </div>
        </div>

        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground transition hover:border-white/20"
          >
            View on explorer
            <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
    </section>
  );
}
