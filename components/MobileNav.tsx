"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, GitCompareArrows, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/app", label: "Signals", icon: BarChart3 },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
];

export function MobileNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-4 px-2" role="list">
        {MOBILE_LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-full flex-col items-center justify-center gap-1 rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary", active ? "text-accent-primary" : "text-foreground-muted")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}