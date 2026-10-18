import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeeDisclosurePanelProps {
  /** Trade total in USDC — used to show concrete fee impact */
  tradeTotal?: number;
  className?: string;
}

const PLATFORM_FEE_RATE = 0.001; // 0.1%
const PROVIDER_SHARE = 0.5; // 50% of fee goes to signal provider

/**
 * Explains the 0.1% platform fee and provider reward split in plain language.
 * Designed to be embedded inside TradeModal during trade confirmation.
 */
export function FeeDisclosurePanel({
  tradeTotal = 0,
  className,
}: FeeDisclosurePanelProps) {
  const totalFee = tradeTotal * PLATFORM_FEE_RATE;
  const providerReward = totalFee * PROVIDER_SHARE;
  const platformRevenue = totalFee - providerReward;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-high px-4 py-3 text-sm",
        className
      )}
      aria-label="Fee and reward disclosure"
    >
      <div className="flex items-center gap-1.5 mb-2 text-foreground-muted font-medium">
        <Info size={13} aria-hidden="true" />
        <span>Fees &amp; rewards</span>
      </div>

      <ul className="space-y-1.5 text-xs text-foreground-muted">
        <li className="flex justify-between">
          <span>Platform fee</span>
          <span className="font-mono font-medium text-foreground">
            0.1%{tradeTotal > 0 ? ` ($${totalFee.toFixed(4)})` : ""}
          </span>
        </li>
        <li className="flex justify-between">
          <span>Signal provider reward (50%)</span>
          <span className="font-mono font-medium text-foreground">
            {tradeTotal > 0 ? `$${providerReward.toFixed(4)}` : "50% of fee"}
          </span>
        </li>
        <li className="flex justify-between">
          <span>Platform revenue (50%)</span>
          <span className="font-mono font-medium text-foreground">
            {tradeTotal > 0 ? `$${platformRevenue.toFixed(4)}` : "50% of fee"}
          </span>
        </li>
      </ul>

      <p className="mt-2.5 text-xs text-foreground-subtle leading-relaxed">
        A 0.1% fee is applied to each trade. Half goes directly to the signal
        provider as a reward for accurate signals; the other half supports
        platform operations. Network fees are charged separately by the Stellar
        network.
      </p>
    </div>
  );
}
