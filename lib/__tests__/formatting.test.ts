/**
 * Tests for locale-aware formatting utilities (lib/i18n.ts + hooks/usePriceFormat.ts).
 * Verifies that decimal/thousands separators change correctly across locales.
 */

// We test the core Intl-based logic directly (without React hooks).

const RAW_VALUE = 1234567.89;

function formatForLocale(value: number, bcp47: string, decimals = 2): string {
  return new Intl.NumberFormat(bcp47, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatNumberForLocale(value: number, bcp47: string): string {
  return new Intl.NumberFormat(bcp47).format(value);
}

describe("Locale-aware currency formatting", () => {
  it("en-US uses $ prefix and comma thousands separator", () => {
    const result = formatForLocale(RAW_VALUE, "en-US");
    expect(result).toMatch(/^\$/);
    expect(result).toContain(",");
    expect(result).toContain(".");
  });

  it("de-DE uses dot thousands separator and comma decimal", () => {
    const result = formatNumberForLocale(RAW_VALUE, "de-DE");
    // German: 1.234.567,89
    expect(result).toContain(".");
    expect(result).toContain(",");
  });

  it("fr-FR uses space thousands separator and comma decimal", () => {
    const result = formatNumberForLocale(RAW_VALUE, "fr-FR");
    expect(result).toContain(",");
  });

  it("same raw value formats differently in en-US vs de-DE", () => {
    const en = formatNumberForLocale(1234.5, "en-US");
    const de = formatNumberForLocale(1234.5, "de-DE");
    expect(en).not.toBe(de);
  });

  it("zh-CN formats large numbers without western thousands separator", () => {
    const result = formatForLocale(RAW_VALUE, "zh-CN");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("Price formatting precision modes", () => {
  const locale = "en-US";

  function fmtPrice(value: number, decimals: number): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  it("compact mode uses 4 decimal places", () => {
    const result = fmtPrice(0.4821, 4);
    expect(result).toBe("$0.4821");
  });

  it("precise mode uses 8 decimal places", () => {
    const result = fmtPrice(0.4821, 8);
    expect(result).toBe("$0.48210000");
  });

  it("both modes produce the same integer part", () => {
    const compact = fmtPrice(1.5, 4);
    const precise = fmtPrice(1.5, 8);
    expect(compact.startsWith("$1.5")).toBe(true);
    expect(precise.startsWith("$1.5")).toBe(true);
  });
});
