"use client";

import { useState, useCallback } from "react";
import { AlertTriangle, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToastStore } from "@/store/useToastStore";

interface UndoConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onUndo?: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}

export function UndoConfirmation({
  open,
  onOpenChange,
  onConfirm,
  onUndo,
  title,
  description,
  confirmLabel = "Confirm",
}: UndoConfirmationProps) {
  const [pending, setPending] = useState(false);
  const { enqueue, dismiss } = useToastStore();

  const handleConfirm = useCallback(() => {
    setPending(true);
    onOpenChange(false);

    const toastId = enqueue({
      tone: "info",
      title: "Action completed",
      description: "This action will be permanent in 5 seconds.",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          onUndo?.();
        },
      },
    });

    const timer = setTimeout(() => {
      setPending(false);
      onConfirm();
    }, 5000);

    const handleBeforeUnload = () => clearTimeout(timer);
    window.addEventListener("beforeunload", handleBeforeUnload);

    const originalDismiss = useToastStore.getState().dismiss;
    const unsubscribe = useToastStore.subscribe((state, prev) => {
      const toastStillExists = state.toasts.some((t) => t.id === toastId);
      if (!toastStillExists && prev.toasts.some((t) => t.id === toastId)) {
        clearTimeout(timer);
        setPending(false);
      }
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unsubscribe();
    };
  }, [onConfirm, onUndo, onOpenChange, enqueue]);

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto flex items-center gap-1.5 rounded-lg bg-foreground/5 px-3 py-2 text-xs text-foreground-muted">
          <Undo2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          After confirming, you&apos;ll have 5 seconds to undo this action.
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
