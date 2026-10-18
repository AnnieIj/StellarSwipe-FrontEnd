"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KeyboardShortcutsButtonProps {
  onClick: () => void;
}

/**
 * A minimal help button that shows users they can access keyboard shortcuts.
 * Appears in navigation and provides a discoverable entry point for shortcuts.
 */
export function KeyboardShortcutsButton({
  onClick,
}: KeyboardShortcutsButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            aria-label="Keyboard shortcuts help"
            className="h-9 w-9"
          >
            <HelpCircle size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          <p className="text-sm">Press <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 font-mono">?</kbd> for shortcuts</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
