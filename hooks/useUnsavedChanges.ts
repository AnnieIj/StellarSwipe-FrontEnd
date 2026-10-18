"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export interface UseUnsavedChangesOptions {
  /**
   * True when the form has meaningful unsaved edits.
   * Pass `false` (or omit) for a clean / just-saved form so navigation
   * happens without any warning.
   */
  isDirty: boolean;
  /**
   * Message shown in the browser's beforeunload dialog.
   * Not all browsers display this text, but it is used for the in-app
   * dialog via `confirmNavigation`.
   *
   * Default: "You have unsaved changes. Leave anyway?"
   */
  message?: string;
  /**
   * Called when the user attempts to navigate away while `isDirty` is true.
   * Receives the intended `href` so callers can show a custom dialog.
   * If not provided, the hook relies on the browser's native beforeunload dialog.
   */
  onNavigateAway?: (href: string) => void;
}

export interface UseUnsavedChangesReturn {
  /**
   * Call this after a successful save to mark the form as clean.
   * Prevents the warning from firing on the post-save navigation.
   */
  markSaved: () => void;
  /**
   * Programmatically navigate to `href`, bypassing the unsaved-changes guard.
   * Use this for "Discard & leave" actions.
   */
  forceNavigate: (href: string) => void;
  /**
   * Navigates to `href` only after confirming — or proceeds immediately if
   * the form is clean. Uses the browser's native `window.confirm` dialog
   * unless `onNavigateAway` is provided.
   * Returns `true` if navigation was allowed, `false` if cancelled.
   */
  confirmNavigation: (href: string) => boolean;
}

/**
 * Protects unsaved journal and settings form data from being accidentally
 * discarded during navigation.
 *
 * Behaviour:
 * - When `isDirty` is true and the user tries to close/refresh the tab,
 *   the browser's native `beforeunload` dialog fires.
 * - In-app link clicks are intercepted while dirty: `onNavigateAway` is
 *   called if provided, otherwise a native confirm lets the user stay or
 *   leave. Programmatic navigation should go through `confirmNavigation`.
 * - When `isDirty` is false no warnings are shown — clean forms and
 *   post-save navigations are never interrupted.
 *
 * @example
 * const { markSaved, confirmNavigation } = useUnsavedChanges({
 *   isDirty: formIsDirty,
 *   message: "Your journal entry has unsaved changes. Leave anyway?",
 * });
 *
 * // In the "Cancel" / "Back" button handler:
 * const handleCancel = () => {
 *   if (confirmNavigation("/journal")) {
 *     router.push("/journal");
 *   }
 * };
 *
 * // After a successful save:
 * const handleSave = async () => {
 *   await submitEntry(formData);
 *   markSaved();
 *   router.push("/journal");
 * };
 */
export function useUnsavedChanges({
  isDirty,
  message = "You have unsaved changes. Leave anyway?",
  onNavigateAway,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const router = useRouter();

  // Ref tracks the *current* isDirty value synchronously so the
  // beforeunload handler (registered once) always reads the latest value.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // When true, the next navigation is allowed even if isDirty is set.
  // Used by markSaved() and forceNavigate() to bypass the guard.
  const bypassRef = useRef(false);

  const messageRef = useRef(message);
  messageRef.current = message;
  const onNavigateAwayRef = useRef(onNavigateAway);
  onNavigateAwayRef.current = onNavigateAway;

  // ── Browser/tab exit guard ──────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current || bypassRef.current) return;
      e.preventDefault();
      // Modern browsers show a generic message; this is used as a fallback
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);

  // ── In-app link guard ───────────────────────────────────────────────
  // Intercepts same-origin <a> clicks (including Next.js <Link>) while dirty
  // so client-side navigation is guarded just like a refresh or tab close.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isDirtyRef.current || bypassRef.current) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return; // hash-only / same-page link
      }

      e.preventDefault();
      e.stopPropagation();
      const href = url.pathname + url.search + url.hash;

      if (onNavigateAwayRef.current) {
        onNavigateAwayRef.current(href);
        return;
      }
      if (window.confirm(messageRef.current)) {
        bypassRef.current = true;
        router.push(href);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router]);

  // ── markSaved ──────────────────────────────────────────────────────
  const markSaved = useCallback(() => {
    bypassRef.current = true;
    // Auto-reset so subsequent edits are guarded again
    setTimeout(() => {
      bypassRef.current = false;
    }, 0);
  }, []);

  // ── forceNavigate ──────────────────────────────────────────────────
  const forceNavigate = useCallback(
    (href: string) => {
      bypassRef.current = true;
      router.push(href);
    },
    [router]
  );

  // ── confirmNavigation ─────────────────────────────────────────────
  const confirmNavigation = useCallback(
    (href: string): boolean => {
      if (!isDirtyRef.current || bypassRef.current) {
        router.push(href);
        return true;
      }

      if (onNavigateAway) {
        onNavigateAway(href);
        return false; // caller handles the decision
      }

      // Native browser confirm dialog as fallback
      const confirmed = window.confirm(message);
      if (confirmed) {
        forceNavigate(href);
      }
      return confirmed;
    },
    [message, onNavigateAway, forceNavigate, router]
  );

  return { markSaved, forceNavigate, confirmNavigation };
}
