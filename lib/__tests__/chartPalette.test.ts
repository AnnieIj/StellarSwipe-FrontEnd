import { COLORBLIND_SAFE_COLORS, getChartColors } from "@/lib/chartPalette";

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("chart palette", () => {
  it("keeps the default palette's fallback colors", () => {
    expect(getChartColors("default").series(0, "#123456")).toBe("#123456");
  });

  it("maps series to the color-blind-safe palette and cycles", () => {
    const colors = getChartColors("colorblind");
    expect(colors.series(0, "#123456")).toBe(COLORBLIND_SAFE_COLORS[0]);
    expect(colors.series(COLORBLIND_SAFE_COLORS.length, "#123456")).toBe(
      COLORBLIND_SAFE_COLORS[0]
    );
  });

  it("primary and secondary series are distinguishable by lightness", () => {
    const { primary, secondary } = getChartColors("colorblind");
    expect(contrast(primary, secondary)).toBeGreaterThanOrEqual(1.5);
  });

  it("primary and secondary series meet 3:1 non-text contrast on the dark background", () => {
    const { primary, secondary } = getChartColors("colorblind");
    // Primary blue is used on light surfaces; secondary orange on dark.
    expect(contrast(primary, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(contrast(secondary, "#09090b")).toBeGreaterThanOrEqual(3);
  });
});
