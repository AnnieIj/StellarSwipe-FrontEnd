"use client";

import { useEffect, useId, useState } from "react";
import { Moon } from "lucide-react";
import {
  getDefaultQuietHours,
  getQuietHoursSettings,
  saveQuietHoursSettings,
  validateQuietHours,
  type QuietHoursSettings as QuietHours,
} from "@/lib/quietHours";
import { cn } from "@/lib/utils";

function getTimeZoneOptions(current: string): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  return supported.includes(current) ? supported : [current, ...supported];
}

/**
 * Daily window during which non-critical notifications are deferred instead
 * of shown (see lib/quietHours.ts). Settings save only when the window is
 * valid; an invalid window is explained inline and leaves the saved value as is.
 */
export function QuietHoursSettings() {
  const id = useId();
  const [settings, setSettings] = useState<QuietHours>(getDefaultQuietHours);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(getQuietHoursSettings());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const update = (next: Partial<QuietHours>) => {
    const draft = { ...settings, ...next };
    setSettings(draft);
    const validationError = validateQuietHours(draft);
    setError(validationError);
    if (!validationError) saveQuietHoursSettings(draft);
  };

  const errorId = `${id}-error`;
  const timeZones = getTimeZoneOptions(settings.timeZone);
  const fieldClass =
    "rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Moon size={12} aria-hidden="true" />
            Quiet hours
          </p>
          <p className="text-[11px] text-foreground-muted">
            Defer non-critical notifications during a daily window. Trade
            results still arrive immediately.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Toggle quiet hours"
          onClick={() => update({ enabled: !settings.enabled })}
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
            settings.enabled ? "bg-accent-sky" : "bg-foreground/15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
              settings.enabled ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      <fieldset
        disabled={!settings.enabled}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <legend className="sr-only">Quiet hours window</legend>
        <label className="flex flex-col gap-1 text-[11px] text-foreground-muted">
          Start
          <input
            type="time"
            value={settings.start}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => update({ start: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-foreground-muted">
          End
          <input
            type="time"
            value={settings.end}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => update({ end: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-foreground-muted">
          Time zone
          <select
            value={settings.timeZone}
            onChange={(e) => update({ timeZone: e.target.value })}
            className={fieldClass}
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-destructive"
        >
          {error} Your saved quiet hours are unchanged until the window is valid.
        </p>
      ) : (
        <p className="text-[11px] text-foreground-muted">
          Windows that cross midnight, such as 22:00 to 07:00, are supported.
        </p>
      )}
    </div>
  );
}
