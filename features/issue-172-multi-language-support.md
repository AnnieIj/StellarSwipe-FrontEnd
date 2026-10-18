# Issue #172 - Multi-Language Support Implementation

Maps implemented features to acceptance criteria.

## Implemented

- **Language selector in navbar** – `LanguageSelector` component updated with dropdown showing native name + English label; aria roles for accessibility.
- **5+ languages (EN, ES, FR, DE, ZH)** – Locale files: `en.json`, `es.json`, `fr.fr.json`, `de.json`, `zh.json`; plus existing `ng.json` (Yoruba) and new `ar.json` (Arabic).
- **Translation of all UI text** – All common, header, signals, trade, notifications, wallet, footer keys translated in every locale file.
- **RTL support (Arabic)** – `isRTL()` helper in `lib/i18n.ts`; `useI18n` sets `document.documentElement.dir` and `lang` on locale change; `LanguageSelector` renders RTL items with `dir="rtl"`.
- **Language preference saved** – `localStorage` key `stellarswipe:locale` (existing mechanism, extended to new locales).
- **Number formatting per locale** – `formatNumber(value, options)` uses `Intl.NumberFormat` with BCP-47 tag.
- **Date formatting per locale** – `formatDate(date, options)` uses `Intl.DateTimeFormat`.
- **Currency display per locale** – `formatCurrency(value, currency)` uses `Intl.NumberFormat` with `style: 'currency'`.
- **Signal descriptions translated** – Translation keys under `signals.*` provided in all 7 locales.
- **Help/documentation keys** – `footer.documentation` key translated in all locales.
- **Community contributions** – Locale files are plain JSON at `public/locales/<code>.json`; community PRs can add/update files following the same schema.

## Files

| File                              | Role                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `lib/i18n.ts`                     | Extended: 7 locales, RTL helpers, Intl formatting      |
| `hooks/useI18n.ts`                | Exposes formatNumber/Date/Currency, sets html dir/lang |
| `components/LanguageSelector.tsx` | Navbar dropdown with RTL indication                    |
| `public/locales/es.json`          | Spanish                                                |
| `public/locales/fr.json`          | French                                                 |
| `public/locales/de.json`          | German                                                 |
| `public/locales/zh.json`          | Chinese Simplified                                     |
| `public/locales/ar.json`          | Arabic (RTL)                                           |
