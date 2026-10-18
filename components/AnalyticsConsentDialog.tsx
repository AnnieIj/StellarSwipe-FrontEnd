"use client";

import { useState } from "react";
import {
  BarChart2,
  Shield,
  Eye,
  Globe,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAnalyticsConsentStore } from "@/store/useAnalyticsConsentStore";
import { cn } from "@/lib/utils";

interface AnalyticsConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DataItem {
  icon: typeof BarChart2;
  title: string;
  description: string;
}

const DATA_ITEMS: DataItem[] = [
  {
    icon: Globe,
    title: "Page views & navigation",
    description: "Which pages you visit and how you navigate between them.",
  },
  {
    icon: Eye,
    title: "Feature interactions",
    description: "How you use swap, portfolio, and wallet features.",
  },
  {
    icon: BarChart2,
    title: "Performance metrics",
    description: "Load times, errors, and Core Web Vitals to keep the app fast.",
  },
  {
    icon: Shield,
    title: "Device & browser info",
    description: "Browser type, screen size, and OS to optimize compatibility.",
  },
];

export function AnalyticsConsentDialog({
  open,
  onOpenChange,
}: AnalyticsConsentDialogProps) {
  const { analyticsEnabled, setAnalyticsEnabled } = useAnalyticsConsentStore();
  const [pendingChoice, setPendingChoice] = useState<boolean | null>(null);

  const choice = pendingChoice ?? analyticsEnabled;

  const handleAccept = () => {
    setAnalyticsEnabled(true);
    setPendingChoice(null);
    onOpenChange(false);
  };

  const handleDecline = () => {
    setAnalyticsEnabled(false);
    setPendingChoice(null);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open) {
      setAnalyticsEnabled(false);
      setPendingChoice(null);
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/15">
              <BarChart2 className="h-6 w-6 text-accent-primary" aria-hidden="true" />
            </div>
            <DialogTitle className="text-center text-xl">
              Help improve StellarSwipe
            </DialogTitle>
            <DialogDescription className="text-center">
              Allow anonymous usage data so we can improve the app and fix
              issues faster. We never collect personal or wallet data.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            What analytics includes
          </h3>
          <ul className="space-y-2.5" role="list">
            {DATA_ITEMS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                  <item.icon className="h-4 w-4 text-foreground-muted" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-6 mb-2 flex items-start gap-2 rounded-xl bg-foreground/5 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" aria-hidden="true" />
          <p className="text-xs text-foreground-muted leading-relaxed">
            You can change this anytime in{" "}
            <span className="font-medium text-foreground">
              Settings → Privacy
            </span>
            . Declining stops analytics immediately.
          </p>
        </div>

        <DialogFooter className="flex flex-col gap-2 p-6 pt-4 sm:flex-row">
          <button
            onClick={handleDecline}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !choice
                ? "border-foreground/20 bg-foreground/5 text-foreground"
                : "border-border bg-transparent text-foreground-muted hover:bg-foreground/5"
            )}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Decline analytics
          </button>
          <button
            onClick={handleAccept}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              choice
                ? "bg-accent-primary text-white"
                : "border border-border bg-surface text-foreground hover:bg-surface-high"
            )}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Allow analytics
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
