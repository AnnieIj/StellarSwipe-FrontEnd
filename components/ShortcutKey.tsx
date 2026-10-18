"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface ShortcutKeyProps {
  /** The shortcut key(s) to display, e.g. "⌘K", "?", "G then N", "Esc", "Arrow Up / Arrow Down" */
  keys: string;
  /** Optional size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const KEY_MAP: Record<string, string> = {
  meta: "⌘",
  command: "⌘",
  cmd: "⌘",
  ctrl: "Ctrl",
  control: "Ctrl",
  shift: "⇧",
  alt: "⌥",
  option: "⌥",
  escape: "Esc",
  esc: "Esc",
  enter: "↵",
  return: "↵",
  tab: "Tab",
  backspace: "⌫",
  delete: "Del",
  space: "Space",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

/** How each rendered glyph should be read aloud by assistive technology. */
const SPOKEN_MAP: Record<string, string> = {
  "⌘": "Command",
  "⇧": "Shift",
  "⌥": "Option",
  Esc: "Escape",
  "↵": "Enter",
  "⌫": "Backspace",
  Del: "Delete",
  "↑": "Arrow Up",
  "↓": "Arrow Down",
  "←": "Arrow Left",
  "→": "Arrow Right",
  "?": "Question mark",
};

function normalizeKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed === " ") return "Space";
  // "Arrow Up" and "ArrowUp" should both map to "↑".
  const lookup = trimmed.toLowerCase().replace(/\s+/g, "");
  if (KEY_MAP[lookup]) return KEY_MAP[lookup];
  return trimmed.length === 1 ? trimmed.toUpperCase() : trimmed;
}

/** Splits a single chord ("Ctrl+K", "⌘K", "?") into its individual keys. */
function parseChord(chord: string): string[] {
  const trimmed = chord.trim();
  // A lone "+" is a key in its own right, not a separator.
  if (trimmed === "+") return ["+"];
  // "⌘K" style: a modifier glyph directly followed by the key.
  const glyphMatch = /^([⌘⇧⌥])(.+)$/.exec(trimmed);
  if (glyphMatch) return [glyphMatch[1], ...parseChord(glyphMatch[2])];
  return trimmed.split("+").map(normalizeKey);
}

type Separator = "then" | "or";

/**
 * Parses a shortcut description into groups of chords:
 *  - "G then N"               → sequence of two chords
 *  - "Arrow Up / Arrow Down"  → alternatives
 *  - "Ctrl+K"                 → a single chord of two keys
 */
function parseShortcut(keys: string): { chords: string[][]; separator: Separator } {
  if (/\sthen\s/i.test(keys)) {
    return { chords: keys.split(/\sthen\s/i).map(parseChord), separator: "then" };
  }
  if (keys.includes(" / ")) {
    return { chords: keys.split(" / ").map(parseChord), separator: "or" };
  }
  return { chords: [parseChord(keys)], separator: "or" };
}

function speak(key: string): string {
  return SPOKEN_MAP[key] ?? key;
}

/** Human-readable version of a shortcut, e.g. "Command+K or Ctrl+K". */
export function describeShortcut(keys: string): string {
  const { chords, separator } = parseShortcut(keys);
  return chords.map((chord) => chord.map(speak).join("+")).join(` ${separator} `);
}

const sizeStyles = {
  sm: "h-5 min-w-[20px] px-1 text-[10px] rounded-[3px]",
  md: "h-6 min-w-[24px] px-1.5 text-xs rounded-[4px]",
  lg: "h-7 min-w-[28px] px-2 text-sm rounded-[4px]",
};

export function ShortcutKey({ keys, size = "md", className }: ShortcutKeyProps) {
  const { chords, separator } = parseShortcut(keys);

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1 font-mono", className)}>
      {/* Visual keycaps are decorative; the readable label below is announced instead. */}
      <span aria-hidden="true" className="inline-flex flex-wrap items-center gap-1">
        {chords.map((chord, chordIndex) => (
          <Fragment key={chordIndex}>
            {chordIndex > 0 && (
              <span className="text-[11px] text-foreground-muted">{separator === "then" ? "then" : "/"}</span>
            )}
            {chord.map((key, keyIndex) => (
              <Fragment key={keyIndex}>
                {keyIndex > 0 && <span className="text-[11px] text-foreground-muted">+</span>}
                <kbd
                  className={cn(
                    "inline-flex items-center justify-center border border-border bg-surface-high font-semibold leading-none text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]",
                    sizeStyles[size]
                  )}
                >
                  {key}
                </kbd>
              </Fragment>
            ))}
          </Fragment>
        ))}
      </span>
      <span className="sr-only">{describeShortcut(keys)}</span>
    </span>
  );
}
