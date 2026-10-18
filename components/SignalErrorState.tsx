"use client";

import { DataPanelError } from "@/components/DataPanelError";
import { usePanelError } from "@/hooks/usePanelError";

interface SignalErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export function SignalErrorState({ error, onRetry }: SignalErrorStateProps) {
  const { classify, retrying, handleRetry } = usePanelError({ panelId: "signal-feed" });
  const errorInfo = classify(error);

  return (
    <div className="rounded-2xl p-2">
      <DataPanelError
        errorInfo={errorInfo}
        onRetry={() => handleRetry(() => Promise.resolve(onRetry()))}
        retrying={retrying}
      />

      {/* Error details for debugging */}
      <details className="mt-4 text-left w-full">
        <summary className="text-xs text-foreground-subtle cursor-pointer hover:text-foreground-muted">
          Error details (for debugging)
        </summary>
        <pre className="mt-2 rounded bg-black/20 p-2 text-xs text-foreground-muted overflow-auto max-h-32 whitespace-pre-wrap break-words">
          {error.message}
        </pre>
      </details>
    </div>
  );
}
