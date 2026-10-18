"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ListChecks, X } from "lucide-react";
import {
  useOnboardingHydrated,
  useOnboardingStore,
} from "@/store/useOnboardingStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useBookmarkStore } from "@/store/useBookmarkStore";

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

/**
 * OnboardingChecklist — compact, dismissible setup progress for new users.
 * Completion is derived from real store state; dismissal is persisted and
 * the checklist can be reopened from the collapsed button.
 */
export function OnboardingChecklist() {
  const hydrated = useOnboardingHydrated();
  const introCompleted = useOnboardingStore((s) => s.completed);
  const dismissed = useOnboardingStore((s) => s.checklistDismissed);
  const setDismissed = useOnboardingStore((s) => s.setChecklistDismissed);
  const walletConnected = useWalletStore((s) => s.isConnected);
  const hasBookmark = useBookmarkStore((s) => s.bookmarks.length > 0);

  const items: ChecklistItem[] = [
    { id: "intro", label: "Finish the intro walkthrough", href: "/app", done: introCompleted },
    { id: "wallet", label: "Connect a Stellar wallet", href: "/app", done: walletConnected },
    { id: "bookmark", label: "Bookmark a signal to follow", href: "/bookmarks", done: hasBookmark },
  ];
  const completed = items.filter((item) => item.done).length;
  const total = items.length;

  if (!hydrated || completed === total) return null;

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="print:hidden inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ListChecks className="h-4 w-4" aria-hidden="true" />
        Show setup checklist ({completed}/{total})
      </button>
    );
  }

  return (
    <section
      id="onboarding-checklist"
      aria-labelledby="onboarding-checklist-title"
      className="print:hidden rounded-2xl border border-border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="onboarding-checklist-title" className="text-sm font-semibold">
            Get set up
          </h2>
          <p className="text-xs text-foreground-muted">
            {completed} of {total} steps complete
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss setup checklist"
          className="rounded-md p-1 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <progress
        value={completed}
        max={total}
        aria-label="Setup progress"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full accent-blue-500"
      />

      <ul className="mt-3 space-y-1">
        {items.map((item) => {
          const Icon = item.done ? CheckCircle2 : Circle;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${item.done ? "text-green-500" : "text-foreground-muted"}`}
                  aria-hidden="true"
                />
                <span className={item.done ? "line-through opacity-70" : undefined}>
                  {item.label}
                </span>
                <span className="sr-only">{item.done ? "(completed)" : "(not started)"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
