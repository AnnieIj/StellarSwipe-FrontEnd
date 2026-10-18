"use client";

import { useEffect, useRef } from "react";

interface TradeExecutionStatusProps {
  isExecuting: boolean;
  executionTimeMs: number | null;
  estimatedTimeMs: number | null;
  liveSlippage: number;
  error: string | null;
  onRetry?: () => void;
}

/**
 * Displays real-time trade execution status (#165)
 * - Estimated execution time
 * - Live slippage changes
 * - Execution time after completion
 * - Timeout error with retry
 */
export function TradeExecutionStatus({
  isExecuting,
  executionTimeMs,
  estimatedTimeMs,
  liveSlippage,
  error,
  onRetry,
}: TradeExecutionStatusProps) {
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isExecuting) {
      startTimeRef.current = performance.now();
      const tick = () => {
        if (elapsedRef.current && startTimeRef.current !== null) {
          const elapsed = Math.round(performance.now() - startTimeRef.current);
          elapsedRef.current.textContent = `${elapsed}ms`;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isExecuting]);

  if (!isExecuting && !executionTimeMs && !error) return null;

  return (
    <div
      className="rounded-lg border bg-card p-3 text-sm space-y-1"
      role="status"
      aria-live="polite"
    >
      {isExecuting && (
        <>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Executing trade…</span>
            <span ref={elapsedRef} className="font-mono text-xs">
              0ms
            </span>
          </div>
          {estimatedTimeMs && (
            <div className="text-xs text-muted-foreground">
              Est. completion: ~{estimatedTimeMs}ms
            </div>
          )}
          {liveSlippage > 0 && (
            <div
              className={`text-xs font-medium ${
                liveSlippage > 1 ? "text-yellow-500" : "text-green-500"
              }`}
            >
              Live slippage: {liveSlippage}%
            </div>
          )}
        </>
      )}

      {!isExecuting && executionTimeMs !== null && !error && (
        <div className="flex items-center justify-between text-green-500">
          <span>Trade confirmed</span>
          <span className="font-mono text-xs">{executionTimeMs}ms</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between text-red-500">
          <span className="text-xs">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs underline hover:no-underline ml-2"
              aria-label="Retry trade"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
