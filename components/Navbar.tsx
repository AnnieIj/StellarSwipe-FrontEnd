"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Zap } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { WalletDropdown } from "@/components/WalletDropdown";
import { WalletSelectionModal } from "@/components/WalletSelectionModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsHelpModal } from "@/components/KeyboardShortcutsHelpModal";
import { useKeyboardShortcuts, type ShortcutConfig } from "@/hooks/useKeyboardShortcuts";
import { useFocusReturn } from "@/hooks/useFocusReturn";
import { useThemeStore } from "@/store/useThemeStore";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Signals", tourId: "signals" },
  { href: "/journal", label: "Journal" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/compare", label: "Compare", tourId: "compare" },
  { href: "/providers", label: "Providers" },
  { href: "/tax-report", label: "Tax Report" },
  { href: "/preferences", label: "Preferences" },
];

const routeShortcuts: Record<string, string> = {
  n: "/app",
  b: "/bookmarks",
  h: "/",
  j: "/journal",
  p: "/providers",
  t: "/tax-report",
  c: "/compare",
  s: "/backtest-sim",
};

// ---------------------------------------------------------------------------
// Overflow menu — items that don't fit in the nav bar (#557)
// ---------------------------------------------------------------------------
interface OverflowMenuProps {
  links: typeof NAV_LINKS;
  currentPath: string;
}

function OverflowMenu({ links, currentPath }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const hasActive = links.some((l) => l.href === currentPath);

  return (
    <li className="relative" data-testid="nav-overflow-item">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More navigation items"
        data-testid="nav-overflow-trigger"
        className={cn(
          "flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          hasActive
            ? "bg-surface-high/60 font-medium text-foreground"
            : "text-foreground-muted hover:text-foreground hover:bg-surface-high/40"
        )}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
        <span className="sr-only">More</span>
        {hasActive && (
          <span
            className="ml-0.5 h-1.5 w-1.5 rounded-full bg-blue-400"
            aria-hidden="true"
            title="Current route is in this menu"
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Additional navigation items"
          data-testid="nav-overflow-menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-background/95 py-1 shadow-lg backdrop-blur-md"
        >
          {links.map(({ href, label, tourId }) => {
            const isActive = href === currentPath;
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                data-tour={tourId}
                data-testid={`overflow-link-${href.replace(/\//g, "-")}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center justify-between px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:bg-surface-high/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary",
                  isActive
                    ? "bg-surface-high/60 font-medium text-foreground"
                    : "text-foreground-muted hover:text-foreground hover:bg-surface-high/40"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {label}
                {isActive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-blue-400"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Responsive nav list — splits links into visible + overflow based on width
// ---------------------------------------------------------------------------

/**
 * Number of nav links to show inline before collapsing the rest into the
 * overflow menu.  We use a ResizeObserver on the <nav> element to recalculate
 * this dynamically, but keep a static fallback so SSR renders correctly.
 *
 * Breakpoint logic (approximate link widths ~90px each):
 *  < 600 px  → show 0 links  (mobile — full list hidden, covered by a future mobile drawer)
 *  < 600 px  → show 3 links + overflow menu
 *  600–800   → show 3 links
 *  800–1024  → show 5 links
 *  ≥ 1024    → show all links
 */
function useVisibleLinkCount(navRef: React.RefObject<HTMLElement | null>): number {
  const [count, setCount] = useState(NAV_LINKS.length);

  useEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    function update(width: number) {
      if (width < 600) setCount(3);
      else if (width < 800) setCount(3);
      else if (width < 1024) setCount(5);
      else setCount(NAV_LINKS.length);
    }

    const ro = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width);
    });
    ro.observe(el);
    update(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [navRef]);

  return count;
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { connected, isConnecting, connect } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Open command palette on Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Restore focus to the triggering element when each overlay closes.
  useFocusReturn(walletModalOpen);
  useFocusReturn(paletteOpen);
  useFocusReturn(helpModalOpen);

  const toggleTheme = useThemeStore((state) => state.toggle);

  // Global keyboard shortcuts — keep in sync with KeyboardShortcutsHelpModal.
  const shortcuts = useMemo<ShortcutConfig[]>(
    () => [
      { key: "?", callback: () => setHelpModalOpen((open) => !open) },
      { key: "n", callback: () => router.push("/journal") },
      { key: "t", callback: () => toggleTheme() },
      { key: "r", callback: () => router.refresh() },
      // Sequential navigation shortcuts: G then [key]
      ...Object.entries(routeShortcuts).map(([key, href]) => ({
        key: `g then ${key}`,
        callback: () => router.push(href),
      })),
    ],
    [router, toggleTheme]
  );

  useKeyboardShortcuts(shortcuts);

  // Overflow logic (#557)
  const visibleCount = useVisibleLinkCount(navRef);
  const visibleLinks = NAV_LINKS.slice(0, visibleCount);
  const overflowLinks = NAV_LINKS.slice(visibleCount);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md pt-safe">
        <nav
          ref={navRef}
          className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-md px-1 font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="StellarSwipe home"
          >
            <Zap className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <span className="text-sm sm:text-base">StellarSwipe</span>
          </Link>

          {/* Nav links — visible items + overflow menu */}
          <ul
            className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex"
            role="list"
            aria-label="Main navigation links"
          >
            {visibleLinks.map(({ href, label, tourId }) => {
              const isActive =
                              pathname === href ||
                              (href !== "/" && pathname?.startsWith(`${href}/`));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    data-tour={tourId}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? "bg-surface-high/60 font-medium text-foreground"
                        : "text-foreground-muted hover:text-foreground hover:bg-surface-high/40"
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}

            {/* Overflow menu — only rendered when there are hidden links */}
            {overflowLinks.length > 0 && (
              <OverflowMenu
                links={overflowLinks}
                currentPath={pathname ?? ""}
              />
            )}
          </ul>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Help/shortcuts button */}
            <button
              type="button"
              onClick={() => setHelpModalOpen(true)}
              className="hidden min-h-11 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-foreground-muted transition-colors hover:bg-surface-high/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background group sm:inline-flex"
              aria-label="Keyboard shortcuts (?)"
              title="Keyboard shortcuts (?)"
            >
              <kbd className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-[3px] border border-border bg-accent/50 px-1 text-[9px] font-semibold text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                ?
              </kbd>
              <span className="sr-only sm:not-sr-only">Shortcuts</span>
            </button>

            <ThemeToggle />
            <LanguageSelector />
            <div data-tour="wallet" className="inline-flex">
              {connected ? (
                <WalletDropdown />
              ) : (
                <Button
                  size="sm"
                  disabled={isConnecting}
                  onClick={() => setWalletModalOpen(true)}
                  aria-label={
                    isConnecting ? "Connecting wallet…" : "Connect wallet"
                  }
                  className="gap-2"
                >
                  {isConnecting && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {isConnecting ? "Connecting…" : "Connect Wallet"}
                </Button>
              )}
            </div>
          </div>
        </nav>
      </header>

      <WalletSelectionModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onConnectWallet={() => {
          if (connected) return;
          setWalletModalOpen(true);
        }}
      />

      <KeyboardShortcutsHelpModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </>
  );
}
