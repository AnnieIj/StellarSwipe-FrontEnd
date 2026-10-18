/**
 * Tests for API key management logic.
 * Tests the pure service layer (lib/apiKeys.ts) and display logic.
 */

import { fetchApiKeys, createApiKey, revokeApiKey } from "@/lib/apiKeys";

// Reset module between tests to get a clean mock store
beforeEach(() => {
  jest.resetModules();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function maskToken(plainToken: string): string {
  const suffix = plainToken.slice(-4);
  return `sk_•••••••••${suffix}`;
}

function isFullTokenExposed(displayValue: string): boolean {
  // A full token starts with "sk_live_" followed by hex
  return displayValue.startsWith("sk_live_");
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("apiKeys service", () => {
  describe("fetchApiKeys", () => {
    it("returns a list of keys with masked tokens only", async () => {
      const keys = await fetchApiKeys();
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(isFullTokenExposed(key.maskedToken)).toBe(false);
        expect(key.maskedToken).toMatch(/^sk_•/);
      }
    });

    it("returns keys with required fields", async () => {
      const keys = await fetchApiKeys();
      for (const key of keys) {
        expect(key).toHaveProperty("id");
        expect(key).toHaveProperty("name");
        expect(key).toHaveProperty("maskedToken");
        expect(key).toHaveProperty("createdAt");
        expect(key).toHaveProperty("lastUsedAt");
      }
    });
  });

  describe("createApiKey", () => {
    it("returns a plainToken only at creation time", async () => {
      const result = await createApiKey("Test Bot");
      expect(result.plainToken).toBeDefined();
      expect(result.plainToken).toMatch(/^sk_live_/);
    });

    it("includes the created key in the list after creation", async () => {
      const created = await createApiKey("New Integration");
      const keys = await fetchApiKeys();
      const found = keys.find((k) => k.id === created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("New Integration");
    });

    it("masked token in list does not expose the full token", async () => {
      const created = await createApiKey("Secret Bot");
      const keys = await fetchApiKeys();
      const found = keys.find((k) => k.id === created.id);
      expect(found?.maskedToken).not.toContain(created.plainToken);
      expect(isFullTokenExposed(found!.maskedToken)).toBe(false);
    });

    it("masked token ends with the last 4 chars of the plain token", async () => {
      const created = await createApiKey("Suffix Check");
      const expectedSuffix = created.plainToken.slice(-4);
      expect(created.maskedToken).toContain(expectedSuffix);
    });

    it("sets lastUsedAt to null on creation", async () => {
      const created = await createApiKey("Fresh Key");
      expect(created.lastUsedAt).toBeNull();
    });

    it("sets createdAt to a recent ISO date", async () => {
      const before = Date.now();
      const created = await createApiKey("Timestamp Check");
      const after = Date.now();
      const ts = new Date(created.createdAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe("revokeApiKey", () => {
    it("removes the key from the list", async () => {
      const created = await createApiKey("To Be Revoked");
      await revokeApiKey(created.id);
      const keys = await fetchApiKeys();
      expect(keys.find((k) => k.id === created.id)).toBeUndefined();
    });

    it("does not affect other keys when revoking one", async () => {
      const a = await createApiKey("Key A Unique");
      const b = await createApiKey("Key B Unique");
      await revokeApiKey(a.id);
      const keys = await fetchApiKeys();
      expect(keys.find((k) => k.id === a.id)).toBeUndefined();
      // b was created after a, revoke(a) must not remove b
      expect(keys.find((k) => k.id === b.id)).toBeDefined();
    });

    it("handles revocation of a non-existent id gracefully", async () => {
      await expect(revokeApiKey("nonexistent-id")).resolves.not.toThrow();
    });
  });

  describe("masked display logic", () => {
    it("maskToken function produces expected format", () => {
      const plain = "sk_live_abc123def456xyz9";
      const masked = maskToken(plain);
      expect(masked).toBe("sk_•••••••••xyz9");
      expect(isFullTokenExposed(masked)).toBe(false);
    });

    it("masked token always starts with sk_•", () => {
      const cases = ["sk_live_aabbccdd1234", "sk_live_00001111aaaa"];
      for (const plain of cases) {
        expect(maskToken(plain)).toMatch(/^sk_•/);
      }
    });
  });
});
