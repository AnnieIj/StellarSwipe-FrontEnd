import Link from "next/link";

const links = {
  Platform: [
    { label: "Signal Feed", href: "#feed" },
    { label: "Trade History", href: "#history" },
    { label: "Leaderboard", href: "#leaderboard" },
    { label: "Analytics", href: "#analytics" },
  ],
  Security: [
    { label: "Audit Reports", href: "#audits" },
    { label: "Bug Bounty", href: "#bounty" },
    { label: "Open Source", href: "#oss" },
  ],
  Providers: [
    { label: "Become a Provider", href: "#providers" },
    { label: "Provider Docs", href: "#docs" },
    { label: "API Reference", href: "#api" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold text-foreground">
              StellarSwipe
            </span>
            <p className="text-sm text-foreground-muted leading-relaxed">
              AI-powered trading signals on the Stellar SDEX. Connect your
              wallet, follow top providers, and swipe to trade.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group} className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                {group}
              </span>
              <ul className="flex flex-col gap-2">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} StellarSwipe. All rights reserved.
          </p>
          <div className="flex gap-5">
            {[
              { label: "Terms of Service", href: "#terms" },
              { label: "Privacy Policy", href: "#privacy" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-xs text-foreground-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
