"use client";

import { cn } from "@/lib/utils";
import { ShortcutKey } from "@/components/ShortcutKey";

interface ContextualHintProps {
  /** Keyboard shortcut to display, e.g. "⌘K", "?", "N" */
  shortcut: string;
  /** Label describing the action, e.g. "Open command palette" */
  label?: string;
  /** Position of the hint relative to content */
  position?: "right" | "bottom" | "inside";
  className?: string;
  /** When true, renders as a smaller, more subtle hint */
  subtle?: boolean;
}

/**
 * ContextualHint displays a small keyboard shortcut badge next to an action.
 * Use it near buttons and interactive elements to help users discover shortcuts.
 *
 * @example
 * <Button>
 *   New Journal Entry
 *   <ContextualHint shortcut="N" label="New entry" position="inside" />
 * </Button>
 */
export function ContextualHint({
  shortcut,
  label,
  position = "right",
  className,
  subtle,
}: ContextualHintProps) {
  if (position === "inside") {
    return (
      <span
        className={cn(
          "ml-1.5 inline-flex items-center gap-1",
          subtle ? "opacity-50" : "opacity-70",
          className
        )}
        aria-label={label ? `Shortcut: ${shortcut} — ${label}` : `Shortcut: ${shortcut}`}
      >
        <ShortcutKey keys={shortcut} size="sm" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        position === "bottom" ? "mt-1 flex-col" : "ml-2",
        subtle ? "opacity-50" : "opacity-70",
        "text-foreground-muted transition-opacity group-hover:opacity-100",
        className
      )}
      aria-label={label ? `Shortcut: ${shortcut} — ${label}` : `Shortcut: ${shortcut}`}
    >
      <ShortcutKey keys={shortcut} size="sm" />
      {label && <span className="text-[10px]">{label}</span>}
    </span>
  );
}
