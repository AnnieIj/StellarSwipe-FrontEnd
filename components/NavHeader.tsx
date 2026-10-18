"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { KeyboardShortcutsButton } from "@/components/KeyboardShortcutsButton";
import { KeyboardShortcutsHelpModal } from "@/components/KeyboardShortcutsHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function NavHeader() {
  const pathname = usePathname();
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Register keyboard shortcut for "?" to toggle the help modal
  useKeyboardShortcuts([
    {
      key: "?",
      callback: () => setShowKeyboardHelp((open) => !open),
    },
  ]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-sticky border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-foreground hover:text-accent-primary transition-colors"
          >
            StellarSwipe
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-accent-primary",
                pathname === "/" ? "text-accent-primary" : "text-foreground-muted"
              )}
            >
              Home
            </Link>
            <Link
              href="/app"
              className={cn(
                "text-sm font-medium transition-colors hover:text-accent-primary",
                pathname === "/app"
                  ? "text-accent-primary"
                  : "text-foreground-muted"
              )}
            >
              Signals
            </Link>
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <KeyboardShortcutsButton
                onClick={() => setShowKeyboardHelp(true)}
              />
            </div>
          </div>
        </div>
      </nav>

      <KeyboardShortcutsHelpModal
        open={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </>
  );
}
