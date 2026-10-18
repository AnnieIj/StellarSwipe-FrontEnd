# Contributing to StellarSwipe

## Design Tokens

All visual values (colors, spacing, border-radius, z-index) are defined in two co-owned files:

| File | Role |
|---|---|
| `app/globals.css` | CSS custom properties (`--background`, `--accent-success`, …) |
| `tailwind.config.ts` | Maps those variables to Tailwind utility classes |

### Rule: no hardcoded color / spacing values in components

❌ Don't do this:
```tsx
<div className="bg-green-500 text-red-600 border-slate-700">
```

✅ Do this instead:
```tsx
<div className="bg-accent-success text-accent-danger border-border">
```

Available semantic tokens:

| Token | Usage |
|---|---|
| `background` | Page canvas |
| `surface` / `surface-high` | Cards, panels |
| `foreground` / `foreground-muted` / `foreground-subtle` | Text hierarchy |
| `border` / `border-strong` | Dividers |
| `accent-primary` | Blue CTA |
| `accent-sky` | Sky highlight |
| `accent-success` | Buy / success (green) |
| `accent-danger` | Sell / error (red) |
| `accent-warning` | Amber warnings |
| `accent-market` | Indigo market-order variant |

Opacity modifiers work out of the box:
```tsx
<div className="bg-accent-success/10 text-accent-success">
```

### Adding a new token

1. Add the CSS variable to both the `:root` and `.dark` / `.light` blocks in `app/globals.css`.
2. Add the corresponding mapping in `tailwind.config.ts` under `theme.extend.colors`.
3. Document the new token in the table above.

### Dark / light theme

The app uses `prefers-color-scheme` media query + `.dark` / `.light` class overrides.
Test both themes in Storybook (use the sun/moon toolbar icon) before opening a PR.

## Formatting utilities

Use the shared utilities in `lib/i18n.ts` for all number and currency display — **never** call `.toFixed()` or `.toLocaleString()` directly in JSX. See the [locale-aware formatting section](#locale-aware-formatting) below.

## Locale-aware formatting

Use `formatNumber`, `formatCurrency`, or `usePriceFormat` (which is locale-aware) so that decimal/thousands separators automatically adapt to the active locale.

## Tests

Run `npm test` before pushing. New utilities should have corresponding unit tests.
