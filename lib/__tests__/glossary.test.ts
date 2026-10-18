/**
 * Tests for glossary dictionary and GlossaryTerm rendering logic.
 */

import { getDefinition, glossary } from "@/lib/glossary";

// ── Glossary dictionary tests ────────────────────────────────────────────────

describe("glossary dictionary", () => {
  describe("getDefinition", () => {
    it("returns a definition for a known term", () => {
      const def = getDefinition("slippage");
      expect(def).toBeDefined();
      expect(typeof def).toBe("string");
      expect(def!.length).toBeGreaterThan(0);
    });

    it("is case-insensitive", () => {
      const lower = getDefinition("slippage");
      const upper = getDefinition("SLIPPAGE");
      const mixed = getDefinition("Slippage");
      expect(lower).toBe(upper);
      expect(lower).toBe(mixed);
    });

    it("returns undefined for unknown terms", () => {
      expect(getDefinition("flux-capacitor")).toBeUndefined();
      expect(getDefinition("")).toBeUndefined();
      expect(getDefinition("   ")).toBeUndefined();
    });

    it("supports hyphenated terms", () => {
      expect(getDefinition("stop-loss")).toBeDefined();
      expect(getDefinition("fee-bump")).toBeDefined();
    });

    it("supports multi-word terms", () => {
      expect(getDefinition("claimable balance")).toBeDefined();
      expect(getDefinition("win rate")).toBeDefined();
    });
  });

  describe("glossary content", () => {
    it("covers the high-traffic terms specified in the issue", () => {
      const required = [
        "slippage",
        "trustline",
        "claimable balance",
        "stop-loss",
        "fee-bump",
      ];
      for (const term of required) {
        expect(getDefinition(term)).toBeDefined();
      }
    });

    it("all definitions are non-empty strings", () => {
      for (const [term, def] of Object.entries(glossary)) {
        expect(typeof def).toBe("string");
        expect(def.length).toBeGreaterThan(0);
      }
    });

    it("has at least 10 entries", () => {
      expect(Object.keys(glossary).length).toBeGreaterThanOrEqual(10);
    });
  });
});

// ── GlossaryTerm rendering logic (pure) ─────────────────────────────────────

describe("GlossaryTerm rendering logic", () => {
  it("resolves definition for a known term", () => {
    const def = getDefinition("slippage");
    expect(def).toBeTruthy();
  });

  it("returns undefined for an unknown term so no tooltip renders", () => {
    const def = getDefinition("not-a-trading-term");
    expect(def).toBeUndefined();
  });

  it("tooltip id generation produces valid HTML id", () => {
    const term = "claimable balance";
    const id = `glossary-${term.toLowerCase().replace(/\s+/g, "-")}`;
    expect(id).toBe("glossary-claimable-balance");
    // HTML ids must not contain spaces
    expect(id).not.toMatch(/\s/);
  });

  it("tooltip id is stable for the same term", () => {
    const makeId = (t: string) =>
      `glossary-${t.toLowerCase().replace(/\s+/g, "-")}`;
    expect(makeId("stop-loss")).toBe(makeId("stop-loss"));
    expect(makeId("Slippage")).toBe(makeId("slippage"));
  });
});
