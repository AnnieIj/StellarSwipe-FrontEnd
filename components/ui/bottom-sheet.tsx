"use client";

import { useEffect, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Rendered after the header, before the scrollable content — e.g. quick toggles. */
  headerExtra?: ReactNode;
  ariaLabel: string;
  className?: string;
  /** Selector focused when the sheet opens; defaults to the built-in close button. */
  initialFocus?: string;
  /**
   * Sticky action row pinned to the bottom of the sheet (e.g. Cancel / Reset /
   * Apply). Stays reachable while the content above scrolls.
   */
  footer?: ReactNode;
}

const DISMISS_DRAG_THRESHOLD = 120;
const DISMISS_VELOCITY_THRESHOLD = 500;

/**
 * Mobile-optimized drawer that slides up from the bottom of the viewport.
 * Supports drag-to-dismiss (past a distance/velocity threshold, so a stray
 * touch doesn't close it), focus trapping, and body scroll locking.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  headerExtra,
  ariaLabel,
  className,
  initialFocus = 'button[aria-label="Close"]',
  footer,
}: BottomSheetProps) {
  const sheetRef = useFocusTrap({ isActive: open, initialFocus });
  // Drag-to-dismiss starts only from the grab handle / header so scrolling
  // the sheet content and using its controls never moves the sheet.
  const dragControls = useDragControls();
  const startDrag = (e: ReactPointerEvent) => dragControls.start(e);

  useEffect(() => {
    if (!open) return;
    // Lock page scroll without shifting the underlying view.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleDragEnd = (
    _event: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo
  ) => {
    if (
      info.offset.y > DISMISS_DRAG_THRESHOLD ||
      info.velocity.y > DISMISS_VELOCITY_THRESHOLD
    ) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />

          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 mx-auto flex w-full max-w-lg flex-col overflow-x-hidden rounded-t-2xl border-t border-white/10 bg-slate-900 shadow-2xl shadow-black/60",
              className
            )}
            style={{
              maxHeight: "85dvh",
              paddingLeft: "env(safe-area-inset-left)",
              paddingRight: "env(safe-area-inset-right)",
              paddingBottom: footer ? undefined : "env(safe-area-inset-bottom)",
            }}
          >
            <div
              className="flex shrink-0 justify-center pt-3 pb-1"
              aria-hidden="true"
              onPointerDown={startDrag}
              style={{ touchAction: "none" }}
            >
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {(title || headerExtra) && (
              <div
                className="flex shrink-0 items-center justify-between px-4 py-3"
                onPointerDown={(e) => {
                  // Don't hijack taps on header buttons.
                  if ((e.target as HTMLElement).closest("button, a, input, select")) return;
                  startDrag(e);
                }}
              >
                {title && (
                  <span className="text-sm font-semibold text-white">
                    {title}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  {headerExtra}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              {children}
            </div>

            {footer && (
              <div
                className="shrink-0 border-t border-white/10 bg-slate-900 px-4 pt-3"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
