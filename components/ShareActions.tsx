"use client";

import { Check, Copy, Share2, AlertTriangle, X } from "lucide-react";
import { useCallback } from "react";
import { useClipboard } from "@/hooks/useClipboard";
import { cn } from "@/lib/utils";

interface ShareActionsProps {
  content: string;
  title?: string;
  format?: "text" | "html" | "markdown";
  className?: string;
}

export function ShareActions({
  content,
  title = "StellarSwipe",
  format = "text",
  className,
}: ShareActionsProps) {
  const { copied, status, errorMessage, copy, reset } = useClipboard({
    resetDelay: 2000,
  });

  const isError = status === "error";

  const handleCopy = useCallback(async () => {
    await copy(content);
  }, [content, copy]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: content });
      } catch {
        // User cancelled or share failed — fall through to clipboard copy
        await copy(content);
      }
    } else {
      await copy(content);
    }
  }, [content, title, copy]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={isError ? reset : handleCopy}
          aria-label={
            copied
              ? "Copied to clipboard"
              : isError
              ? "Copy failed — click to dismiss"
              : "Copy to clipboard"
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            "border border-border bg-surface hover:bg-surface-high/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            copied && "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400",
            isError && "border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          )}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : isError ? (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copied" : isError ? "Retry" : "Copy"}
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-high/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          Share
        </button>
      </div>

      {/*
        Manual-copy fallback — shown only when clipboard API fails.
        Tells the user how to copy without relying on a persistent toast
        or leaking the value into notification logs.
      */}
      {isError && errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-[11px] leading-snug text-yellow-700 dark:text-yellow-300"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            aria-label="Dismiss copy error"
            onClick={reset}
            className="shrink-0 rounded p-0.5 hover:bg-yellow-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
