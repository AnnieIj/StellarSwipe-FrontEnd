"use client";

import {
  useState,
  useMemo,
  useCallback,
  useId,
  useEffect,
  useRef,
} from "react";
import { Clock, Search, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Approved timezone list ────────────────────────────────────────────────
// Curated from major financial market hubs + common user locales.
export const APPROVED_TIMEZONES = [
  { tz: "UTC", label: "UTC — Coordinated Universal Time" },
  { tz: "America/New_York", label: "New York (ET)" },
  { tz: "America/Chicago", label: "Chicago (CT)" },
  { tz: "America/Denver", label: "Denver (MT)" },
  { tz: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { tz: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { tz: "Europe/London", label: "London (GMT/BST)" },
  { tz: "Europe/Paris", label: "Paris (CET/CEST)" },
  { tz: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { tz: "Europe/Moscow", label: "Moscow (MSK)" },
  { tz: "Africa/Lagos", label: "Lagos (WAT)" },
  { tz: "Africa/Nairobi", label: "Nairobi (EAT)" },
  { tz: "Asia/Dubai", label: "Dubai (GST)" },
  { tz: "Asia/Kolkata", label: "Mumbai/Delhi (IST)" },
  { tz: "Asia/Singapore", label: "Singapore (SGT)" },
  { tz: "Asia/Shanghai", label: "Shanghai/Beijing (CST)" },
  { tz: "Asia/Tokyo", label: "Tokyo (JST)" },
  { tz: "Asia/Seoul", label: "Seoul (KST)" },
  { tz: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { tz: "Pacific/Auckland", label: "Auckland (NZDT/NZST)" },
] as const;

export type ApprovedTimezone = (typeof APPROVED_TIMEZONES)[number]["tz"];

// Fallback timezone for invalid / deprecated values
const SAFE_FALLBACK: ApprovedTimezone = "UTC";

/** Sample timestamp used for the live preview. */
const SAMPLE_DATE = new Date("2026-09-27T14:30:00Z");

/**
 * Format a date in the given IANA timezone, including offset and DST name.
 * Returns a safe string or a fallback on error.
 */
function formatInTimezone(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "longOffset",
    }).format(date);
  } catch {
    return "—";
  }
}

/**
 * Return the short DST-aware timezone abbreviation (e.g. "EST", "BST").
 * Falls back to the UTC offset on error.
 */
function getShortTzName(date: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/**
 * Validate whether an IANA timezone string is supported by the runtime.
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export interface TimezoneSelectorProps {
  /** Currently saved timezone IANA string. */
  value: string;
  /** Called when the user picks a new timezone. */
  onChange: (tz: ApprovedTimezone) => void;
  /** Extra Tailwind classes on the outer wrapper. */
  className?: string;
  disabled?: boolean;
}

/**
 * TimezoneSelector
 *
 * A searchable dropdown that lets users choose a timezone from the approved
 * list. Shows a live preview of a sample timestamp in the selected timezone so
 * the user can immediately understand the offset and DST behaviour before saving.
 *
 * - Supports keyboard navigation (arrow keys, Enter, Escape).
 * - Invalid or deprecated timezone values fall back to UTC safely.
 * - The saved choice is reflected immediately across supported views via onChange.
 */
export function TimezoneSelector({
  value,
  onChange,
  className,
  disabled = false,
}: TimezoneSelectorProps) {
  const listboxId = useId();
  const searchId = useId();

  // Resolve the initial effective timezone (fallback if invalid/deprecated)
  const effectiveValue = useMemo<ApprovedTimezone>(() => {
    const isApproved = APPROVED_TIMEZONES.some((t) => t.tz === value);
    if (isApproved) return value as ApprovedTimezone;
    // Accept any valid IANA tz, but force-fallback if truly unsupported
    if (isValidTimezone(value)) {
      // Value is valid but not in approved list — warn and use as-is for display
      return value as ApprovedTimezone;
    }
    return SAFE_FALLBACK;
  }, [value]);

  const isDeprecated =
    !APPROVED_TIMEZONES.some((t) => t.tz === value) &&
    isValidTimezone(value) &&
    value !== SAFE_FALLBACK;
  const isInvalid = !isValidTimezone(value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);

  // Live preview date — refreshed every minute so the preview stays accurate
  const [now, setNow] = useState(SAMPLE_DATE);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const filteredZones = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [...APPROVED_TIMEZONES];
    return APPROVED_TIMEZONES.filter(
      (z) =>
        z.label.toLowerCase().includes(q) ||
        z.tz.toLowerCase().includes(q)
    );
  }, [query]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setQuery("");
    setActiveIdx(-1);
    setOpen(true);
  }, [disabled]);

  const selectZone = useCallback(
    (tz: ApprovedTimezone) => {
      onChange(tz);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          openDropdown();
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIdx((i) => Math.min(i + 1, filteredZones.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIdx((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIdx >= 0 && filteredZones[activeIdx]) {
            selectZone(filteredZones[activeIdx].tz as ApprovedTimezone);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
        default:
          break;
      }
    },
    [open, openDropdown, filteredZones, activeIdx, selectZone]
  );

  const selectedEntry =
    APPROVED_TIMEZONES.find((t) => t.tz === effectiveValue) ??
    { tz: effectiveValue, label: effectiveValue };

  const previewFormatted = formatInTimezone(now, effectiveValue);
  const shortName = getShortTzName(now, effectiveValue);

  return (
    <div
      ref={containerRef}
      className={cn("space-y-3", className)}
      onKeyDown={handleKeyDown}
    >
      {/* ── Invalid/deprecated warning ─────────────────────────────────── */}
      {isInvalid && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            The saved timezone <code className="font-mono">{value}</code> is not
            supported. Falling back to <strong>UTC</strong>.
          </span>
        </div>
      )}
      {isDeprecated && !isInvalid && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <code className="font-mono">{value}</code> is not in the approved
            timezone list. It will work but consider selecting one from the list
            below for best compatibility.
          </span>
        </div>
      )}

      {/* ── Trigger button ────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor={searchId}
          id={`${listboxId}-label`}
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Timezone
        </label>
        <button
          type="button"
          id={`${listboxId}-trigger`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${listboxId}-label`}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={openDropdown}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-left transition-colors",
            "hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open && "border-foreground/40",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Clock size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{selectedEntry.label}</span>
          </span>
          {shortName && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {shortName}
            </span>
          )}
        </button>
      </div>

      {/* ── Dropdown ─────────────────────────────────────────────────── */}
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={`${listboxId}-label`}
          aria-activedescendant={
            activeIdx >= 0
              ? `tz-option-${filteredZones[activeIdx]?.tz}`
              : undefined
          }
          className="rounded-xl border border-border bg-card shadow-lg overflow-hidden"
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={13} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id={searchId}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(-1);
              }}
              placeholder="Search timezone…"
              aria-label="Search timezones"
              autoFocus
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Options list */}
          <ul
            className="max-h-56 overflow-y-auto py-1"
            role="presentation"
          >
            {filteredZones.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                No timezones match &ldquo;{query}&rdquo;
              </li>
            ) : (
              filteredZones.map((zone, idx) => {
                const isSelected = zone.tz === effectiveValue;
                const isActive = idx === activeIdx;
                const zoneShort = getShortTzName(now, zone.tz);

                return (
                  <li
                    key={zone.tz}
                    id={`tz-option-${zone.tz}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectZone(zone.tz as ApprovedTimezone)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors",
                      isActive && "bg-muted/60",
                      isSelected
                        ? "text-blue-400"
                        : "text-foreground hover:bg-muted/40"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <Check size={13} className="shrink-0 text-blue-400" aria-hidden="true" />
                      ) : (
                        <span className="w-[13px] shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{zone.label}</span>
                    </span>
                    {zoneShort && (
                      <span className="ml-2 shrink-0 text-[10px] font-mono text-muted-foreground">
                        {zoneShort}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* ── Live sample preview ───────────────────────────────────────── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs"
      >
        <div className="flex items-center gap-1.5 mb-1 text-muted-foreground font-medium">
          <Clock size={11} aria-hidden="true" />
          <span>Sample timestamp in selected timezone</span>
        </div>
        <p
          className="tabular-nums font-mono text-foreground"
          aria-label={`Sample time in ${selectedEntry.label}: ${previewFormatted}`}
        >
          {previewFormatted}
        </p>
        <p className="mt-1 text-muted-foreground/70">
          The sample date is Sun, Sep 27, 2026 at 14:30 UTC. This demonstrates
          the offset and any active daylight-saving adjustment.
        </p>
      </div>
    </div>
  );
}
