import {
  useCurrencyStore,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  type DisplayCurrency,
} from "@/store/useCurrencyStore";

// Mirrors the formatting logic in usePriceFormat
function formatPrice(
  value: number,
  currency: DisplayCurrency,
  decimals = 4
): string {
  return `${CURRENCY_SYMBOLS[currency]}${(
    value * EXCHANGE_RATES[currency]
  ).toFixed(decimals)}`;
}

describe("useCurrencyStore", () => {
  beforeEach(() => {
    useCurrencyStore.setState({ currency: "USD" });
  });

  it("defaults to USD", () => {
    expect(useCurrencyStore.getState().currency).toBe("USD");
  });

  it("setCurrency updates the stored currency", () => {
    useCurrencyStore.getState().setCurrency("EUR");
    expect(useCurrencyStore.getState().currency).toBe("EUR");
  });

  it("setCurrency can switch between multiple currencies", () => {
    useCurrencyStore.getState().setCurrency("JPY");
    expect(useCurrencyStore.getState().currency).toBe("JPY");
    useCurrencyStore.getState().setCurrency("GBP");
    expect(useCurrencyStore.getState().currency).toBe("GBP");
  });
});

describe("Currency conversion – EXCHANGE_RATES", () => {
  it("USD rate is 1 (no conversion)", () => {
    expect(EXCHANGE_RATES.USD).toBe(1);
  });

  it("EUR rate is less than 1 (stronger than USD)", () => {
    expect(EXCHANGE_RATES.EUR).toBeLessThan(1);
    expect(EXCHANGE_RATES.EUR).toBeGreaterThan(0);
  });

  it("JPY rate is greater than 1 (weaker than USD)", () => {
    expect(EXCHANGE_RATES.JPY).toBeGreaterThan(1);
  });

  it("all currencies have a positive non-zero rate", () => {
    for (const rate of Object.values(EXCHANGE_RATES)) {
      expect(rate).toBeGreaterThan(0);
    }
  });
});

describe("Price formatting with currency conversion", () => {
  const BASE_PRICE_USD = 100; // $100 USD

  it("formats USD without conversion", () => {
    const result = formatPrice(BASE_PRICE_USD, "USD");
    expect(result).toBe("$100.0000");
  });

  it("converts to EUR correctly", () => {
    const expected = `€${(BASE_PRICE_USD * EXCHANGE_RATES.EUR).toFixed(4)}`;
    expect(formatPrice(BASE_PRICE_USD, "EUR")).toBe(expected);
    // EUR rate is 0.92, so $100 → €92
    expect(formatPrice(BASE_PRICE_USD, "EUR")).toBe("€92.0000");
  });

  it("converts to JPY correctly", () => {
    const expected = `¥${(BASE_PRICE_USD * EXCHANGE_RATES.JPY).toFixed(4)}`;
    expect(formatPrice(BASE_PRICE_USD, "JPY")).toBe(expected);
    // JPY rate is 149.5, so $100 → ¥14950
    expect(formatPrice(BASE_PRICE_USD, "JPY")).toBe("¥14950.0000");
  });

  it("converts to GBP correctly", () => {
    const expected = `£${(BASE_PRICE_USD * EXCHANGE_RATES.GBP).toFixed(4)}`;
    expect(formatPrice(BASE_PRICE_USD, "GBP")).toBe(expected);
  });

  it("respects 8 decimal places in precise mode", () => {
    const result = formatPrice(1, "EUR", 8);
    expect(result).toBe(`€${EXCHANGE_RATES.EUR.toFixed(8)}`);
  });

  it("small price converts accurately in EUR", () => {
    const smallPrice = 0.4821;
    const result = formatPrice(smallPrice, "EUR");
    const expected = `€${(smallPrice * EXCHANGE_RATES.EUR).toFixed(4)}`;
    expect(result).toBe(expected);
  });

  it("small price converts accurately in JPY", () => {
    const smallPrice = 0.4821;
    const result = formatPrice(smallPrice, "JPY");
    const expected = `¥${(smallPrice * EXCHANGE_RATES.JPY).toFixed(4)}`;
    expect(result).toBe(expected);
  });
});
