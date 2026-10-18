/**
 * Unit tests for lib/dataSaver.ts (issue #408)
 *
 * Verifies the pure decision helpers that drive conditional rendering of
 * charts / animations and the image-quality choice based on the Data Saver
 * setting.
 */

import {
  shouldRenderMiniChart,
  shouldDisableDecorativeAnimation,
  getImageQuality,
  DATA_SAVER_IMAGE_QUALITY,
  DEFAULT_IMAGE_QUALITY,
} from "@/lib/dataSaver";

describe("shouldRenderMiniChart", () => {
  it("renders the mini chart when Data Saver is OFF", () => {
    expect(shouldRenderMiniChart(false)).toBe(true);
  });

  it("does NOT render the mini chart when Data Saver is ON", () => {
    expect(shouldRenderMiniChart(true)).toBe(false);
  });
});

describe("shouldDisableDecorativeAnimation", () => {
  it("keeps animations when neither reduced-motion nor Data Saver is set", () => {
    expect(shouldDisableDecorativeAnimation(false, false)).toBe(false);
  });

  it("disables animations when prefers-reduced-motion is set (existing behaviour preserved)", () => {
    expect(shouldDisableDecorativeAnimation(true, false)).toBe(true);
  });

  it("disables animations when Data Saver is set (in addition to reduced-motion)", () => {
    expect(shouldDisableDecorativeAnimation(false, true)).toBe(true);
  });

  it("disables animations when both are set", () => {
    expect(shouldDisableDecorativeAnimation(true, true)).toBe(true);
  });
});

describe("getImageQuality", () => {
  it("returns the default quality when Data Saver is OFF", () => {
    expect(getImageQuality(false)).toBe(DEFAULT_IMAGE_QUALITY);
  });

  it("returns the reduced quality when Data Saver is ON", () => {
    expect(getImageQuality(true)).toBe(DATA_SAVER_IMAGE_QUALITY);
  });

  it("Data Saver quality is lower than the default quality", () => {
    expect(DATA_SAVER_IMAGE_QUALITY).toBeLessThan(DEFAULT_IMAGE_QUALITY);
  });
});
