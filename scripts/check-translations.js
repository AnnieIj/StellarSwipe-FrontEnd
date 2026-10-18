#!/usr/bin/env node
/**
 * CI script: diffs all locale files against the base (en) locale's key set.
 * Exits with code 1 and prints missing keys/locales if any gaps are found.
 *
 * Usage:  node scripts/check-translations.js
 */

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "public", "locales");
const BASE_LOCALE = "en";

/** Recursively collect all dot-notation keys from an object */
function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? flattenKeys(value, fullKey)
      : [fullKey];
  });
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Failed to parse ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

const baseFile = path.join(LOCALES_DIR, `${BASE_LOCALE}.json`);
if (!fs.existsSync(baseFile)) {
  console.error(`Base locale file not found: ${baseFile}`);
  process.exit(1);
}

const baseKeys = new Set(flattenKeys(readJSON(baseFile)));
const localeFiles = fs
  .readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith(".json") && f !== `${BASE_LOCALE}.json`);

let hasErrors = false;

for (const file of localeFiles) {
  const locale = path.basename(file, ".json");
  const localeKeys = new Set(
    flattenKeys(readJSON(path.join(LOCALES_DIR, file)))
  );
  const missing = [...baseKeys].filter((k) => !localeKeys.has(k));

  if (missing.length > 0) {
    console.error(
      `\n[FAIL] Locale "${locale}" is missing ${missing.length} key(s):`
    );
    missing.forEach((k) => console.error(`  - ${k}`));
    hasErrors = true;
  } else {
    console.log(
      `[OK]   Locale "${locale}" — all ${baseKeys.size} keys present.`
    );
  }
}

if (hasErrors) {
  console.error(
    "\nTranslation check failed. Add the missing keys to the locale files above."
  );
  process.exit(1);
} else {
  console.log("\nAll locale files are complete. No missing keys.");
}
