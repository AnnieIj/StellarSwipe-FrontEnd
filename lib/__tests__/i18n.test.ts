/**
 * @jest-environment jsdom
 */
import { t, setLocale, initI18n, getCurrentLocale } from "@/lib/i18n";

// English is bundled statically (see lib/i18n.ts), so tests against the
// real `en` strings need no fetch mock at all. Only a non-English locale
// needs one, since those are still loaded on demand.
const FR_FIXTURE = {
  signals: {
    matching_count: {
      one: "{{count}} signal francais correspondant a {{query}}",
      other: "{{count}} signaux francais correspondant a {{query}}",
    },
  },
  // "common.loading" is intentionally omitted to exercise the English fallback.
};

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn((url: string) => {
    return Promise.resolve({
      ok: true,
      json: async () => (url.includes("/locales/fr.json") ? FR_FIXTURE : {}),
    }) as any;
  }) as any;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("i18n t()", () => {
  it("interpolates {{token}} placeholders using the statically bundled English strings", async () => {
    expect(
      t("signals.matching_count", { count: 1, query: "BTC" })
    ).toBe("1 signal matching “BTC”");
  });

  it("returns plain strings unchanged when no params are given", () => {
    expect(t("common.loading")).toBe("Loading");
  });

  it("selects the singular plural form for count === 1", () => {
    expect(t("sessions.minutes_ago", { count: 1 })).toBe("1 minute ago");
  });

  it("selects the plural form for count !== 1, including 0", () => {
    expect(t("sessions.minutes_ago", { count: 3 })).toBe("3 minutes ago");
    expect(t("sessions.minutes_ago", { count: 0 })).toBe("0 minutes ago");
  });

  it("works synchronously before initI18n() has ever run (first paint / SSR / tests)", () => {
    // No initI18n()/setLocale() call above this point in the file.
    expect(t("common.retry")).toBe("Retry");
  });

  it("falls back to English when the active locale is missing a key", async () => {
    await initI18n();
    await setLocale("fr" as any);
    expect(getCurrentLocale()).toBe("fr");
    expect(t("common.loading")).toBe("Loading");
  });

  it("uses the active locale's own plural forms when present", async () => {
    await initI18n();
    await setLocale("fr" as any);
    expect(t("signals.matching_count", { count: 1, query: "BTC" })).toBe(
      "1 signal francais correspondant a BTC"
    );
    expect(t("signals.matching_count", { count: 5, query: "BTC" })).toBe(
      "5 signaux francais correspondant a BTC"
    );
  });

  it("humanizes a fully missing key instead of exposing the raw dotted path", () => {
    expect(t("common.does_not_exist")).toBe("Does not exist");
  });
});
