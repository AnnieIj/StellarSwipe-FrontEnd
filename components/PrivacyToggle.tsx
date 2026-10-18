"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacyStore } from "@/store/usePrivacyStore";
import { cn } from "@/lib/utils";

interface PrivacyToggleProps {
  /** Optional extra class names. */
  className?: string;
  /**
   * Visual size variant.
   * - "sm" — compact icon-only button, suited for nav bars / card headers.
   * - "md" — default: icon + label, suited for settings panels and full-page
   *           headers.
   */
  size?: "sm" | "md";
}

/**
 * PrivacyToggle
 * ─────────────
 * A clearly named control that masks portfolio totals, position values, and
 * P&L with a consistent placeholder across all portfolio routes (#795).
 *
 * - Persists the preference across reloads (via usePrivacyStore / localStorage).
 * - Exposes its state accessibly via aria-pressed and aria-label.
 * - Works with keyboard (Enter / Space) and touch input.
 * - Renders an Eye icon when values are visible, EyeOff when masked.
 */
export function PrivacyToggle({ className, size = "md" }: PrivacyToggleProps) {
  const { privacyMode, togglePrivacy } = usePrivacyStore();

  const label = privacyMode
    ? "Show portfolio values"
    : "Hide portfolio values";

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      aria-pressed={privacyMode}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-background",
        size === "sm"
          ? "p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          : "px-3 py-1.5 text-sm font-medium border border-border bg-white/5 text-foreground hover:bg-white/10",
        privacyMode && "text-amber-400 border-amber-500/40",
        className
      )}
    >
      {privacyMode ? (
        <EyeOff size={size === "sm" ? 15 : 16} aria-hidden="true" />
      ) : (
        <Eye size={size === "sm" ? 15 : 16} aria-hidden="true" />
      )}
      {size === "md" && (
        <span>{privacyMode ? "Show values" : "Hide values"}</span>
      )}
    </button>
  );
}
