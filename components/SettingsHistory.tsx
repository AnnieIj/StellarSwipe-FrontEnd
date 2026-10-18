"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, EyeOff, History, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsHistoryStore } from "@/store/useSettingsHistoryStore";
import {
  formatHistoryValue,
  getRestoreAvailability,
  isHistoryStorageAvailable,
  type SettingsHistoryEntry,
} from "@/lib/settingsHistory";
import {
  getSettingDefinition,
  restoreSettingFromHistory,
  startSettingsHistoryTracking,
} from "@/lib/settingsRegistry";
import {
  formatAbsoluteTimestamp,
  formatRelativeTimestamp,
  toDate,
} from "@/lib/timestampUtils";

type Feedback = { tone: "success" | "error"; message: string } | null;

/**
 * SettingsHistory (#900)
 *
 * Lists recent preference changes (setting, prior value, current value and
 * time) and restores a prior value for settings that support it. Sensitive
 * values are shown as "Hidden" and can't be restored.
 */
export function SettingsHistory() {
  const entries = useSettingsHistoryStore((s) => s.entries);
  const clear = useSettingsHistoryStore((s) => s.clear);
  // null until checked on the client, so SSR and first paint agree.
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setStorageAvailable(isHistoryStorageAvailable());
    return startSettingsHistoryTracking();
  }, []);

  const handleRestore = (entry: SettingsHistoryEntry) => {
    const result = restoreSettingFromHistory(entry.id);
    setFeedback(
      result.ok
        ? { tone: "success", message: `${result.label} restored to ${result.value}.` }
        : { tone: "error", message: result.message }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-foreground">Recent changes</p>
          <p className="text-xs text-foreground-muted">
            The last changes made to your preferences on this device.
          </p>
        </div>
        {storageAvailable && entries.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              clear();
              setFeedback(null);
            }}
          >
            Clear history
          </Button>
        )}
      </div>

      <p
        role="status"
        aria-live="polite"
        className={
          feedback
            ? `flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${
                feedback.tone === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
                  : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
              }`
            : "sr-only"
        }
      >
        {feedback?.tone === "success" && (
          <CheckCircle2 size={13} aria-hidden="true" />
        )}
        {feedback?.tone === "error" && <XCircle size={13} aria-hidden="true" />}
        {feedback?.message}
      </p>

      {storageAvailable === false ? (
        <div
          className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-foreground-muted"
          data-testid="settings-history-unavailable"
        >
          <p className="font-medium text-foreground">History unavailable</p>
          <p className="mt-0.5">
            This browser isn&apos;t allowing local storage (private mode, blocked
            site data or full storage). Your changes still apply, but they
            can&apos;t be listed or restored here.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div
          className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-foreground-muted"
          data-testid="settings-history-empty"
        >
          <History size={16} aria-hidden="true" />
          <p>No changes recorded yet. Preference changes will appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Settings change history">
          {entries.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} onRestore={handleRestore} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({
  entry,
  onRestore,
}: {
  entry: SettingsHistoryEntry;
  onRestore: (entry: SettingsHistoryEntry) => void;
}) {
  const def = getSettingDefinition(entry.settingId);
  const previous = formatHistoryValue(def, entry.previous, entry.redacted);
  const current = formatHistoryValue(def, entry.current, entry.redacted);
  const availability = getRestoreAvailability(def, entry);
  const changedAt = toDate(entry.changedAt);
  const reasonId = `history-reason-${entry.id}`;

  return (
    <li className="space-y-1.5 px-3 py-2.5 text-xs" aria-label={`${entry.label} change`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{entry.label}</span>
        {changedAt && (
          <time
            dateTime={entry.changedAt}
            title={formatAbsoluteTimestamp(changedAt)}
            className="text-foreground-muted"
          >
            {formatRelativeTimestamp(changedAt)}
          </time>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-foreground-muted">Previous</dt>
        <dd className="flex items-center gap-1 font-mono">
          {entry.redacted && <EyeOff size={11} aria-hidden="true" />}
          {previous}
        </dd>
        <dt className="text-foreground-muted">Changed to</dt>
        <dd className="flex items-center gap-1 font-mono">
          {entry.redacted && <EyeOff size={11} aria-hidden="true" />}
          {current}
        </dd>
      </dl>

      {entry.redacted && (
        <p className="text-foreground-muted">Sensitive value hidden.</p>
      )}
      {entry.restoredFromId && (
        <p className="text-foreground-muted">Restored from an earlier change.</p>
      )}

      <div className="flex items-center justify-end gap-2">
        {!availability.restorable && (
          <span id={reasonId} className="text-foreground-muted">
            {availability.message}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1"
          disabled={!availability.restorable}
          aria-describedby={!availability.restorable ? reasonId : undefined}
          aria-label={
            entry.redacted
              ? `Restore ${entry.label}`
              : `Restore ${entry.label} to ${previous}`
          }
          onClick={() => onRestore(entry)}
        >
          <RotateCcw size={12} aria-hidden="true" />
          Restore
        </Button>
      </div>
    </li>
  );
}
