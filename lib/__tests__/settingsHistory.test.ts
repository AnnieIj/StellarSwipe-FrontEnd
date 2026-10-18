import {
  createHistoryEntry,
  formatHistoryValue,
  getRestoreAvailability,
  REDACTED_VALUE,
  type SettingDefinition,
} from "@/lib/settingsHistory";

function makeDef(
  overrides: Partial<SettingDefinition<string>> = {}
): SettingDefinition<string> {
  let value = "b";
  return {
    id: "demo",
    label: "Demo",
    read: () => value,
    subscribe: () => () => {},
    restore: (v) => {
      value = v;
    },
    ...overrides,
  };
}

const NOW = new Date("2026-10-17T12:00:00.000Z");

describe("settingsHistory helpers (#900)", () => {
  describe("createHistoryEntry", () => {
    it("records setting, prior and current values and change time", () => {
      const entry = createHistoryEntry(makeDef(), "a", "b", NOW);
      expect(entry).toMatchObject({
        settingId: "demo",
        label: "Demo",
        previous: "a",
        current: "b",
        changedAt: NOW.toISOString(),
        redacted: false,
      });
      expect(entry.restoredFromId).toBeUndefined();
    });

    it("never keeps raw values for sensitive settings", () => {
      const entry = createHistoryEntry(
        makeDef({ sensitive: true }),
        "https://old.example/hook?token=1",
        "https://new.example/hook?token=2",
        NOW
      );
      expect(entry.redacted).toBe(true);
      expect(entry.previous).toBeNull();
      expect(entry.current).toBeNull();
      expect(JSON.stringify(entry)).not.toContain("token");
    });

    it("links a change made by a restore to its source entry", () => {
      const entry = createHistoryEntry(makeDef(), "b", "a", NOW, "source-1");
      expect(entry.restoredFromId).toBe("source-1");
    });
  });

  describe("formatHistoryValue", () => {
    it("uses the definition's formatter", () => {
      const def = makeDef({ format: (v) => v.toUpperCase() });
      expect(formatHistoryValue(def, "dark", false)).toBe("DARK");
    });

    it("shows booleans as On/Off by default", () => {
      expect(formatHistoryValue(undefined, true, false)).toBe("On");
      expect(formatHistoryValue(undefined, false, false)).toBe("Off");
    });

    it("redacts sensitive or missing values", () => {
      expect(formatHistoryValue(makeDef(), "secret", true)).toBe(REDACTED_VALUE);
      expect(formatHistoryValue(makeDef(), null, false)).toBe(REDACTED_VALUE);
    });
  });

  describe("getRestoreAvailability", () => {
    const entry = createHistoryEntry(makeDef(), "a", "b", NOW);

    it("allows restoring a valid prior value", () => {
      expect(getRestoreAvailability(makeDef(), entry)).toEqual({
        restorable: true,
      });
    });

    it("refuses sensitive entries", () => {
      const redacted = createHistoryEntry(makeDef({ sensitive: true }), "a", "b", NOW);
      expect(getRestoreAvailability(makeDef(), redacted)).toMatchObject({
        restorable: false,
        reason: "sensitive",
      });
    });

    it("refuses settings without a restore action or no longer registered", () => {
      expect(
        getRestoreAvailability(makeDef({ restore: undefined }), entry)
      ).toMatchObject({ restorable: false, reason: "unsupported" });
      expect(getRestoreAvailability(undefined, entry)).toMatchObject({
        restorable: false,
        reason: "unsupported",
      });
    });

    it("refuses values that are no longer valid", () => {
      const def = makeDef({ isValid: (v): v is string => v === "only-this" });
      expect(getRestoreAvailability(def, entry)).toMatchObject({
        restorable: false,
        reason: "invalid",
      });
    });

    it("reports when the prior value is already current", () => {
      const def = makeDef({ read: () => "a" });
      expect(getRestoreAvailability(def, entry)).toMatchObject({
        restorable: false,
        reason: "current",
      });
    });
  });
});
