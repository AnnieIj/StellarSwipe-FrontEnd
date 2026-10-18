"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Info, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BENCHMARKS,
  formatBenchmarkFreshness,
  groupBenchmarks,
  searchBenchmarks,
  type BenchmarkDefinition,
} from "@/lib/benchmarks";

interface BenchmarkSelectorProps {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

const STATUS_STYLES: Record<BenchmarkDefinition["status"], string> = {
  available: "bg-green-500",
  stale: "bg-amber-500",
  unavailable: "bg-red-500",
};

const STATUS_LABELS: Record<BenchmarkDefinition["status"], string> = {
  available: "Live",
  stale: "Stale",
  unavailable: "Unavailable",
};

/**
 * Searchable, grouped benchmark picker (#784). Source metadata and freshness
 * sit behind an info toggle so the primary chart view stays uncluttered.
 */
export function BenchmarkSelector({ value, onChange, className }: BenchmarkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const infoId = useId();

  const active = BENCHMARKS.find((b) => b.id === value);
  const results = useMemo(() => searchBenchmarks(query), [query]);
  const grouped = useMemo(() => groupBenchmarks(results), [results]);
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    if (!open) return;
    setHighlight(Math.max(0, flat.findIndex((b) => b.id === value)));
    searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function select(b: BenchmarkDefinition) {
    onChange(b.id);
    setOpen(false);
    setQuery("");
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(flat.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const b = flat[highlight];
      if (b) select(b);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative text-xs", className)}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Benchmark: ${active?.name ?? "none selected"}. Change benchmark`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {active && (
            <span
              className={cn("h-1.5 w-1.5 rounded-full", STATUS_STYLES[active.status])}
              aria-hidden="true"
            />
          )}
          <span className="max-w-[9rem] truncate">vs {active?.label ?? "Benchmark"}</span>
          <ChevronDown size={12} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setShowInfo((s) => !s)}
          aria-expanded={showInfo}
          aria-controls={infoId}
          aria-label="Benchmark source and freshness"
          className="rounded-md p-1 text-foreground-muted hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info size={13} aria-hidden="true" />
        </button>
      </div>

      {showInfo && active && (
        <div
          id={infoId}
          className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-background p-3 shadow-lg"
        >
          <BenchmarkMetadata benchmark={active} />
        </div>
      )}

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-background shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
            <Search size={13} className="text-foreground-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search benchmarks"
              aria-label="Search benchmarks"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={flat[highlight] ? `${listId}-${flat[highlight].id}` : undefined}
              className="w-full bg-transparent py-1 text-xs text-foreground outline-none placeholder:text-foreground-muted"
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Available benchmarks" className="max-h-64 overflow-y-auto py-1">
            {grouped.length === 0 && (
              <li className="px-3 py-3 text-foreground-muted" role="presentation">
                No benchmarks match &ldquo;{query}&rdquo;.
              </li>
            )}
            {grouped.map(({ group, items }) => (
              <li key={group} role="presentation">
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                  {group}
                </p>
                <ul role="group" aria-label={group}>
                  {items.map((b) => {
                    const index = flat.indexOf(b);
                    const selected = b.id === value;
                    return (
                      <li
                        key={b.id}
                        id={`${listId}-${b.id}`}
                        role="option"
                        aria-selected={selected}
                        aria-disabled={b.status === "unavailable"}
                        onPointerEnter={() => setHighlight(index)}
                        onClick={() => select(b)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5",
                          index === highlight && "bg-accent",
                          b.status === "unavailable" && "opacity-60"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-foreground">{b.name}</span>
                          <span className="block truncate text-[10px] text-foreground-muted">
                            {STATUS_LABELS[b.status]} · {formatBenchmarkFreshness(b)}
                          </span>
                        </span>
                        {selected && <Check size={13} className="shrink-0 text-foreground" aria-hidden="true" />}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function BenchmarkMetadata({ benchmark }: { benchmark: BenchmarkDefinition }) {
  return (
    <dl className="space-y-1.5 text-[11px]">
      <div>
        <dt className="text-foreground-muted">Benchmark</dt>
        <dd className="text-foreground">{benchmark.name}</dd>
      </div>
      <div>
        <dt className="text-foreground-muted">Source</dt>
        <dd className="break-words text-foreground">
          {benchmark.sourceUrl ? (
            <a
              href={benchmark.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {benchmark.source}
            </a>
          ) : (
            benchmark.source
          )}
        </dd>
      </div>
      <div>
        <dt className="text-foreground-muted">Methodology</dt>
        <dd className="text-foreground">{benchmark.methodology}</dd>
      </div>
      <div className="flex gap-4">
        <div>
          <dt className="text-foreground-muted">Unit</dt>
          <dd className="text-foreground">{benchmark.unit}</dd>
        </div>
        <div>
          <dt className="text-foreground-muted">Update frequency</dt>
          <dd className="text-foreground">{benchmark.updateFrequency}</dd>
        </div>
      </div>
      <div>
        <dt className="text-foreground-muted">Freshness</dt>
        <dd className="text-foreground">
          {STATUS_LABELS[benchmark.status]} · {formatBenchmarkFreshness(benchmark)} (
          {new Date(benchmark.lastUpdated).toLocaleString()})
        </dd>
      </div>
      {benchmark.statusReason && (
        <p className="rounded bg-amber-500/10 px-2 py-1 text-amber-400">{benchmark.statusReason}</p>
      )}
    </dl>
  );
}
