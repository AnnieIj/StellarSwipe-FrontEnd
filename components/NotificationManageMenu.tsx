"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotificationPreference,
  type NotificationCategory,
  type CategoryPreferences,
} from "@/hooks/useNotificationPreference";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { requestNotificationPermission } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  priceAlerts: "Price alerts",
  newSignals: "New signals",
  systemUpdates: "System updates",
};

const CATEGORY_DESCRIPTIONS: Record<NotificationCategory, string> = {
  priceAlerts: "Notify me when a watched asset crosses a price threshold.",
  newSignals: "Notify me when a followed provider posts a new signal.",
  systemUpdates: "Notify me about account, security, and maintenance updates.",
};

/** Sample message shown in preview for each category. Not sent anywhere. */
const CATEGORY_SAMPLE_MESSAGE: Record<NotificationCategory, string> = {
  priceAlerts: "XLM/USDC crossed $0.15 — your threshold was $0.14.",
  newSignals: "New BUY signal from Provider Alpha — high confidence.",
  systemUpdates: "Maintenance window starting in 30 minutes.",
};

const CATEGORY_CHANNELS: Record<NotificationCategory, string[]> = {
  priceAlerts: ["Push", "In-app"],
  newSignals: ["Push", "In-app"],
  systemUpdates: ["Push", "In-app", "Email"],
};

function statusMeta(status: NotificationPermission) {
  switch (status) {
    case "granted":
      return {
        label: "Enabled",
        tone: "text-emerald-500",
        icon: BellRing,
        description: "This device can receive push notifications.",
      };
    case "denied":
      return {
        label: "Blocked",
        tone: "text-destructive",
        icon: ShieldAlert,
        description:
          "Notifications are blocked at the browser level. Update your browser's site settings to re-enable.",
      };
    default:
      return {
        label: "Not enabled",
        tone: "text-foreground-muted",
        icon: BellOff,
        description: "You haven't turned on notifications for this device yet.",
      };
  }
}

// ── Preference Preview ──────────────────────────────────────────────────────

interface PreviewPanelProps {
  alertsEnabled: boolean;
  draft: CategoryPreferences;
  onClose: () => void;
}

function PreviewPanel({ alertsEnabled, draft, onClose }: PreviewPanelProps) {
  const activeCategories = (
    Object.keys(CATEGORY_LABELS) as NotificationCategory[]
  ).filter((cat) => alertsEnabled && draft[cat]);

  return (
    <div
      role="region"
      aria-label="Notification preference preview"
      className="mt-3 rounded-lg border border-border bg-foreground/3 p-3 text-xs"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Eye size={12} aria-hidden="true" />
          Preview (unsaved changes)
        </span>
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </div>

      {activeCategories.length === 0 ? (
        <p className="text-muted-foreground py-1">
          All notifications are paused with your current settings.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Preview of active notification categories">
          {activeCategories.map((cat) => (
            <li key={cat} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="flex gap-1">
                  {CATEGORY_CHANNELS[cat].map((ch) => (
                    <span
                      key={ch}
                      className="rounded-full bg-accent/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted"
                    >
                      {ch}
                    </span>
                  ))}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground italic">
                &ldquo;{CATEGORY_SAMPLE_MESSAGE[cat]}&rdquo;
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        This preview reflects current <em>unsaved</em> settings and does not
        send a real notification or expose private data.
      </p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

/**
 * Discoverable, single place to see notification status, manage per-category
 * preferences, and understand how to revoke access. Meant to live in the
 * preferences hub so users always know where to find it.
 */
export function NotificationManageMenu() {
  const {
    alertsEnabled,
    toggleAlerts,
    categoryPreferences,
    toggleCategory,
    permissionStatus,
    setPermissionStatus,
    deniedMessage,
    showDeniedMessage,
  } = useNotificationPreference();
  const [requesting, setRequesting] = useState(false);

  // Draft state for preview — tracks unsaved changes
  const [draftAlertsEnabled, setDraftAlertsEnabled] = useState(alertsEnabled);
  const [draftCategories, setDraftCategories] =
    useState<CategoryPreferences>(categoryPreferences);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Warn before leaving the page with pending preference edits
  const { markSaved } = useUnsavedChanges({
    isDirty: hasUnsaved,
    message: "You have unsaved notification preferences. Leave anyway?",
  });

  const meta = statusMeta(permissionStatus);
  const StatusIcon = meta.icon;

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermissionStatus(result);
      if (result === "granted") {
        toggleAlerts(true);
        setDraftAlertsEnabled(true);
      } else if (result === "denied") {
        showDeniedMessage();
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDraftAlertsToggle = (enabled: boolean) => {
    setDraftAlertsEnabled(enabled);
    setHasUnsaved(true);
    setSaveStatus("idle");
  };

  const handleDraftCategoryToggle = (
    category: NotificationCategory,
    enabled: boolean
  ) => {
    setDraftCategories((prev) => ({ ...prev, [category]: enabled }));
    setHasUnsaved(true);
    setSaveStatus("idle");
  };

  const handleSave = () => {
    setSaveStatus("saving");
    try {
      // Persist via the hook's setters (synchronous localStorage write)
      toggleAlerts(draftAlertsEnabled);
      (Object.keys(draftCategories) as NotificationCategory[]).forEach((cat) => {
        toggleCategory(cat, draftCategories[cat]);
      });
      markSaved();
      setHasUnsaved(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleCancel = () => {
    setDraftAlertsEnabled(alertsEnabled);
    setDraftCategories(categoryPreferences);
    setHasUnsaved(false);
    setSaveStatus("idle");
  };

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      {/* Status row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5 ${meta.tone}`}
          >
            <StatusIcon size={16} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Push notifications
            </p>
            <p className={`text-xs font-medium ${meta.tone}`}>{meta.label}</p>
          </div>
        </div>

        {permissionStatus === "default" && (
          <Button
            size="sm"
            onClick={handleRequestPermission}
            disabled={requesting}
          >
            {requesting ? "Requesting…" : "Enable"}
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs leading-5 text-foreground-muted">
        {meta.description}
      </p>

      {deniedMessage && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <ShieldAlert size={13} aria-hidden="true" />
          Permission was denied. You can change this in your browser&apos;s
          site settings.
        </div>
      )}

      {permissionStatus === "denied" && (
        <a
          href="https://support.google.com/chrome/answer/3220216"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-sky hover:underline"
        >
          How to re-enable notifications
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}

      {permissionStatus === "granted" && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          {/* Master switch */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-foreground">All alerts</p>
              <p className="text-[11px] text-foreground-muted">
                Master switch — turning this off pauses every category below.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draftAlertsEnabled}
              aria-label="Toggle all notification alerts"
              onClick={() => handleDraftAlertsToggle(!draftAlertsEnabled)}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                draftAlertsEnabled ? "bg-accent-sky" : "bg-foreground/15"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  draftAlertsEnabled ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Per-category toggles */}
          {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map(
            (category) => (
              <div
                key={category}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {CATEGORY_LABELS[category]}
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    {CATEGORY_DESCRIPTIONS[category]}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={
                    draftCategories[category] && draftAlertsEnabled
                  }
                  aria-label={`Toggle ${CATEGORY_LABELS[category]}`}
                  disabled={!draftAlertsEnabled}
                  onClick={() =>
                    handleDraftCategoryToggle(
                      category,
                      !draftCategories[category]
                    )
                  }
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40",
                    draftCategories[category] && draftAlertsEnabled
                      ? "bg-accent-sky"
                      : "bg-foreground/15"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      draftCategories[category] && draftAlertsEnabled
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            )
          )}

          {/* Save / Cancel — only shown when changes are pending */}
          {hasUnsaved && (
            <div
              role="region"
              aria-label="Unsaved changes"
              className="flex items-center justify-between gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2"
            >
              <p className="text-[11px] text-blue-400">
                You have unsaved changes.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  aria-label="Discard preference changes"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <RotateCcw size={10} aria-hidden="true" />
                  Cancel
                </button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  aria-label="Save notification preferences"
                  className="h-6 px-2 text-[11px]"
                >
                  {saveStatus === "saving" ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}

          {/* Save status feedback */}
          {saveStatus === "saved" && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-1.5 text-[11px] text-emerald-500"
            >
              <Check size={11} aria-hidden="true" />
              Preferences saved.
            </div>
          )}
          {saveStatus === "error" && (
            <div
              role="alert"
              className="text-[11px] text-destructive"
            >
              Failed to save preferences. Please try again.
            </div>
          )}

          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            aria-expanded={showPreview}
            aria-controls="notification-preference-preview"
            className="flex items-center gap-1.5 text-[11px] font-medium text-accent-sky hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {showPreview ? (
              <EyeOff size={11} aria-hidden="true" />
            ) : (
              <Eye size={11} aria-hidden="true" />
            )}
            {showPreview ? "Hide preview" : "Preview notification behavior"}
          </button>

          {/* Preview panel */}
          {showPreview && (
            <div id="notification-preference-preview">
              <PreviewPanel
                alertsEnabled={draftAlertsEnabled}
                draft={draftCategories}
                onClose={() => setShowPreview(false)}
              />
            </div>
          )}

          <p className="flex items-center gap-1.5 pt-1 text-[11px] text-foreground-muted">
            <Bell size={11} aria-hidden="true" />
            Revoking browser-level permission fully stops delivery even if
            these are on.
          </p>
        </div>
      )}
    </div>
  );
}
