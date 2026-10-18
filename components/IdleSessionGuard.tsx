"use client";

/**
 * IdleSessionGuard
 *
 * Monitors user inactivity and:
 *  1. Shows a visible countdown warning after IDLE_TIMEOUT_MS of inactivity.
 *  2. Auto-disconnects the wallet if no activity occurs within GRACE_PERIOD_MS.
 *  3. Cancels the pending disconnect and resets the timer on any user activity.
 *  4. Durations are read from env vars so they are configurable without code
 *     changes (see NEXT_PUBLIC_IDLE_TIMEOUT_MS / NEXT_PUBLIC_IDLE_GRACE_PERIOD_MS).
 *
 * This component renders nothing while the user is active or disconnected.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Configuration — override via environment variables
// ---------------------------------------------------------------------------
const IDLE_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS ?? 900_000 // 15 min default
);
const GRACE_PERIOD_MS = Number(
  process.env.NEXT_PUBLIC_IDLE_GRACE_PERIOD_MS ?? 60_000 // 1 min default
);

/** DOM events that count as "user activity" */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "focus",
  "click",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function IdleSessionGuard() {
  const { connected, disconnect } = useWallet();

  // "warning" = countdown modal is visible, "idle" = counting silently, "active" = reset
  const [phase, setPhase] = useState<"active" | "warning" | "disconnected">(
    "active"
  );
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(GRACE_PERIOD_MS / 1000)
  );

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cancel all running timers
  const clearTimers = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (graceTimerRef.current !== null) {
      clearInterval(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);

  // Start (or restart) the idle countdown
  const resetIdleTimer = useCallback(() => {
    if (!connected) return;
    clearTimers();
    setPhase("active");

    idleTimerRef.current = setTimeout(() => {
      // Idle threshold reached — show warning and start grace countdown
      const totalSeconds = Math.ceil(GRACE_PERIOD_MS / 1000);
      setSecondsLeft(totalSeconds);
      setPhase("warning");

      graceTimerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // Time's up — disconnect
            clearTimers();
            disconnect();
            setPhase("disconnected");
            return 0;
          }
          return prev - 1;
        });
      }, 1_000);
    }, IDLE_TIMEOUT_MS);
  }, [connected, clearTimers, disconnect]);

  // Attach/detach activity listeners whenever the wallet connection state changes
  useEffect(() => {
    if (!connected) {
      clearTimers();
      setPhase("active");
      return;
    }

    resetIdleTimer();

    function onActivity() {
      // Only reset during the idle wait phase; ignore activity while warning
      // is displayed (user must explicitly click "Stay connected").
      setPhase((current) => {
        if (current === "active") {
          resetIdleTimer();
        }
        return current;
      });
    }

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, onActivity)
      );
      clearTimers();
    };
    // resetIdleTimer is stable (useCallback with deps); safe in the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // User clicks "Stay connected" — cancel pending disconnect and restart timer
  function handleStayConnected() {
    resetIdleTimer();
  }

  // User dismisses the warning without acting — treat same as "stay"
  function handleDismiss() {
    resetIdleTimer();
  }

  // Nothing to show when active or already disconnected
  if (phase === "active" || phase === "disconnected" || !connected) {
    return null;
  }

  const progressPercent =
    ((GRACE_PERIOD_MS / 1000 - secondsLeft) / (GRACE_PERIOD_MS / 1000)) * 100;

  return (
    <AnimatePresence>
      {phase === "warning" && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="alertdialog"
          aria-labelledby="idle-warning-title"
          aria-describedby="idle-warning-desc"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-amber-500/30 bg-surface p-6 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss idle warning"
              className="absolute end-3 top-3 rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <X size={16} aria-hidden="true" />
            </button>

            {/* Icon + heading */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
                <Clock className="h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>
              <h2
                id="idle-warning-title"
                className="text-base font-semibold text-foreground"
              >
                Session expiring soon
              </h2>
            </div>

            {/* Description */}
            <p
              id="idle-warning-desc"
              className="text-sm text-foreground-muted mb-4"
            >
              You&apos;ve been inactive. Your wallet will be disconnected in{" "}
              <strong
                className="tabular-nums text-amber-300"
                aria-live="polite"
                aria-atomic="true"
              >
                {secondsLeft}s
              </strong>{" "}
              to protect your account on shared or unattended devices.
            </p>

            {/* Progress bar */}
            <div
              className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
              aria-hidden="true"
            >
              <motion.div
                className="h-full rounded-full bg-amber-400"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.9, ease: "linear" }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleStayConnected}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold focus-visible:ring-amber-400"
              >
                Stay connected
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearTimers();
                  disconnect();
                  setPhase("disconnected");
                }}
                className="flex-1"
              >
                Disconnect now
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
