"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore, DEFAULT_ACCENT_COLOR } from "@/store/useThemeStore";
import { AlertTriangle, Palette, RotateCcw } from "lucide-react";

/** WCAG relative luminance of a hex color (sRGB) */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex: string, background: "#fff" | "#09090b"): number {
  const L1 = relativeLuminance(hex);
  const L2 = background === "#fff" ? 1 : relativeLuminance("#09090b");
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const PALETTE: { color: string; label: string }[] = [
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Purple" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#10b981", label: "Emerald" },
  { color: "#f59e0b", label: "Amber" },
  { color: "#ef4444", label: "Red" },
  { color: "#ec4899", label: "Pink" },
  { color: "#f97316", label: "Orange" },
];

const MIN_CONTRAST = 3.0;

interface AccentColorPickerProps {
  className?: string;
}

export function AccentColorPicker({ className }: AccentColorPickerProps) {
  const { accentColor, setAccentColor, theme } = useThemeStore();
  const [customInput, setCustomInput] = useState("");
  const [inputError, setInputError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const bg = theme === "dark" ? "#09090b" : "#fff";

  // Apply accent color to CSS custom property on mount and changes
  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", accentColor);
  }, [accentColor]);

  function isValidHex(val: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(val);
  }

  function getContrastWarning(hex: string): string | null {
    if (!isValidHex(hex)) return null;
    const lightContrast = contrastRatio(hex, "#fff");
    const darkContrast = contrastRatio(hex, "#09090b");
    if (lightContrast < MIN_CONTRAST || darkContrast < MIN_CONTRAST) {
      return `Low contrast (light: ${lightContrast.toFixed(
        1
      )}:1, dark: ${darkContrast.toFixed(1)}:1). WCAG AA requires ≥ 3:1.`;
    }
    return null;
  }

  function applyColor(hex: string) {
    setAccentColor(hex);
    setCustomInput("");
    setInputError("");
  }

  function handleCustomInput(val: string) {
    setCustomInput(val);
    setInputError("");
  }

  function handleCustomApply() {
    const hex = customInput.startsWith("#") ? customInput : `#${customInput}`;
    if (!isValidHex(hex)) {
      setInputError("Enter a valid hex color (e.g. #a855f7)");
      inputRef.current?.focus();
      return;
    }
    applyColor(hex);
  }

  const warning = getContrastWarning(accentColor);

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <Palette
          size={14}
          className="text-muted-foreground"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-foreground">
          Accent Color
        </span>
        {accentColor !== DEFAULT_ACCENT_COLOR && (
          <button
            type="button"
            onClick={() => applyColor(DEFAULT_ACCENT_COLOR)}
            aria-label="Reset accent color to default"
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={11} aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      {/* Curated palette */}
      <div
        role="group"
        aria-label="Accent color palette"
        className="flex flex-wrap gap-2"
      >
        {PALETTE.map(({ color, label }) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} (${color})`}
            aria-pressed={accentColor === color}
            onClick={() => applyColor(color)}
            className="relative h-7 w-7 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:scale-110"
            style={{ backgroundColor: color }}
          >
            {accentColor === color && (
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold"
              >
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 flex-shrink-0 rounded-full border border-border"
          style={{
            backgroundColor: isValidHex(
              customInput.startsWith("#") ? customInput : `#${customInput}`
            )
              ? customInput.startsWith("#")
                ? customInput
                : `#${customInput}`
              : accentColor,
          }}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="#hex color"
          value={customInput}
          onChange={(e) => handleCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCustomApply()}
          aria-label="Custom accent color hex value"
          aria-describedby={inputError ? "accent-input-error" : undefined}
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={handleCustomApply}
          disabled={!customInput}
          className="rounded border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Apply
        </button>
      </div>

      {inputError && (
        <p
          id="accent-input-error"
          role="alert"
          className="text-xs text-red-400"
        >
          {inputError}
        </p>
      )}

      {/* Contrast warning */}
      {warning && (
        <div
          role="alert"
          className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-400"
        >
          <AlertTriangle
            size={12}
            className="mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}
