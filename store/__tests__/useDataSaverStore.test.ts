/**
 * Unit tests for store/useDataSaverStore.ts (issue #408)
 *
 * Tests cover:
 *  - Default state (disabled)
 *  - setDataSaverEnabled action
 *  - toggleDataSaver action
 *  - isDataSaverEnabled non-hook accessor
 */

import {
  useDataSaverStore,
  isDataSaverEnabled,
} from "@/store/useDataSaverStore";

// Reset to a known state before each test so tests are isolated.
beforeEach(() => {
  useDataSaverStore.getState().setDataSaverEnabled(false);
});

describe("useDataSaverStore – default state", () => {
  it("is disabled by default", () => {
    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(false);
  });
});

describe("useDataSaverStore – setDataSaverEnabled", () => {
  it("enables Data Saver mode", () => {
    useDataSaverStore.getState().setDataSaverEnabled(true);
    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(true);
  });

  it("disables Data Saver mode", () => {
    useDataSaverStore.getState().setDataSaverEnabled(true);
    useDataSaverStore.getState().setDataSaverEnabled(false);
    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(false);
  });
});

describe("useDataSaverStore – toggleDataSaver", () => {
  it("flips disabled → enabled", () => {
    useDataSaverStore.getState().toggleDataSaver();
    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(true);
  });

  it("flips enabled → disabled", () => {
    useDataSaverStore.getState().setDataSaverEnabled(true);
    useDataSaverStore.getState().toggleDataSaver();
    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(false);
  });

  it("returns to the original state after two toggles", () => {
    useDataSaverStore.getState().toggleDataSaver();
    useDataSaverStore.getState().toggleDataSaver();
    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(false);
  });
});

describe("isDataSaverEnabled – non-hook accessor", () => {
  it("reflects the current store value", () => {
    expect(isDataSaverEnabled()).toBe(false);
    useDataSaverStore.getState().setDataSaverEnabled(true);
    expect(isDataSaverEnabled()).toBe(true);
  });
});
