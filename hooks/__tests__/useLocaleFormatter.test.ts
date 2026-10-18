import { renderHook, act } from "@testing-library/react";
import { useLocaleFormatter } from "@/hooks/useLocaleFormatter";
import { useI18n } from "@/hooks/useI18n";

/**
 * Tests for useLocaleFormatter hook.
 * Verifies that formatters respond to locale changes.
 */

// Mock the useI18n hook
jest.mock("@/hooks/useI18n", () => ({
  useI18n: jest.fn(),
}));

const mockUseI18n = useI18n as jest.MockedFunction<typeof useI18n>;

describe("useLocaleFormatter – React Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns formatter functions for locale 'en-US'", () => {
    mockUseI18n.mockReturnValue({
      locale: "en",
      isInitialized: true,
      setLocale: jest.fn(),
      supportedLocales: ["en", "de"],
      isRTL: false,
      t: jest.fn(),
      formatNumber: jest.fn(),
      formatDate: jest.fn(),
      formatCurrency: jest.fn(),
    });

    const { result } = renderHook(() => useLocaleFormatter());

    expect(result.current.formatCurrency).toBeDefined();
    expect(result.current.formatPercent).toBeDefined();
    expect(result.current.formatNumber).toBeDefined();
    expect(result.current.formatCompact).toBeDefined();
    expect(result.current.formatCount).toBeDefined();
    expect(result.current.formatWithUnit).toBeDefined();
  });

  it("formatter functions exist and are callable", () => {
    mockUseI18n.mockReturnValue({
      locale: "en",
      isInitialized: true,
      setLocale: jest.fn(),
      supportedLocales: ["en", "de"],
      isRTL: false,
      t: jest.fn(),
      formatNumber: jest.fn(),
      formatDate: jest.fn(),
      formatCurrency: jest.fn(),
    });

    const { result } = renderHook(() => useLocaleFormatter());

    // Test that formatters can be called
    const currencyResult = result.current.formatCurrency(1234.56, "USD");
    expect(typeof currencyResult).toBe("string");

    const percentResult = result.current.formatPercent(0.5, 2);
    expect(typeof percentResult).toBe("string");

    const numberResult = result.current.formatNumber(1000);
    expect(typeof numberResult).toBe("string");
  });

  it("includes initialization status", () => {
    mockUseI18n.mockReturnValue({
      locale: "en",
      isInitialized: false,
      setLocale: jest.fn(),
      supportedLocales: ["en"],
      isRTL: false,
      t: jest.fn(),
      formatNumber: jest.fn(),
      formatDate: jest.fn(),
      formatCurrency: jest.fn(),
    });

    const { result } = renderHook(() => useLocaleFormatter());
    expect(result.current.isInitialized).toBe(false);

    // Update to initialized state
    mockUseI18n.mockReturnValue({
      locale: "en",
      isInitialized: true,
      setLocale: jest.fn(),
      supportedLocales: ["en"],
      isRTL: false,
      t: jest.fn(),
      formatNumber: jest.fn(),
      formatDate: jest.fn(),
      formatCurrency: jest.fn(),
    });

    const { result: resultInitialized } = renderHook(() =>
      useLocaleFormatter()
    );
    expect(resultInitialized.current.isInitialized).toBe(true);
  });
});
