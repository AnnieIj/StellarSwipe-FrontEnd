"use client";

import { useId, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { cn } from "@/lib/utils";

interface AutocompleteFieldProps<T> {
  label: string;
  placeholder?: string;
  fetcher: (query: string, signal: AbortSignal) => Promise<T[]>;
  getOptionLabel: (option: T) => string;
  getOptionKey: (option: T) => string;
  onSelect: (option: T) => void;
  debounceMs?: number;
  minLength?: number;
  className?: string;
}

/**
 * Accessible async autocomplete input. Suggestions are always associated
 * with the query that produced them (via `useAutocomplete`'s stale-response
 * protection), so rapid typing never lets an older response clobber newer
 * suggestions or flicker the loading/empty state.
 */
export function AutocompleteField<T>({
  label,
  placeholder,
  fetcher,
  getOptionLabel,
  getOptionKey,
  onSelect,
  debounceMs,
  minLength,
  className,
}: AutocompleteFieldProps<T>) {
  const { query, setQuery, results, status } = useAutocomplete<T>({
    fetcher,
    debounceMs,
    minLength,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputId = useId();
  const listboxId = useId();

  const showList = isOpen && query.trim().length > 0;

  function selectOption(option: T) {
    onSelect(option);
    setQuery(getOptionLabel(option));
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectOption(results[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <div className="relative">
        <Search
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 100)}
          onKeyDown={handleKeyDown}
          className="min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 py-2 pl-9 pr-9 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        {status === "loading" && (
          <Loader2
            size={14}
            aria-hidden="true"
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500"
          />
        )}
      </div>

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full min-w-0 overflow-auto rounded-xl border border-white/10 bg-slate-900 py-1 text-sm shadow-xl"
        >
          {status === "loading" && (
            <li className="px-3 py-2 text-slate-500">Searching…</li>
          )}
          {status === "empty" && (
            <li className="px-3 py-2 text-slate-500">No matches found.</li>
          )}
          {status === "error" && (
            <li className="px-3 py-2 text-red-400">
              Something went wrong. Try again.
            </li>
          )}
          {status === "success" &&
            results.map((option, i) => (
              <li
                key={getOptionKey(option)}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-slate-200",
                  i === activeIndex ? "bg-blue-500/20" : "hover:bg-white/5"
                )}
              >
                {getOptionLabel(option)}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
