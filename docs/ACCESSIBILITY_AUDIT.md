# Accessibility Audit — Focus, Labels, Contrast & Landmarks

A targeted accessibility pass across the most-used flows: signal comparison,
bookmarks, and journal entry. The goal was to fix concrete, verifiable issues
rather than a cosmetic pass — each item below is a real defect a keyboard or
screen-reader user would hit.

## What was found and fixed

- **Global focus-visible fallback** (`app/globals.css`): added a baseline
  `:focus-visible` outline for buttons, links, inputs, selects, and any
  `role="button"`/`role="tab"`/`role="switch"`/`role="checkbox"`/`[tabindex]`
  element. Previously, focus rings only appeared where a component
  remembered to add `focus-visible:ring-*` explicitly — custom interactive
  `<div>`s (see next item) had no visible focus indicator at all.

- **Unreachable "Add signal" control** (`app/compare/page.tsx`): the
  placeholder slot used `role="button"` with an `onClick` handler but no
  `tabIndex` and no `onKeyDown`, so keyboard users could not focus or
  activate it at all. Added `tabIndex={0}`, Enter/Space key handling, and a
  focus ring. Also bumped its label text from `text-gray-600` to
  `text-gray-400` on the near-black `bg-gray-950` surface — the darker shade
  fell below WCAG AA contrast (~3.9:1 for 14px text, needs 4.5:1).

- **Unassociated form labels** (`components/JournalEntryForm.tsx`,
  `components/CSVImportModal.tsx`): every field in the manual journal entry
  form (Date, Asset Pair, Amount, Price, Token, Fee, Status, Outcome) had a
  `<label>` that was only *visually* adjacent to its input — no `htmlFor`/`id`
  pairing — so screen readers announced focused inputs with no name at all.
  Added matching `id`/`htmlFor` pairs, plus `aria-invalid`/`aria-describedby`
  wiring so validation errors are announced with the field. Same fix applied
  to the CSV column-mapping selects in the import modal (one label/select
  pair generated per CSV column).

- **Folder selection state** (`components/bookmarks/BookmarksPage.tsx`):
  the selected folder in the bookmarks sidebar was conveyed by color alone;
  added `aria-pressed` to the folder buttons and `aria-hidden` to their
  decorative icons, plus focus-visible rings.

## Verification

No build/test run was performed as part of this change (per task scope);
changes are localized, additive (`aria-*`, `id`/`htmlFor`, `tabIndex`,
CSS-only focus ring), and don't alter component logic or props. Recommended
follow-up: run `axe-core` or the existing Storybook a11y addon against
`/compare`, `/bookmarks`, and `/journal` to catch anything outside this
pass's scope (e.g. contrast in charts, dynamic live-region coverage).
