"use client";

import { ReactNode, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RetryStateCardProps {
  title: string;
  description: string;
  onRetry?: () => void;
  icon?: ReactNode;
  actionLabel?: string;
  details?: string | null;
  tone?: "destructive" | "warning";
}

export function RetryStateCard({
  title,
  description,
  onRetry,
  icon,
  actionLabel = "Retry",
  details,
  tone = "destructive",
}: RetryStateCardProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await Promise.resolve(onRetry());
    } finally {
      setRetrying(false);
    }
  };

  const toneClasses =
    tone === "warning"
      ? "border-amber-500/30 bg-amber-500/10"
      : "border-destructive/30 bg-destructive/5";

  const accentClasses =
    tone === "warning" ? "text-amber-600" : "text-destructive";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center shadow-sm sm:p-8 ${toneClasses}`}
    >
      {icon ?? <AlertTriangle className={`h-10 w-10 ${accentClasses}`} aria-hidden="true" />}

      <div className="space-y-2">
        <p className={`font-semibold ${accentClasses}`}>{title}</p>
        <p className="text-sm leading-6 text-foreground-muted">{description}</p>
      </div>

      {onRetry ? (
        <Button
          variant="default"
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
          className="flex min-w-[8.5rem] items-center justify-center gap-2"
        >
          {retrying ? (
            <>
              <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw size={16} aria-hidden="true" />
              {actionLabel}
            </>
          )}
        </Button>
      ) : null}

      {details ? (
        <details className="w-full text-left">
          <summary className="cursor-pointer text-xs text-foreground-subtle hover:text-foreground-muted">
            Error details (for debugging)
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-black/20 p-2 text-xs text-foreground-muted">
            {details}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
