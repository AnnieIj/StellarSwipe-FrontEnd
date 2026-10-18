"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Clock, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";
import { useRecentSearchesStore, type RecentSearch } from "@/store/useRecentSearchesStore";
import { MAX_VISIBLE_RECENT_SEARCHES } from "@/lib/recentSearches";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * #759 – Group command palette results by action type.
 *
 * Groups: "Navigation" | "Actions" | "Settings" | "Recent"
 * - Empty groups are omitted entirely.
 * - Keyboard arrow navigation moves continuously across groups.
 * - Group headings use aria-labelledby on nested <ul role="group"> so screen
 *   readers announce the group name before reading each item.
 */

type CommandGroup = "Navigation" | "Actions" | "Settings" | "Recent";

interface CommandItem {
  id: string;
  label: string;
  group: CommandGroup;
  href?: string;
  onSelect?: () => void;
  keywords?: string[];
}

type PaletteOption =
  | { kind: "recent"; id: string; recent: RecentSearch; item?: CommandItem }
  | { kind: "command"; id: string; item: CommandItem };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Icon prefix per group for visual scanning. */
const GROUP_ICON: Record<CommandGroup | "Recent", string> = {
  Navigation: "→",
  Actions: "⚡",
  Settings: "⚙",
  Recent: "🕐",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onConnectWallet?: () => void;
}

// ─── CommandPalette ───────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose, onConnectWallet }: CommandPaletteProps) {
  const router = useRouter();
  const { toggle: toggleTheme } = useThemeStore();
  const recentSearches = useRecentSearchesStore((s) => s.recentSearches);
  const addRecentSearch = useRecentSearchesStore((s) => s.addRecentSearch);
  const removeRecentSearch = useRecentSearchesStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useRecentSearchesStore((s) => s.clearRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  // ── Item catalogue ──────────────────────────────────────────────────────
  const items: CommandItem[] = [
    // Navigation group
    { id: "home",        label: "Home",                 group: "Navigation", href: "/" },
    { id: "signals",     label: "Signals",               group: "Navigation", href: "/app" },
    { id: "bookmarks",   label: "Bookmarks",             group: "Navigation", href: "/bookmarks" },
    { id: "providers",   label: "Providers",             group: "Navigation", href: "/providers" },
    { id: "compare",     label: "Compare",               group: "Navigation", href: "/compare" },
    { id: "analytics",   label: "Analytics",             group: "Navigation", href: "/analytics" },
    { id: "performance", label: "Performance",           group: "Navigation", href: "/performance" },
    { id: "leaderboard", label: "Leaderboard",           group: "Navigation", href: "/leaderboard" },
    { id: "journal",     label: "Journal",               group: "Navigation", href: "/journal" },
    // Actions group
    {
      id: "backtest",
      label: "Backtest Simulator",
      group: "Actions",
      href: "/backtest-sim",
      keywords: ["backtest", "sim"],
    },
    { id: "referral",    label: "Referral",              group: "Actions", href: "/referral" },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      group: "Actions",
      onSelect: toggleTheme,
      keywords: ["dark", "light", "theme", "mode"],
    },
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      group: "Actions",
      onSelect: onConnectWallet,
      keywords: ["wallet", "freighter", "stellar", "connect"],
    },
    // Settings group
    { id: "security",    label: "Security",              group: "Settings", href: "/security" },
    { id: "tax-report",  label: "Tax Report",            group: "Settings", href: "/tax-report", keywords: ["tax", "report"] },
    { id: "api-keys",    label: "API Keys",              group: "Settings", href: "/api-keys" },
    { id: "preferences", label: "Preferences",           group: "Settings", href: "/preferences" },
  ];

  // ── Filtering ───────────────────────────────────────────────────────────
  const filtered = items.filter(
    (item) =>
      fuzzyMatch(query, item.label) ||
      item.keywords?.some((k) => fuzzyMatch(query, k))
  );

  // Recent entries only shown before typing
  const recentOptions: PaletteOption[] = query.trim()
    ? []
    : recentSearches
        .map((recent) => ({
          kind: "recent" as const,
          id: `recent-${recent.commandId}`,
          recent,
          item: items.find((i) => i.id === recent.commandId),
        }))
        .filter((opt) => opt.item || opt.recent.href)
        .slice(0, MAX_VISIBLE_RECENT_SEARCHES);

  // ── Build grouped structure ─────────────────────────────────────────────
  // Groups in display order; empty groups are omitted.
  const GROUP_ORDER: CommandGroup[] = ["Navigation", "Actions", "Settings"];

  type OptionGroup = { group: CommandGroup | "Recent"; options: PaletteOption[] };

  const groupedSections: OptionGroup[] = [];

  if (recentOptions.length > 0) {
    groupedSections.push({ group: "Recent", options: recentOptions });
  }

  for (const group of GROUP_ORDER) {
    const opts = filtered
      .filter((item) => item.group === group)
      .map((item) => ({ kind: "command" as const, id: item.id, item }));
    if (opts.length > 0) {
      groupedSections.push({ group, options: opts });
    }
  }

  // Flat option list for keyboard navigation
  const options: PaletteOption[] = groupedSections.flatMap((s) => s.options);
  const activeOption = options[activeIndex];

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(options.length - 1, 0)));
  }, [options.length]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActiveIndex(0);
      setAnnouncement("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const runDestination = useCallback(
    (item: CommandItem | undefined, href: string | undefined) => {
      onClose();
      if (href) router.push(href);
      else item?.onSelect?.();
    },
    [onClose, router]
  );

  const handleSelect = useCallback(
    (option: PaletteOption) => {
      if (option.kind === "recent") {
        const { recent, item } = option;
        addRecentSearch({
          commandId: recent.commandId,
          label: item?.label ?? recent.label,
          href: recent.href ?? item?.href,
          query: recent.query,
        });
        runDestination(item, recent.href ?? item?.href);
        return;
      }
      const { item } = option;
      addRecentSearch({ commandId: item.id, label: item.label, href: item.href, query });
      runDestination(item, item.href);
    },
    [addRecentSearch, runDestination, query]
  );

  const handleRemoveRecent = useCallback(
    (recent: RecentSearch) => {
      removeRecentSearch(recent.commandId);
      setAnnouncement(`Removed ${recent.label} from recent searches`);
      inputRef.current?.focus();
    },
    [removeRecentSearch]
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setActiveIndex(0);
    setAnnouncement("Recent searches cleared");
    inputRef.current?.focus();
  }, [clearRecentSearches]);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab") {
        const container = dialogRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            "input, button, [href], [tabindex]:not([tabindex='-1'])"
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || !container.contains(active)) { e.preventDefault(); last.focus(); }
        } else {
          if (active === last || !container.contains(active)) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      if (document.activeElement !== inputRef.current) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeOption) handleSelect(activeOption);
      } else if (e.key === "Delete" && activeOption?.kind === "recent") {
        e.preventDefault();
        handleRemoveRecent(activeOption.recent);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, options.length, activeOption, handleSelect, handleRemoveRecent]);

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderOption = (option: PaletteOption, flatIndex: number) => {
    const isActive = flatIndex === activeIndex;
    const optionId = `cmd-${option.id}`;

    if (option.kind === "recent") {
      const { recent, item } = option;
      const label = item?.label ?? recent.label;
      return (
        <li
          key={option.id}
          id={optionId}
          role="option"
          aria-selected={isActive}
          aria-label={recent.query ? `${label}, searched "${recent.query}"` : label}
          onClick={() => handleSelect(option)}
          onMouseEnter={() => setActiveIndex(flatIndex)}
          className={cn(
            "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
          )}
        >
          <Clock size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {label}
            {recent.query && (
              <span className="ml-2 text-xs text-muted-foreground">"{recent.query}"</span>
            )}
          </span>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Remove ${label} from recent searches`}
            title="Remove from recent searches (Delete)"
            onClick={(e) => { e.stopPropagation(); handleRemoveRecent(recent); }}
            className={cn(
              "rounded p-1 text-muted-foreground transition-opacity hover:bg-background/60 hover:text-foreground",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </li>
      );
    }

    const { item } = option;
    return (
      <li
        key={option.id}
        id={optionId}
        role="option"
        aria-selected={isActive}
        onClick={() => handleSelect(option)}
        onMouseEnter={() => setActiveIndex(flatIndex)}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
        )}
      >
        <span className="w-4 shrink-0 text-center text-muted-foreground text-xs" aria-hidden="true">
          {GROUP_ICON[item.group]}
        </span>
        <span className="flex-1">{item.label}</span>
      </li>
    );
  };

  const hasRecent = recentOptions.length > 0;
  const noResults = !hasRecent && filtered.length === 0;
  const descriptionId = "command-palette-help";

  if (!open || typeof document === "undefined") return null;

  let flatCursor = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      aria-describedby={descriptionId}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
      >
        <p id={descriptionId} className="sr-only">
          Type to search commands. Use arrow keys to navigate between results and Enter to select.
          {hasRecent ? " Press Delete to remove the highlighted recent search." : ""}
          Results are grouped by type: Recent, Navigation, Actions, and Settings.
        </p>

        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none rounded focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search command palette"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={activeOption ? `cmd-${activeOption.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={14} />
          </button>
        </div>

        {/* Live announcement */}
        <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

        {/* Results — grouped */}
        <ul
          id="command-palette-list"
          role="listbox"
          aria-label="Commands"
          className="max-h-72 overflow-y-auto p-1"
        >
          {noResults ? (
            <li className="px-2 py-2">
              <EmptyState
                title="No results"
                description={`No results for "${query}"`}
                className="rounded-xl bg-transparent py-8"
              />
            </li>
          ) : (
            groupedSections.map((section) => {
              const headingId = `cmd-group-${section.group.toLowerCase().replace(/\s+/g, "-")}`;
              const sectionStart = flatCursor;
              flatCursor += section.options.length;

              return (
                <li key={section.group} role="presentation">
                  {/* Group heading */}
                  <div
                    id={headingId}
                    className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    <span>{section.group}</span>
                    {section.group === "Recent" && (
                      <button
                        type="button"
                        onClick={handleClearRecent}
                        className="rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring normal-case tracking-normal"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {/* Group items */}
                  <ul role="group" aria-labelledby={headingId}>
                    {section.options.map((option, i) =>
                      renderOption(option, sectionStart + i)
                    )}
                  </ul>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer shortcuts */}
        <div className="border-t border-border px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          {activeOption?.kind === "recent" && (
            <span><kbd className="font-mono">Del</kbd> remove</span>
          )}
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface CommandItem {
  id: string;
  label: string;
  group: "Routes" | "Actions";
  href?: string;
  onSelect?: () => void;
  keywords?: string[];
}

type PaletteOption =
  | { kind: "recent"; id: string; recent: RecentSearch; item?: CommandItem }
  | { kind: "command"; id: string; item: CommandItem };

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onConnectWallet?: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onConnectWallet,
}: CommandPaletteProps) {
  const router = useRouter();
  const { toggle: toggleTheme } = useThemeStore();
  const recentSearches = useRecentSearchesStore((s) => s.recentSearches);
  const addRecentSearch = useRecentSearchesStore((s) => s.addRecentSearch);
  const removeRecentSearch = useRecentSearchesStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useRecentSearchesStore((s) => s.clearRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const items: CommandItem[] = [
    { id: "home", label: "Home", group: "Routes", href: "/" },
    { id: "signals", label: "Signals", group: "Routes", href: "/signals" },
    {
      id: "bookmarks",
      label: "Bookmarks",
      group: "Routes",
      href: "/bookmarks",
    },
    {
      id: "providers",
      label: "Providers",
      group: "Routes",
      href: "/providers",
    },
    {
      id: "tax-report",
      label: "Tax Report",
      group: "Routes",
      href: "/tax-report",
      keywords: ["tax", "report"],
    },
    { id: "compare", label: "Compare", group: "Routes", href: "/compare" },
    {
      id: "backtest",
      label: "Backtest Simulator",
      group: "Routes",
      href: "/backtest-sim",
      keywords: ["backtest", "sim"],
    },
    { id: "referral", label: "Referral", group: "Routes", href: "/referral" },
    { id: "security", label: "Security", group: "Routes", href: "/security" },
    {
      id: "analytics",
      label: "Analytics",
      group: "Routes",
      href: "/analytics",
    },
    {
      id: "performance",
      label: "Performance",
      group: "Routes",
      href: "/performance",
    },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      group: "Actions",
      onSelect: toggleTheme,
      keywords: ["dark", "light", "theme", "mode"],
    },
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      group: "Actions",
      onSelect: onConnectWallet,
      keywords: ["wallet", "freighter", "stellar", "connect"],
    },
  ];

  const filtered = items.filter(
    (item) =>
      fuzzyMatch(query, item.label) ||
      item.keywords?.some((k) => fuzzyMatch(query, k))
  );

  // Recent searches are shown only before the user starts typing, and only
  // for entries that can still be resolved to a destination or action.
  const recentOptions: PaletteOption[] = query.trim()
    ? []
    : recentSearches
        .map((recent) => ({
          kind: "recent" as const,
          id: `recent-${recent.commandId}`,
          recent,
          item: items.find((i) => i.id === recent.commandId),
        }))
        .filter((option) => option.item || option.recent.href)
        .slice(0, MAX_VISIBLE_RECENT_SEARCHES);

  const options: PaletteOption[] = [
    ...recentOptions,
    ...filtered.map((item) => ({ kind: "command" as const, id: item.id, item })),
  ];
  const activeOption = options[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the active index valid when entries are removed.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(options.length - 1, 0)));
  }, [options.length]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActiveIndex(0);
      setAnnouncement("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const runDestination = useCallback(
    (item: CommandItem | undefined, href: string | undefined) => {
      onClose();
      if (href) {
        router.push(href);
      } else {
        item?.onSelect?.();
      }
    },
    [onClose, router]
  );

  const handleSelect = useCallback(
    (option: PaletteOption) => {
      if (option.kind === "recent") {
        const { recent, item } = option;
        // Restore the exact destination that was recorded, keeping the
        // original query associated with the entry.
        addRecentSearch({
          commandId: recent.commandId,
          label: item?.label ?? recent.label,
          href: recent.href ?? item?.href,
          query: recent.query,
        });
        runDestination(item, recent.href ?? item?.href);
        return;
      }

      const { item } = option;
      addRecentSearch({ commandId: item.id, label: item.label, href: item.href, query });
      runDestination(item, item.href);
    },
    [addRecentSearch, runDestination, query]
  );

  const handleRemoveRecent = useCallback(
    (recent: RecentSearch) => {
      removeRecentSearch(recent.commandId);
      setAnnouncement(`Removed ${recent.label} from recent searches`);
      inputRef.current?.focus();
    },
    [removeRecentSearch]
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setActiveIndex(0);
    setAnnouncement("Recent searches cleared");
    inputRef.current?.focus();
  }, [clearRecentSearches]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const container = dialogRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            "input, button, [href], [tabindex]:not([tabindex='-1'])"
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || !container.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !container.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
      // Arrow / Enter / Delete only drive the list while the search input
      // has focus, so buttons such as "Clear" keep their native behaviour.
      if (document.activeElement !== inputRef.current) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeOption) handleSelect(activeOption);
      } else if (e.key === "Delete" && activeOption?.kind === "recent") {
        e.preventDefault();
        handleRemoveRecent(activeOption.recent);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, options.length, activeOption, handleSelect, handleRemoveRecent]);

  const hasRecent = recentOptions.length > 0;
  const descriptionId = "command-palette-help";

  if (!open || typeof document === "undefined") return null;

  const renderOption = (option: PaletteOption, index: number) => {
    const isActive = index === activeIndex;
    const optionId = `cmd-${option.id}`;

    if (option.kind === "recent") {
      const { recent, item } = option;
      const label = item?.label ?? recent.label;
      return (
        <li
          key={option.id}
          id={optionId}
          role="option"
          aria-selected={isActive}
          aria-label={recent.query ? `${label}, searched “${recent.query}”` : label}
          onClick={() => handleSelect(option)}
          onMouseEnter={() => setActiveIndex(index)}
          className={cn(
            "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
          )}
        >
          <Clock size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {label}
            {recent.query && (
              <span className="ml-2 text-xs text-muted-foreground">“{recent.query}”</span>
            )}
          </span>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Remove ${label} from recent searches`}
            title="Remove from recent searches (Delete)"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveRecent(recent);
            }}
            className={cn(
              "rounded p-1 text-muted-foreground transition-opacity hover:bg-background/60 hover:text-foreground",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </li>
      );
    }

    const { item } = option;
    return (
      <li
        key={option.id}
        id={optionId}
        role="option"
        aria-selected={isActive}
        onClick={() => handleSelect(option)}
        onMouseEnter={() => setActiveIndex(index)}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
        )}
      >
        <span className="w-4 text-center text-muted-foreground text-xs" aria-hidden="true">
          {item.group === "Routes" ? "→" : "⚡"}
        </span>
        <span className="flex-1">{item.label}</span>
        <span className="text-[10px] text-muted-foreground">{item.group}</span>
      </li>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      aria-describedby={descriptionId}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
      >
        <p id={descriptionId} className="sr-only">
          Type to search routes and actions. Use the arrow keys to move through results and Enter to
          select. {hasRecent ? "Press Delete to remove the highlighted recent search." : ""}
        </p>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search
            size={15}
            className="shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search routes and actions…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none rounded focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search command palette"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={activeOption ? `cmd-${activeOption.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={14} />
          </button>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {hasRecent && (
          <div className="flex items-center justify-between px-4 pt-2">
            <span id="command-palette-recent-heading" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent
            </span>
            <button
              type="button"
              onClick={handleClearRecent}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear recent searches
            </button>
          </div>
        )}

        <ul
          id="command-palette-list"
          role="listbox"
          aria-label="Commands"
          className="max-h-72 overflow-y-auto p-1"
        >
          {hasRecent && (
            <li role="presentation">
              <ul role="group" aria-labelledby="command-palette-recent-heading">
                {recentOptions.map((option, i) => renderOption(option, i))}
              </ul>
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-2 py-2">
              <div
                role="status"
                aria-label={`No results for ${query}`}
                className="flex flex-col items-center gap-3 rounded-xl px-4 py-8 text-center"
              >
                <Search
                  size={28}
                  className="text-muted-foreground/40"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different keyword or one of the suggestions below.
                  </p>
                </div>
                {/* Suggestions — hardcoded to the most useful entry points */}
                <ul className="mt-1 flex flex-wrap justify-center gap-2" aria-label="Suggested searches">
                  {[
                    { label: "Signals", id: "signals" },
                    { label: "Bookmarks", id: "bookmarks" },
                    { label: "Toggle Theme", id: "toggle-theme" },
                    { label: "Compare", id: "compare" },
                  ].map((suggestion) => {
                    const match = items.find((i) => i.id === suggestion.id);
                    if (!match) return null;
                    return (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          onClick={() => {
                            addRecentSearch({
                              commandId: match.id,
                              label: match.label,
                              href: match.href,
                              query,
                            });
                            runDestination(match, match.href);
                          }}
                          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                        >
                          {suggestion.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  Clear search
                </button>
              </div>
            </li>
          ) : hasRecent ? (
            <li role="presentation">
              <div
                id="command-palette-all-heading"
                className="mt-1 border-t border-border px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                All commands
              </div>
              <ul role="group" aria-labelledby="command-palette-all-heading">
                {filtered.map((item, i) =>
                  renderOption({ kind: "command", id: item.id, item }, recentOptions.length + i)
                )}
              </ul>
            </li>
          ) : (
            filtered.map((item, i) => renderOption({ kind: "command", id: item.id, item }, i))
          )}
        </ul>

        <div className="border-t border-border px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> select
          </span>
          {activeOption?.kind === "recent" && (
            <span>
              <kbd className="font-mono">Del</kbd> remove
            </span>
          )}
          <span>
            <kbd className="font-mono">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
