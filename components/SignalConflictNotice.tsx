"use client";

import {
  AlertTriangle,
  Clock,
  TrendingUp,
  ShieldOff,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SignalConflictReason =
  | "price_moved"
  | "signal_expired"
  | "position_limit";

interface SignalConflictNoticeProps {
  reason: SignalConflictReason;
  onRefresh?: () => void;
  onChooseAnother?: () => void;
}

const CONFLICT_CONFIG: Record<
  SignalConflictReason,
  { icon: React.ElementType; title: string; description: string }
> = {
  price_moved: {
    icon: TrendingUp,
    title: "Price has moved",
    description:
      "The execution price is no longer valid. Refresh to get the latest signal.",
  },
  signal_expired: {
    icon: Clock,
    title: "Signal expired",
    description:
      "This signal is no longer active. Choose another or refresh the feed.",
  },
  position_limit: {
    icon: ShieldOff,
    title: "Position limit reached",
    description:
      "You've hit your maximum open positions. Close an existing position to proceed.",
  },
};

export function SignalConflictNotice({
  reason,
  onRefresh,
  onChooseAnother,
}: SignalConflictNoticeProps) {
  const { icon: Icon, title, description } = CONFLICT_CONFIG[reason];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col gap-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          size={15}
          className="mt-0.5 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-amber-300">{title}</p>
          <p className="mt-0.5 text-xs text-amber-200/70">{description}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-7 gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs"
            aria-label="Refresh signal"
          >
            <RefreshCw size={12} aria-hidden="true" />
            Refresh
          </Button>
        )}
        {onChooseAnother && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onChooseAnother}
            className="h-7 gap-1.5 text-amber-300/80 hover:text-amber-300 text-xs"
            aria-label="Choose another signal"
          >
            Choose another
            <ArrowRight size={12} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
