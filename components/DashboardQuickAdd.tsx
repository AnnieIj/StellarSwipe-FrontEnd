"use client";

/**
 * #756 – Dashboard quick-add widget action
 *
 * Renders a trigger button ("+  Add widget") and a modal dialog that lets the
 * user browse all available widgets and add any that are not yet visible.
 * Widgets that are already on the dashboard are shown as disabled so the user
 * can see what's available without accidentally duplicating.
 *
 * Behaviour
 * - Newly added widget is appended at the end of the visible list (predictable
 *   position) and the dialog closes with focus returned to the trigger.
 * - A live-region announces "Widget added" so screen-reader users get feedback
 *   without needing to inspect the DOM.
 * - The action is a no-op for widgets that are already visible (disabled UI).
 * - Layout permission: only active when the dashboard layout store is writable
 *   (always true in this implementation – extend with permission logic here).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDashboardLayoutStore,
  DEFAULT_WIDGET_ORDER,
  type DashboardWidgetId,
} from "@/store/useDashboardLayoutStore";

// ─── Widget catalogue ────────────────────────────────────────────────────────

const WIDGET_CATALOGUE: Record<
  DashboardWidgetId,
  { title: string; description: string }
> = {
  "portfolio-summary": {
    title: "Portfolio Summary",
    description: "Total balance, top assets, and a quick P&L snapshot.",
  },
  "portfolio-allocation": {
    title: "Portfolio Allocation",
    description: "Donut chart breaking down asset weights.",
  },
  "pnl-overview": {
    title: "P&L Overview",
    description: "Realised and unrealised profit/loss over time.",
  },
  "transaction-activity": {
    title: "Transaction Activity",
    description: "Live feed of your most recent on-chain transactions.",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardQuickAdd() {
  const visible = useDashboardLayoutStore((s) => s.visible);
  const addWidget = useDashboardLayoutStore((s) => s.addWidget);

  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [lastAdded, setLastAdded] = useState<DashboardWidgetId | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // ── Focus management ────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        firstFocusableRef.current?.focus();
      });
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  // ── Focus trap ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const container = dialogRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          "button:not(:disabled), [href], [tabindex]:not([tabindex='-1'])"
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAdd = useCallback(
    (id: DashboardWidgetId) => {
      addWidget(id);
      setLastAdded(id);
      setAnnouncement(
        `${WIDGET_CATALOGUE[id].title} added to dashboard at last position.`
      );
      setOpen(false);
    },
    [addWidget]
  );

  const allWidgets = DEFAULT_WIDGET_ORDER as readonly DashboardWidgetId[];
  const allAdded = allWidgets.every((id) => visible.includes(id));

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        disabled={allAdded}
        aria-haspopup="dialog"
        aria-label="Add a widget to the dashboard"
        title={allAdded ? "All widgets are already on the dashboard" : "Add widget"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors",
          "hover:border-border/80 hover:text-foreground hover:bg-white/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        <Plus size={13} aria-hidden="true" />
        Add widget
      </button>

      {/* Screen-reader live region */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {/* Modal backdrop + dialog */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="presentation"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-title"
            aria-describedby="quick-add-desc"
            className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-popover shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2
                  id="quick-add-title"
                  className="text-sm font-semibold text-foreground"
                >
                  Add widget
                </h2>
                <p
                  id="quick-add-desc"
                  className="mt-0.5 text-xs text-muted-foreground"
                >
                  Select a widget to add to your dashboard.
                </p>
              </div>
              <button
                ref={firstFocusableRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Widget list */}
            <ul role="list" className="divide-y divide-border/50 p-1">
              {allWidgets.map((id) => {
                const meta = WIDGET_CATALOGUE[id];
                const isAdded = visible.includes(id);
                const isNew = lastAdded === id;

                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => !isAdded && handleAdd(id)}
                      disabled={isAdded}
                      aria-label={
                        isAdded
                          ? `${meta.title} — already on dashboard`
                          : `Add ${meta.title}`
                      }
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                        isAdded
                          ? "cursor-default opacity-50"
                          : "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isAdded ? (
                          <CheckCircle2
                            size={16}
                            className="text-green-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <Plus
                            size={16}
                            className="text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {meta.title}
                          {isNew && (
                            <span className="ml-2 text-[10px] font-normal text-green-400">
                              just added
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {meta.description}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Footer hint */}
            <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              Widgets are added at the bottom of your dashboard layout.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
