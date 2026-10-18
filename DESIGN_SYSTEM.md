# Design System Foundation

Shared tokens for spacing, typography, radius, and elevation live in
`app/globals.css` (`:root`, under the "Typography Scale", "Spacing Scale",
and "Elevation Scale" comments). Color semantics were already tokenized
there — see the comment block at the top of the `@layer base` section for
the full naming convention.

## Naming convention

Tokens are exposed two ways:

1. **CSS custom properties** (`--text-heading-size`, `--space-md`,
   `--shadow-2`, ...) for use in one-off inline styles or new utilities.
2. **Utility classes** (`.text-heading`, `.shadow-elevation-2`, ...) under
   `@layer utilities` in `globals.css`, for use directly in `className`,
   matching the existing pattern used for color tokens (`bg-surface-high`,
   `text-accent-danger`, etc).

| Scale      | Tokens                                             | Utility classes |
|------------|-----------------------------------------------------|------------------|
| Typography | `--text-{display,heading,subheading,body,caption,label}-{size,line}` | `.text-display`, `.text-heading`, `.text-subheading`, `.text-body`, `.text-caption`, `.text-label` |
| Spacing    | `--space-{xs,sm,md,lg,xl,2xl}`                      | use directly, e.g. `gap-[--space-md]`, or prefer Tailwind's default spacing scale for one-off values |
| Radius     | `--radius`                                          | Tailwind's `rounded-*` utilities (already wired to `--radius`) |
| Elevation  | `--shadow-{1,2,3}`                                  | `.shadow-elevation-1`, `.shadow-elevation-2`, `.shadow-elevation-3` |
| Color      | `--background`, `--surface`, `--foreground`, `--accent-*`, ... | see comment block in `globals.css` |

Elevation increases with the token number: `shadow-elevation-1` for resting
cards, `shadow-elevation-2` for interactive/raised elements (default
buttons), `shadow-elevation-3` for floating layers (dialogs, popovers,
dropdowns).

## Usage

`components/ui/card.tsx` and `components/ui/button.tsx` use the elevation
tokens as the reference implementation — prefer `shadow-elevation-*` over
Tailwind's default `shadow`/`shadow-sm` in new UI so elevation stays
centrally tunable.

Typography utilities (`.text-heading`, `.text-body`, ...) are additive —
existing `text-sm font-medium`-style Tailwind combinations are not required
to migrate as part of this change, but new UI should prefer the semantic
scale.
