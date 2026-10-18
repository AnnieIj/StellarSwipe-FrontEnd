import {
  isSensitiveQuery,
  sanitizeRecentHref,
  sanitizeRecentQuery,
} from "@/lib/recentSearches";

describe("recent search sanitisation", () => {
  it.each([
    ["Stellar secret seed", "SBZVMB74Z76QZ3ZOY7UTDFYKMEGKW5XFJEB6PFKBF4UYSSWHG4EDH7PY"],
    ["Stellar public key", "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI"],
    ["transaction hash", "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889"],
    ["email address", "someone@example.com"],
    ["2FA code", "482913"],
    ["credential keyword", "my password"],
    ["recovery phrase", "abandon ability able about above absent absorb abstract absurd abuse access accident"],
  ])("treats a %s as sensitive", (_label, query) => {
    expect(isSensitiveQuery(query)).toBe(true);
    expect(sanitizeRecentQuery(query)).toBe("");
  });

  it("keeps ordinary queries, normalising whitespace", () => {
    expect(sanitizeRecentQuery("  tax   report ")).toBe("tax report");
    expect(isSensitiveQuery("backtest")).toBe(false);
  });

  it("truncates very long queries", () => {
    expect(sanitizeRecentQuery("a b ".repeat(20)).length).toBeLessThanOrEqual(64);
  });

  it("drops sensitive URL parameters and fragments from destinations", () => {
    expect(sanitizeRecentHref("/signals?asset=XLM&email=a@b.co#top")).toBe("/signals?asset=XLM");
    expect(sanitizeRecentHref("/security?token=abc")).toBe("/security");
    expect(sanitizeRecentHref("/providers")).toBe("/providers");
  });
});
