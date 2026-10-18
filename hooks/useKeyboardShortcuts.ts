import { useEffect, useRef } from "react";

export interface ShortcutConfig {
  /**
   * The `KeyboardEvent.key` to match (e.g. "?", "n"), or a two-step sequence
   * written as "g then n".
   */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
}

/** How long the second key of a sequence ("g then n") is awaited. */
export const SEQUENCE_TIMEOUT_MS = 1000;

function parseSequence(key: string): [string, string] | null {
  const parts = key.split(/\s+then\s+/i);
  return parts.length === 2 ? [parts[0].toLowerCase(), parts[1].toLowerCase()] : null;
}

/**
 * Hook to register global keyboard shortcuts.
 * Handles discovery and invocation of keyboard shortcuts throughout the app.
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: "?", callback: () => setShowHelp(true) },
 *   { key: "g then n", callback: () => router.push("/app") },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  // First key of a sequence that is waiting for its second key.
  const pendingRef = useRef<{ key: string; expires: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // When a modal dialog is open it owns the keyboard (its own Escape /
      // Tab handling takes precedence), so don't fire global shortcuts that
      // could navigate away or double-trigger actions underneath it.
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]')) return;

      // Ignore shortcuts if user is typing in an input or textarea
      const isTyping =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.isContentEditable;

      if (isTyping) return;

      const pressed = event.key.toLowerCase();
      const pending = pendingRef.current;
      pendingRef.current = null;

      // Complete a pending sequence first ("g" was pressed, now "n").
      if (pending && pending.expires > Date.now() && !event.metaKey && !event.ctrlKey && !event.altKey) {
        for (const shortcut of shortcuts) {
          const sequence = parseSequence(shortcut.key);
          if (sequence && sequence[0] === pending.key && sequence[1] === pressed) {
            event.preventDefault();
            shortcut.callback();
            return;
          }
        }
      }

      // Start a sequence if this key is the first step of one.
      const startsSequence =
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        shortcuts.some((s) => parseSequence(s.key)?.[0] === pressed);
      if (startsSequence) {
        pendingRef.current = { key: pressed, expires: Date.now() + SEQUENCE_TIMEOUT_MS };
        return;
      }

      for (const shortcut of shortcuts) {
        if (parseSequence(shortcut.key)) continue;

        const keyMatches = event.key === shortcut.key;
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !(event.ctrlKey || event.metaKey);
        const shiftMatches = shortcut.shift ? event.shiftKey : true;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
