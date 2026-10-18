import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactNumber,
  formatCount,
  formatWithUnit,
} from "@/lib/localeFormatter";

describe("localeFormatter – Currency, Percent, and Number Formatting", () => {
  describe("formatCurrency", () => {
    it("formats USD currency for en-US locale", () => {
      const result = formatCurrency(1234.56, "USD", "en-US");
      expect(result).toBe("$1,234.56");
    });

    it("formats EUR currency for de-DE locale (uses space separator)", () => {
      const result = formatCurrency(1234.56, "EUR", "de-DE");
      expect(result).toContain("1");
      expect(result).toContain("EUR");
    });

    it("handles zero currency", () => {
      const result = formatCurrency(0, "USD", "en-US");
      expect(result).toContain("0");
    });

    it("handles negative currency", () => {
      const result = formatCurrency(-1234.56, "USD", "en-US");
      expect(result).toContain("-");
    });

    it("returns dash for NaN", () => {
      const result = formatCurrency(NaN, "USD", "en-US");
      expect(result).toBe("-");
    });

    it("handles very large numbers", () => {
      const result = formatCurrency(1000000000.99, "USD", "en-US");
      expect(result).toContain("1");
      expect(result).toContain(",");
    });
  });

  describe("formatPercent", () => {
    it("formats decimal as percentage with 2 decimals", () => {
      const result = formatPercent(0.421, 2, "en-US");
      expect(result).toBe("42.10%");
    });

    it("formats percentage with 0 decimals", () => {
      const result = formatPercent(0.8, 0, "en-US");
      expect(result).toBe("80%");
    });

    it("formats small percentage with 4 decimals", () => {
      const result = formatPercent(0.0001234, 4, "en-US");
      expect(result).toBe("0.0123%");
    });

    it("handles negative percentage", () => {
      const result = formatPercent(-0.15, 2, "en-US");
      expect(result).toContain("-");
      expect(result).toContain("%");
    });

    it("returns dash for NaN", () => {
      const result = formatPercent(NaN, 2, "en-US");
      expect(result).toBe("-");
    });

    it("uses locale-specific decimal separator", () => {
      const resultDE = formatPercent(0.421, 2, "de-DE");
      const resultUS = formatPercent(0.421, 2, "en-US");
      // German uses comma, US uses period
      expect(resultDE).toContain(",");
      expect(resultUS).toContain(".");
    });
  });

  describe("formatNumber", () => {
    it("formats number with thousands separators", () => {
      const result = formatNumber(1234567.89, { decimals: 2 });
      expect(result).toContain(",");
      expect(result).toContain("1");
    });

    it("formats number with no decimals", () => {
      const result = formatNumber(1234567, { decimals: 0 });
      expect(result).not.toContain(".");
    });

    it("handles negative numbers", () => {
      const result = formatNumber(-1234.56, { decimals: 2 });
      expect(result).toContain("-");
    });

    it("returns dash for NaN", () => {
      const result = formatNumber(NaN, { decimals: 2 });
      expect(result).toBe("-");
    });
  });

  describe("formatCompactNumber", () => {
    it("formats million with 'M' notation", () => {
      const result = formatCompactNumber(1234567, "en-US");
      expect(result).toContain("M");
      expect(result).toContain("1");
    });

    it("formats thousand with 'K' notation", () => {
      const result = formatCompactNumber(1234, "en-US");
      expect(result).toContain("K");
    });

    it("formats small number without notation", () => {
      const result = formatCompactNumber(42, "en-US");
      expect(result).toBe("42");
    });

    it("handles billion numbers", () => {
      const result = formatCompactNumber(1234567890, "en-US");
      expect(result).toContain("B");
    });

    it("returns dash for NaN", () => {
      const result = formatCompactNumber(NaN, "en-US");
      expect(result).toBe("-");
    });
  });

  describe("formatCount", () => {
    it("formats count without notation for small numbers", () => {
      const result = formatCount(42, "en-US");
      expect(result).toBe("42");
    });

    it("uses compact notation for numbers >= 1000", () => {
      const result = formatCount(1234, "en-US");
      expect(result).toContain("K");
    });

    it("formats large counts with compact notation", () => {
      const result = formatCount(1234567, "en-US");
      expect(result).toContain("M");
    });

    it("returns dash for NaN", () => {
      const result = formatCount(NaN, "en-US");
      expect(result).toBe("-");
    });
  });

  describe("formatWithUnit", () => {
    it("formats value with unit using non-breaking space", () => {
      const result = formatWithUnit(12, "XLM");
      // Should contain non-breaking space (\u00A0)
      expect(result).toContain("12");
      expect(result).toContain("XLM");
      expect(result).not.toContain(" XLM"); // Should be non-breaking space, not regular space
    });

    it("formats decimal value with unit", () => {
      const result = formatWithUnit(2.5, "GB", { decimals: 1 });
      expect(result).toContain("2.5");
      expect(result).toContain("GB");
    });

    it("returns dash for NaN", () => {
      const result = formatWithUnit(NaN, "XLM");
      expect(result).toBe("-");
    });
  });

  describe("Cross-locale consistency", () => {
    const testValue = 1234.5;
    const locales = ["en-US", "de-DE", "fr-FR", "es-ES"];

    it("all locales format currency without errors", () => {
      locales.forEach((locale) => {
        const result = formatCurrency(testValue, "USD", locale);
        expect(result).toBeTruthy();
        expect(result).not.toBe("-");
      });
    });

    it("all locales format percentages without errors", () => {
      locales.forEach((locale) => {
        const result = formatPercent(0.5, 2, locale);
        expect(result).toContain("%");
      });
    });

    it("all locales format compact numbers without errors", () => {
      locales.forEach((locale) => {
        const result = formatCompactNumber(1234567, locale);
        expect(result).toBeTruthy();
      });
    });
  });
});
