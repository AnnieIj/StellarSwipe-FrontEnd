"use client";

/**
 * Active Sessions page — /security/active-sessions
 *
 * Lists all authenticated sessions for the current user, surfacing
 * device/browser info, approximate location, and last-active time.
 * Provides per-session revoke and a bulk "revoke all others" action.
 *
 * This page lives separately from the 2FA setup wizard (/security) so
 * each concern stays focused and independently navigable.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, ChevronLeft } from "lucide-react";
import { ActiveSessionsPanel } from "@/components/ActiveSessionsPanel";
import { AccountActivityList } from "@/components/AccountActivityList";
import {
  fetchAccountActivity,
  fetchSessions,
  revokeSession,
  revokeAllOtherSessions,
} from "@/lib/sessionApi";
import type { AccountActivity, Session } from "@/lib/sessionUtils";
import { RouteBreadcrumb } from "@/components/RouteBreadcrumb";

// ---------------------------------------------------------------------------
// Mock seed data — replaced by real API once the backend is available.
// ---------------------------------------------------------------------------
const MOCK_SESSIONS: Session[] = [
  {
    id: "sess_current_001",
    deviceLabel: "Chrome on macOS",
    location: "London, UK",
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
    device: "macOS",
    browser: "Chrome",
  },
  {
    id: "sess_002",
    deviceLabel: "Firefox on Windows 11",
    location: "New York, US",
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 h ago
    isCurrent: false,
  },
  {
    id: "sess_003",
    deviceLabel: "Safari on iPhone 15",
    location: "Tokyo, JP",
    lastActiveAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 d ago
    isCurrent: false,
  },
];

const MOCK_ACTIVITY: AccountActivity[] = [
  {
    id: "act_001",
    description: "Signed in",
    occurredAt: new Date().toISOString(),
    device: "Chrome on macOS",
    location: "London, UK",
  },
  {
    id: "act_002",
    description: "Session ended by sign-out",
    occurredAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activity, setActivity] = useState<
    AccountActivity[] | null | undefined
  >(undefined);

  // Load sessions on mount — falls back to mock data if the API endpoint is
  // unavailable (expected during local development without a backend).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await fetchSessions();
        if (!cancelled) setSessions(data);
      } catch {
        if (!cancelled) {
          // Fall back to mock data in development so the page is always usable
          if (process.env.NODE_ENV !== "production") {
            setSessions(MOCK_SESSIONS);
          } else {
            setLoadError(
              "Unable to load sessions. Please refresh or try again later."
            );
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    fetchAccountActivity()
      .then((data) => !cancelled && setActivity(data))
      .catch(() => {
        // Dev falls back to mock data; production labels history unavailable
        if (!cancelled) {
          setActivity(
            process.env.NODE_ENV !== "production" ? MOCK_ACTIVITY : null
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRevoke = useCallback(async (sessionId: string) => {
    await revokeSession(sessionId);
  }, []);

  const handleRevokeAll = useCallback(async () => {
    await revokeAllOtherSessions();
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* #758 — Route-aware breadcrumb (replaces manual back link) */}
        <RouteBreadcrumb />
        {/* Back navigation */}
        <Link
          href="/security"
          className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Back to Account Security settings"
        >
          <ChevronLeft size={15} aria-hidden="true" className="rtl-flip" />
          Account Security
        </Link>

        {/* Page header */}
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-blue-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">
            Active Sessions
          </h1>
        </div>

        <p className="text-sm text-foreground-muted -mt-2">
          Review every device and browser that is currently signed in. Revoke
          access for any session you don&apos;t recognise, or after losing a
          device. To end your current session, use the normal sign-out flow.
        </p>

        {/* Main panel — passes sessions + handlers down; owns no fetch state */}
        <ActiveSessionsPanel
          sessions={sessions}
          onRevoke={handleRevoke}
          onRevokeAll={handleRevokeAll}
          isLoading={isLoading}
          error={loadError}
        />

        <AccountActivityList activity={activity} />
      </div>
    </main>
  );
}
