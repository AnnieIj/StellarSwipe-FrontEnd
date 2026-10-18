"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UnfollowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provider display name */
  providerName: string;
  /** Number of currently open copied positions for this provider */
  openPositionsCount: number;
  /** Called after the user clicks "Unfollow" to confirm */
  onConfirm: () => void;
  /** Called after the user clicks "Cancel" or dismisses the dialog */
  onCancel: () => void;
}

/**
 * Confirmation dialog shown before unfollowing a signal provider that has
 * one or more open copied positions. Warns the user that existing positions
 * will remain open and will not be auto-closed.
 *
 * - Focus-trapped (Radix Dialog handles this automatically)
 * - Dismissible via Escape key
 * - Proper ARIA labelling via Dialog.Title / Dialog.Description
 */
export function UnfollowDialog({
  open,
  onOpenChange,
  providerName,
  openPositionsCount,
  onConfirm,
  onCancel,
}: UnfollowDialogProps) {
  const positionWord = openPositionsCount === 1 ? "position" : "positions";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby="unfollow-dialog-desc"
          onEscapeKeyDown={onCancel}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-6 shadow-2xl outline-none"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/15">
              <AlertTriangle
                className="h-6 w-6 text-yellow-500"
                aria-hidden="true"
              />
            </span>
          </div>

          {/* Title */}
          <Dialog.Title className="text-center text-lg font-semibold text-foreground mb-2">
            Unfollow {providerName}?
          </Dialog.Title>

          {/* Description */}
          <Dialog.Description
            id="unfollow-dialog-desc"
            className="text-center text-sm text-muted-foreground leading-relaxed mb-6"
          >
            You have{" "}
            <span className="font-semibold text-foreground">
              {openPositionsCount} open copied {positionWord}
            </span>{" "}
            from this provider. Unfollowing will{" "}
            <span className="font-semibold text-foreground">not</span>{" "}
            auto-close them — they will remain open and unaffected.
          </Dialog.Description>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onConfirm}
            >
              Unfollow
            </Button>
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          </div>

          {/* Close button */}
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-8 w-8 rounded-full"
              aria-label="Close dialog"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
