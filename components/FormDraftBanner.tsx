"use client";

import { AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormDraftBannerProps {
  /** Called when the user chooses to restore the draft. */
  onRestore: () => void;
  /** Called when the user chooses to discard the draft. */
  onDiscard: () => void;
  /** Optional custom message. */
  message?: string;
  className?: string;
}

/**
 * FormDraftBanner (#767)
 * ──────────────────────
 * Non-intrusive banner shown at the top of a form when an unfinished draft
 * is available in local storage. Offers a clear restore or discard choice.
 *
 * Render this conditionally when `useFormDraft().hasDraft` is true.
 *
 * @example
 * {hasDraft && !dismissed && (
 *   <FormDraftBanner
 *     onRestore={() => { reset(draft); setDismissed(true); }}
 *     onDiscard={() => { clearDraft(); setDismissed(true); }}
 *   />
 * )}
 */
export function FormDraftBanner({
  onRestore,
  onDiscard,
  message = "You have an unsaved draft from a previous session.",
  className,
}: FormDraftBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm",
        "dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <p className="text-amber-800 dark:text-amber-200">{message}</p>
      </div>

      <div className="flex items-center gap-3 pl-6">
        <button
          type="button"
          onClick={onRestore}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            "bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1",
            "dark:bg-amber-700 dark:hover:bg-amber-600"
          )}
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Restore draft
        </button>

        <button
          type="button"
          onClick={onDiscard}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            "border border-amber-400 text-amber-800 hover:bg-amber-100 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1",
            "dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40"
          )}
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          Discard
        </button>
      </div>
    </div>
  );
}
