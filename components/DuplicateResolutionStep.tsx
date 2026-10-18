"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export type DuplicateResolution = "skip" | "update" | "keep";

export interface DuplicateGroup {
  /** Fingerprint string used to identify the duplicate group. */
  key: string;
  /** Human-readable description, e.g. "XLM/USDC — 2026-09-10". */
  description: string;
  /** Number of incoming rows that match this group. */
  incomingCount: number;
  /** Number of existing records that match this group. */
  existingCount: number;
}

export interface DuplicateResolutionStepProps {
  /** Groups of detected duplicates. */
  groups: DuplicateGroup[];
  /** Current per-group resolution choices, keyed by `group.key`. */
  resolutions: Record<string, DuplicateResolution>;
  /** Called whenever the user changes a resolution choice. */
  onChange: (key: string, resolution: DuplicateResolution) => void;
  /**
   * Default resolution applied to newly detected groups.
   * @default "skip"
   */
  defaultResolution?: DuplicateResolution;
}

const RESOLUTION_OPTIONS: {
  value: DuplicateResolution;
  label: string;
  description: string;
  className: string;
}[] = [
  {
    value: "skip",
    label: "Skip",
    description: "Don't import duplicates.",
    className:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300 aria-pressed:bg-yellow-500/25 aria-pressed:border-yellow-400/50",
  },
  {
    value: "update",
    label: "Update",
    description: "Overwrite existing records with incoming data.",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-300 aria-pressed:bg-blue-500/25 aria-pressed:border-blue-400/50",
  },
  {
    value: "keep",
    label: "Keep both",
    description: "Import duplicates alongside existing records.",
    className:
      "border-white/15 bg-white/5 text-muted-foreground aria-pressed:bg-white/10 aria-pressed:border-white/25",
  },
];

/**
 * DuplicateResolutionStep
 *
 * Renders a summary of duplicate groups found during the import preview and
 * lets the user choose skip / update / keep for each group (#780).
 *
 * Key properties:
 * - Groups are listed with their incoming vs. existing counts so the user
 *   understands the scope.
 * - Resolution buttons use aria-pressed so assistive technology surfaces the
 *   current choice correctly.
 * - Cancelling (navigating back) leaves the source mapping intact — this
 *   component is stateless with respect to the mapping step.
 * - The final review summary (shown below the list) reflects the chosen
 *   outcome and affected row counts before the user commits.
 */
export function DuplicateResolutionStep({
  groups,
  resolutions,
  onChange,
  defaultResolution = "skip",
}: DuplicateResolutionStepProps) {
  const [applyAll, setApplyAll] = useState<DuplicateResolution | "">("");

  const handleApplyAll = useCallback(
    (resolution: DuplicateResolution) => {
      setApplyAll(resolution);
      groups.forEach((g) => onChange(g.key, resolution));
    },
    [groups, onChange]
  );

  const summary = useMemo(() => {
    let willSkip = 0;
    let willUpdate = 0;
    let willKeep = 0;

    groups.forEach((g) => {
      const res = resolutions[g.key] ?? defaultResolution;
      if (res === "skip") willSkip += g.incomingCount;
      else if (res === "update") willUpdate += g.incomingCount;
      else willKeep += g.incomingCount;
    });

    return { willSkip, willUpdate, willKeep };
  }, [groups, resolutions, defaultResolution]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <CheckCircle2 size={40} className="text-emerald-400" aria-hidden="true" />
        <p className="text-sm font-medium text-emerald-300">
          No duplicates detected.
        </p>
        <p className="text-xs text-muted-foreground">
          All incoming rows are unique — you can proceed to import.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Intro ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-200">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <strong>{groups.length}</strong> duplicate group
          {groups.length === 1 ? "" : "s"} detected. Choose how to handle each
          one before importing.
        </p>
      </div>

      {/* ── Apply-all shortcut ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Apply to all:</span>
        {RESOLUTION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleApplyAll(opt.value)}
            aria-pressed={applyAll === opt.value}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              opt.className
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Group list ─────────────────────────────────────────────────── */}
      <ul className="space-y-2" aria-label="Duplicate groups">
        {groups.map((group) => {
          const chosen = resolutions[group.key] ?? defaultResolution;
          return (
            <li
              key={group.key}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* Description + counts */}
                <div className="flex items-start gap-2">
                  <Copy
                    size={14}
                    className="mt-0.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {group.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.incomingCount} incoming ·{" "}
                      {group.existingCount} existing
                    </p>
                  </div>
                </div>

                {/* Resolution buttons */}
                <div
                  className="flex shrink-0 gap-1"
                  role="group"
                  aria-label={`Resolution for ${group.description}`}
                >
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange(group.key, opt.value)}
                      aria-pressed={chosen === opt.value}
                      title={opt.description}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        opt.className
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Summary of choices ─────────────────────────────────────────── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs"
      >
        <p className="mb-1.5 font-semibold text-muted-foreground uppercase tracking-wide">
          Resolution summary
        </p>
        <ul className="space-y-1">
          {summary.willSkip > 0 && (
            <li className="text-yellow-300">
              {summary.willSkip} row{summary.willSkip === 1 ? "" : "s"} will be
              skipped
            </li>
          )}
          {summary.willUpdate > 0 && (
            <li className="text-blue-300">
              {summary.willUpdate} row{summary.willUpdate === 1 ? "" : "s"} will
              update existing records
            </li>
          )}
          {summary.willKeep > 0 && (
            <li className="text-foreground">
              {summary.willKeep} row{summary.willKeep === 1 ? "" : "s"} will be
              imported alongside existing records
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
