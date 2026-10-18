import { SETTINGS_INDEX, searchSettings } from "@/lib/settingsSearch";

describe("searchSettings", () => {
  it("matches settings by label and identifies their section", () => {
    const [first] = searchSettings("currency");
    expect(first).toMatchObject({
      id: "setting-currency",
      section: "Currency",
      sectionId: "prefs-currency",
    });
  });

  it("matches by keyword", () => {
    const ids = searchSettings("dark").map((r) => r.id);
    expect(ids).toContain("setting-theme");
  });

  it("ranks label matches ahead of keyword-only matches", () => {
    const ids = searchSettings("contrast").map((r) => r.id);
    expect(ids[0]).toBe("setting-high-contrast");
  });

  it("requires every term to match", () => {
    expect(searchSettings("theme currency")).toEqual([]);
  });

  it("returns no results for an unknown term", () => {
    expect(searchSettings("zzz-not-a-setting")).toEqual([]);
  });

  it("returns no results for a cleared query", () => {
    expect(searchSettings("   ")).toEqual([]);
  });

  it("uses unique DOM ids for every entry", () => {
    const ids = SETTINGS_INDEX.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
