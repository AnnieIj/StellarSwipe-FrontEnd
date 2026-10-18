"use client";

/**
 * ActiveSessionsPanel
 *
 * Lists all active sessions for the authenticated user and allows them to:
 *  - View device/browser label, approximate location, and last-active time
 *  - Identify their current session (ending it requires an explicit warning)
 *  - Revoke individual sessions optimistically (with rollback on failure)
 *  - Revoke all other sessions at once
 *
 * Props:
 *  - sessions        : initial session list (e.g. from SSR or a parent hook)
 *  - onRevoke        : async function(sessionId) → void  (API call)
 *  - onRevokeAll     : async function() → void           (bulk API call)
 *  - isLoading?      : show skeleton state
 *  - error?          : string — show an error notice instead of the list
 */

import { useState, useCallback, useEffect } from "react";
import {
  Laptop,
  MapPin,
  Clock,
  ShieldAlert,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type Session,
  formatLastActive,
  canRevoke,
  formatTimestamp,
  otherSessionCount,
  optimisticRevoke,
  optimisticRevokeAll,
} from "@/lib/sessionUtils";
import { useI18n } from "@/hooks/useI18n";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActiveSessionsPanelProps {
  sessions: Session[];
  onRevoke: (sessionId: string) => Promise<void>;
  onRevokeAll: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

type RevokeResult = { tone: "success" | "error"; message: string };

/** A 404/410 from the API means the session already ended elsewhere. */
function isAlreadyEnded(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 404 || status === 410;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Skeleton rows shown while loading
// ---------------------------------------------------------------------------

function SessionSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse flex flex-col gap-1.5 py-3 border-b border-border last:border-0"
    >
      <div className="h-3 w-40 rounded bg-foreground/10" />
      <div className="h-2.5 w-28 rounded bg-foreground/10" />
      <div className="h-2.5 w-32 rounded bg-foreground/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single session row
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: Session;
  revoking: boolean;
  onRevoke: (id: string) => void;
  onEndCurrent: () => void;
}

function SessionRow({
  session,
  revoking,
  onRevoke,
  onEndCurrent,
}: SessionRowProps) {
  const revokable = canRevoke(session);
  const deviceLabel = session.deviceLabel || "Unknown device";
  const lastActiveExact = formatTimestamp(session.lastActiveAt);

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 border-b border-border last:border-0"
      data-testid={`session-row-${session.id}`}
    >
      {/* Session info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Laptop
            size={14}
            className="shrink-0 text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground truncate">
            {deviceLabel}
          </span>
          {session.isCurrent && (
            <span
              className="inline-flex shrink-0 items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400"
              aria-label="This is your current session"
            >
              Current
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin
            size={12}
            className="shrink-0 text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-xs text-foreground-muted truncate">
            {session.location || "Location unavailable"}
          </span>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs text-foreground-muted">
          <dt>Device:</dt>
          <dd>{session.device || "Not reported"}</dd>
          <dt>Browser:</dt>
          <dd>{session.browser || "Not reported"}</dd>
          <dt>Status:</dt>
          <dd>{session.isCurrent ? "Current session" : "Other device"}</dd>
        </dl>

        <div className="flex items-center gap-1.5">
          <Clock
            size={12}
            className="shrink-0 text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-xs text-foreground-muted">
            Last active:{" "}
            {lastActiveExact ? (
              <time dateTime={session.lastActiveAt} title={lastActiveExact}>
                {formatLastActive(session.lastActiveAt)} ({lastActiveExact})
              </time>
            ) : (
              "Unavailable"
            )}
          </span>
        </div>
      </div>

      {/* Revoke action */}
      {revokable ? (
        <Button
          variant="outline"
          size="sm"
          disabled={revoking}
          onClick={() => onRevoke(session.id)}
          aria-label={`Revoke session on ${deviceLabel}`}
          className="shrink-0 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/60 disabled:opacity-50"
        >
          {revoking ? (
            <>
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              <span className="sr-only">Revoking…</span>
            </>
          ) : (
            <>
              <LogOut size={13} aria-hidden="true" />
              Revoke
            </>
          )}
        </Button>
      ) : (
        /* Current session — ending it requires an explicit warning first */
        <Button
          variant="ghost"
          size="sm"
          disabled={revoking}
          onClick={onEndCurrent}
          aria-label="End this session and sign out of this device"
          className="shrink-0 text-[11px] text-foreground-muted"
        >
          {revoking ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            "Sign out this device"
          )}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function ActiveSessionsPanel({
  sessions: initialSessions,
  onRevoke,
  onRevokeAll,
  isLoading = false,
  error = null,
}: ActiveSessionsPanelProps) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [result, setResult] = useState<RevokeResult | null>(null);
  const [confirmRevokeAllOpen, setConfirmRevokeAllOpen] = useState(false);
  const [confirmCurrentOpen, setConfirmCurrentOpen] = useState(false);

  // Sync refreshed data in place so the list (and its scroll position) is kept
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Single-session revoke with optimistic update + rollback
  const handleRevoke = useCallback(
    async (id: string) => {
      const snapshot = sessions;
      const label = sessions.find((s) => s.id === id)?.deviceLabel ?? "device";
      setSessions(optimisticRevoke(sessions, id));
      setRevokingId(id);
      setResult(null);
      try {
        await onRevoke(id);
        setResult({ tone: "success", message: `Signed out ${label}. 1 session revoked.` });
      } catch (err) {
        if (isAlreadyEnded(err)) {
          setResult({
            tone: "success",
            message: `The session on ${label} had already ended. It was removed from the list.`,
          });
        } else {
          // Rollback on failure
          setSessions(snapshot);
          setResult({
            tone: "error",
            message: `Failed to revoke the session on ${label}. It is still active. Please try again.`,
          });
        }
      } finally {
        setRevokingId(null);
      }
    },
    [sessions, onRevoke]
  );

  const currentSession = sessions.find((s) => s.isCurrent);

  // Bulk revoke with optimistic update + rollback
  const handleRevokeAll = useCallback(async () => {
    const snapshot = sessions;
    const count = otherSessionCount(sessions);
    setSessions(optimisticRevokeAll(sessions));
    setRevokingAll(true);
    setResult(null);
    try {
      await onRevokeAll();
      setResult({
        tone: "success",
        message: `${plural(count, "session")} revoked. Only your current session remains active.`,
      });
      setConfirmRevokeAllOpen(false);
    } catch {
      // Rollback on failure
      setSessions(snapshot);
      setResult({
        tone: "error",
        message: `Failed to revoke ${plural(count, "session")}. They are still active. Please try again.`,
      });
      setConfirmRevokeAllOpen(false);
    } finally {
      setRevokingAll(false);
    }
  }, [sessions, onRevokeAll]);

  const otherCount = otherSessionCount(sessions);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Active Sessions
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Devices and browsers currently signed in to your account.
            </p>
          </div>

          {!isLoading && !error && otherCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={revokingAll}
              onClick={() => setConfirmRevokeAllOpen(true)}
              aria-label={t("sessions.revoke_all", { count: otherCount })}
              className="shrink-0 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/60 disabled:opacity-50"
            >
              {revokingAll ? (
                <>
                  <Loader2
                    size={13}
                    className="animate-spin mr-1"
                    aria-hidden="true"
                  />
                  Revoking…
                </>
              ) : (
                <>
                  <ShieldAlert size={13} className="mr-1" aria-hidden="true" />
                  Revoke all other sessions
                </>
              )}
            </Button>
          )}
        </div>

        {/* Result notice (inline) — announced and visually distinct */}
        {result && (
          <p
            role={result.tone === "error" ? "alert" : "status"}
            data-testid={`sessions-result-${result.tone}`}
            className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              result.tone === "error"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/20"
            }`}
          >
            {result.tone === "error" ? (
              <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={13} className="mt-px shrink-0" aria-hidden="true" />
            )}
            {result.message}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {/* Loading skeleton */}
        {isLoading && (
          <div aria-busy="true" aria-label="Loading sessions">
            {[1, 2, 3].map((n) => (
              <SessionSkeleton key={n} />
            ))}
          </div>
        )}

        {/* API-level error */}
        {!isLoading && error && (
          <p
            role="alert"
            className="text-sm text-red-400 py-3"
            data-testid="sessions-error"
          >
            {error}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !error && sessions.length === 0 && (
          <p
            className="text-sm text-foreground-muted py-3"
            data-testid="sessions-empty"
          >
            No active sessions found.
          </p>
        )}

        {/* Session list */}
        {!isLoading && !error && sessions.length > 0 && (
          <ul
            aria-label="Active sessions list"
            role="list"
            data-testid="sessions-list"
          >
            {sessions.map((session) => (
              <li key={session.id} role="listitem">
                <SessionRow
                  session={session}
                  revoking={revokingId === session.id}
                  onRevoke={handleRevoke}
                  onEndCurrent={() => setConfirmCurrentOpen(true)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={confirmRevokeAllOpen}
        onOpenChange={(next) => {
          if (revokingAll) return;
          setConfirmRevokeAllOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke all other sessions?</DialogTitle>
            <DialogDescription>
              This will sign out {otherCount}{" "}
              {otherCount === 1 ? "device" : "devices"} other than your
              current session. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRevokeAllOpen(false)}
              disabled={revokingAll}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevokeAll}
              disabled={revokingAll}
              className="gap-2 bg-red-500/90 text-white hover:bg-red-500"
            >
              {revokingAll ? (
                <>
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  Revoking…
                </>
              ) : (
                <>
                  <ShieldAlert size={13} aria-hidden="true" />
                  Revoke {otherCount} {otherCount === 1 ? "session" : "sessions"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmCurrentOpen} onOpenChange={setConfirmCurrentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End your current session?</DialogTitle>
            <DialogDescription>
              Warning: this is the device you are using right now. You will be
              signed out immediately and need to sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCurrentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmCurrentOpen(false);
                if (currentSession) void handleRevoke(currentSession.id);
              }}
              className="gap-2 bg-red-500/90 text-white hover:bg-red-500"
            >
              <LogOut size={13} aria-hidden="true" />
              Sign out this device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
