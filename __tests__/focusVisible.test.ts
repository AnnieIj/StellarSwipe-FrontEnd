/**
 * Documented coverage for #610 — verifies the baseline focus-visible rule
 * in app/globals.css still targets every key interactive surface
 * (buttons, links, inputs, menus, tabs, custom controls) with a visible
 * outline, so a future edit can't silently drop a surface from the rule.
 */

import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.resolve(__dirname, "../app/globals.css"),
  "utf8"
);

// Isolate the baseline focus-visible selector block so we assert against
// the rule itself rather than any incidental mention of these strings
// elsewhere in the stylesheet.
function extractRuleBlock(selectorStart: string): string {
  const startIndex = css.indexOf(selectorStart);
  expect(startIndex).toBeGreaterThan(-1);
  const openBrace = css.indexOf("{", startIndex);
  const closeBrace = css.indexOf("}", openBrace);
  return css.slice(startIndex, closeBrace + 1);
}

describe("focus-visible baseline coverage (app/globals.css)", () => {
  const rule = extractRuleBlock("a:focus-visible");

  const expectedSelectors = [
    "a:focus-visible",
    "button:focus-visible",
    "input:focus-visible",
    "select:focus-visible",
    "textarea:focus-visible",
    "summary:focus-visible",
    '[tabindex]:focus-visible',
    '[role="button"]:focus-visible',
    '[role="tab"]:focus-visible',
    '[role="switch"]:focus-visible',
    '[role="checkbox"]:focus-visible',
    '[role="menuitem"]:focus-visible',
  ];

  it.each(expectedSelectors)(
    "keeps a visible focus indicator selector for %s",
    (selector) => {
      expect(rule).toContain(selector);
    }
  );

  it("applies a non-zero, visible outline", () => {
    expect(rule).toMatch(/outline:\s*2px solid/);
    expect(rule).toMatch(/outline-offset:\s*2px/);
  });

  it("keeps a forced-colors (high-contrast) fallback for focus-visible", () => {
    expect(css).toMatch(/forced-colors:\s*active/);
    expect(css).toMatch(/:focus-visible\s*{\s*outline:\s*2px solid Highlight/);
  });
});
