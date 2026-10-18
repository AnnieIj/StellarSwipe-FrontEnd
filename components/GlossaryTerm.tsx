"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefinition } from "@/lib/glossary";

export interface GlossaryTermProps {
  /**
   * The trading term to look up. Must match a key in the glossary dictionary
   * (case-insensitive). If not found, the children render with no tooltip.
   */
  term: string;
  /** The rendered text. Defaults to `term` if omitted. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Wraps a trading term and shows its definition in an accessible tooltip on
 * hover or keyboard focus.
 *
 * - Definition sourced from `lib/glossary.ts` (single source of truth).
 * - Keyboard-reachable via Tab, announced to screen readers via `aria-describedby`.
 * - If the term is not in the dictionary the children render unchanged (no tooltip).
 *
 * @example
 * <GlossaryTerm term="slippage">slippage</GlossaryTerm>
 *
 * @example
 * // Custom display text
 * <GlossaryTerm term="stop-loss">Stop Loss</GlossaryTerm>
 */
export function GlossaryTerm({ term, children, className }: GlossaryTermProps) {
  const definition = getDefinition(term);

  // No tooltip if the term isn't in the dictionary
  if (!definition) {
    return <span className={className}>{children ?? term}</span>;
  }

  const tooltipId = `glossary-${term.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {/* We use a <span> so GlossaryTerm can wrap inline text without
              breaking paragraph flow. The trigger is keyboard-focusable so
              screen-reader users can also access the tooltip. */}
          <span
            role="term"
            tabIndex={0}
            aria-describedby={tooltipId}
            className={cn(
              "cursor-help underline decoration-dotted underline-offset-2",
              "decoration-muted-foreground/60",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm",
              className
            )}
          >
            {children ?? term}
            <HelpCircle
              className="ml-0.5 inline h-3 w-3 text-muted-foreground/60 align-text-top"
              aria-hidden="true"
            />
          </span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            id={tooltipId}
            role="tooltip"
            side="top"
            align="center"
            sideOffset={6}
            className={cn(
              "z-50 max-w-xs rounded-lg border bg-popover px-3 py-2.5 shadow-md",
              "text-xs text-popover-foreground leading-relaxed",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            <p className="font-semibold mb-1 capitalize">{term}</p>
            <p>{definition}</p>
            <Tooltip.Arrow className="fill-border" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
