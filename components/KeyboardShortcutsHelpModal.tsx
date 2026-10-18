"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Keyboard, Navigation, Zap, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ShortcutKey } from "@/components/ShortcutKey";

interface KeyboardShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  icon: React.ElementType;
  shortcuts: { keys: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    icon: Navigation,
    shortcuts: [
      { keys: "G then N", description: "Go to Signals feed" },
      { keys: "G then B", description: "Go to Bookmarks" },
      { keys: "G then H", description: "Go to Home" },
      { keys: "G then J", description: "Go to Journal" },
      { keys: "G then P", description: "Go to Providers" },
      { keys: "G then T", description: "Go to Tax Report" },
      { keys: "G then C", description: "Go to Compare" },
      { keys: "G then S", description: "Go to Backtest Simulator" },
    ],
  },
  {
    title: "Actions",
    icon: Zap,
    shortcuts: [
      { keys: "F", description: "Focus the signal feed filters" },
      { keys: "N", description: "New journal entry" },
      { keys: "T", description: "Toggle theme (light/dark)" },
      { keys: "R", description: "Refresh data on the current page" },
      { keys: "Arrow Up / Arrow Down", description: "Move focus between signals" },
      { keys: "Arrow Right / Enter", description: "Open trade modal for focused signal" },
      { keys: "Arrow Left", description: "Pass on the focused signal" },
    ],
  },
  {
    title: "Modals & Overlays",
    icon: Layers,
    shortcuts: [
      { keys: "?", description: "Open or close this keyboard shortcuts overlay" },
      { keys: "⌘K / Ctrl+K", description: "Open command palette" },
      { keys: "Escape", description: "Close any open modal or overlay" },
    ],
  },
];

export function KeyboardShortcutsHelpModal({
  open,
  onClose,
}: KeyboardShortcutsHelpModalProps) {
  const focusTrapRef = useFocusTrap({
    isActive: open,
    initialFocus: 'button[data-initial-focus="true"]',
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center px-4 py-6 sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            data-testid="keyboard-shortcuts-backdrop"
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
            aria-describedby="keyboard-shortcuts-description"
            className="relative z-overlay flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onKeyDown={(e) => {
              // Global shortcuts are suppressed while a dialog has focus, so the
              // modal handles its own toggle key alongside Escape.
              if (e.key === "Escape" || e.key === "?") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-high">
                  <Keyboard className="h-5 w-5 text-foreground" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="keyboard-shortcuts-title"
                    className="text-xl font-semibold text-foreground"
                  >
                    Keyboard shortcuts
                  </h2>
                  <p
                    id="keyboard-shortcuts-description"
                    className="mt-1 text-sm leading-6 text-foreground-muted"
                  >
                    Press <ShortcutKey keys="?" size="sm" /> anytime to open or
                    close this overlay. Shortcuts are paused while you type in a
                    field.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close keyboard shortcuts"
                onClick={onClose}
                data-initial-focus="true"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {SHORTCUT_GROUPS.map((group) => {
                  const headingId = `keyboard-shortcuts-group-${group.title.replace(/\W+/g, "-").toLowerCase()}`;
                  return (
                    <section
                      key={group.title}
                      aria-labelledby={headingId}
                      className="overflow-hidden rounded-2xl border border-border bg-background"
                    >
                      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                        <group.icon className="h-4 w-4 text-foreground-muted" aria-hidden="true" />
                        <h3 id={headingId} className="text-sm font-semibold text-foreground">
                          {group.title}
                        </h3>
                      </div>
                      <dl className="divide-y divide-border">
                        {group.shortcuts.map((shortcut) => (
                          <div
                            key={shortcut.keys}
                            className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                          >
                            <dt className="shrink-0">
                              <ShortcutKey keys={shortcut.keys} size="sm" />
                            </dt>
                            <dd className="text-sm leading-snug text-foreground sm:text-right">
                              {shortcut.description}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-border bg-surface-high px-4 py-3">
                <p className="text-sm text-foreground-muted">
                  <strong className="text-foreground">Tip:</strong> Press{" "}
                  <ShortcutKey keys="G" size="sm" /> and then, within a second,
                  the letter for a page to jump straight to it.
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-border px-6 py-4">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
