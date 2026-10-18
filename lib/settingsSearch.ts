// ---------------------------------------------------------------------------
// Settings search (#895)
// ---------------------------------------------------------------------------

export interface SettingsSearchEntry {
  /** DOM id of the setting row to scroll to and focus. */
  id: string;
  label: string;
  section: string;
  /** DOM id of the section containing the setting. */
  sectionId: string;
  keywords: string[];
}

export const SETTINGS_INDEX: SettingsSearchEntry[] = [
  {
    id: "setting-theme",
    label: "Theme",
    section: "Appearance",
    sectionId: "prefs-appearance",
    keywords: ["dark", "light", "mode"],
  },
  {
    id: "setting-high-contrast",
    label: "High contrast",
    section: "Appearance",
    sectionId: "prefs-appearance",
    keywords: ["contrast", "accessibility", "visibility"],
  },
  {
    id: "setting-accent-color",
    label: "Accent color",
    section: "Appearance",
    sectionId: "prefs-appearance",
    keywords: ["colour", "brand", "highlight"],
  },
  {
    id: "setting-chart-palette",
    label: "Color-blind-safe charts",
    section: "Appearance",
    sectionId: "prefs-appearance",
    keywords: ["colorblind", "palette", "chart", "accessibility"],
  },
  {
    id: "setting-feed-density",
    label: "Feed density",
    section: "Display density",
    sectionId: "prefs-density",
    keywords: ["compact", "comfortable", "layout", "spacing"],
  },
  {
    id: "setting-data-saver",
    label: "Data saver",
    section: "Display density",
    sectionId: "prefs-density",
    keywords: ["bandwidth", "images", "mobile data"],
  },
  {
    id: "setting-swipe",
    label: "Swipe gestures",
    section: "Display density",
    sectionId: "prefs-density",
    keywords: ["swipe", "gesture", "sensitivity"],
  },
  {
    id: "setting-currency",
    label: "Display currency",
    section: "Currency",
    sectionId: "prefs-currency",
    keywords: ["usd", "eur", "money", "p&l", "price"],
  },
  {
    id: "setting-language",
    label: "App language",
    section: "Language",
    sectionId: "prefs-language",
    keywords: ["locale", "translation", "i18n"],
  },
  {
    id: "setting-notifications",
    label: "Push notifications",
    section: "Notifications",
    sectionId: "prefs-notifications",
    keywords: ["alerts", "push", "permission", "categories"],
  },
  {
    id: "setting-guided-tour",
    label: "Guided tour",
    section: "Onboarding",
    sectionId: "prefs-onboarding",
    keywords: ["onboarding", "tutorial", "walkthrough", "replay"],
  },
];

/**
 * Returns settings whose label, section, or keywords contain every term in
 * the query. Label matches rank before section/keyword matches.
 */
export function searchSettings(
  query: string,
  index: SettingsSearchEntry[] = SETTINGS_INDEX
): SettingsSearchEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored = index.flatMap((entry) => {
    const label = entry.label.toLowerCase();
    const haystack = [label, entry.section.toLowerCase(), ...entry.keywords]
      .join(" ")
      .toLowerCase();
    if (!terms.every((t) => haystack.includes(t))) return [];
    const score = terms.filter((t) => label.includes(t)).length;
    return [{ entry, score }];
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
}
