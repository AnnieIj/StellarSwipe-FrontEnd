"use client";

import { Card, CardContent } from "@/components/ui/card";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { usePrivacyStore, PRIVACY_MASK } from "@/store/usePrivacyStore";
import { TrendingUp, TrendingDown, Wallet, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortfolioEmptyState } from "@/components/PortfolioEmptyState";

export function PortfolioSummaryCards() {
  const { assets, totalValue, totalRealizedPnL, totalUnrealizedPnL, isLoading } =
    usePortfolioStore();
  const { privacyMode } = usePrivacyStore();

  // Empty state: no assets and not mid-load
  if (!isLoading && assets.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-0">
          <PortfolioEmptyState variant="summary" />
        </CardContent>
      </Card>
    );
  }

  const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
  const pnlPercent =
    totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;
  const activePositions = assets.filter((a) => a.value > 0).length;
  const isPositive = totalPnL >= 0;

  /** Mask a numeric string if privacy mode is on. */
  const mask = (v: string) => (privacyMode ? PRIVACY_MASK : v);

  const stats = [
    {
      label: "Balance",
      value: mask(formatCurrency(totalValue)),
      icon: Wallet,
      className: "text-accent-sky",
    },
    {
      label: "Total P/L",
      value: mask(`${isPositive ? "+" : ""}$${Math.abs(totalPnL).toFixed(2)}`),
      sub: mask(`${isPositive ? "+" : ""}${pnlPercent.toFixed(2)}%`),
      icon: isPositive ? TrendingUp : TrendingDown,
      className: isPositive ? "text-accent-success" : "text-accent-danger",
    },
    {
      label: "Positions",
      value: String(activePositions),
      sub: `${assets.length} asset${assets.length !== 1 ? "s" : ""}`,
      icon: BarChart2,
      className: "text-accent-market",
    },
  ];

  return (
    <Card className="w-full">
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Portfolio snapshot
        </p>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map(({ label, value, sub, icon: Icon, className }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Icon size={13} className={cn("shrink-0", className)} aria-hidden="true" />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
              <p
                className={cn("text-sm font-semibold leading-tight", className)}
                aria-label={privacyMode ? `${label} hidden` : undefined}
              >
                {value}
              </p>
              {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
