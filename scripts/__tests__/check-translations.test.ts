import { execSync, spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const SCRIPT = path.join(__dirname, "..", "check-translations.js");
const FIXTURE_LOCALES = path.join(__dirname, "fixtures", "locales");

/**
 * Run the check-translations script against a given locales directory.
 * Returns { exitCode, stdout, stderr }.
 */
function runScript(localesDir: string): { exitCode: number; output: string } {
  // The script reads LOCALES_DIR from __dirname relative path, so we run it
  // with a patched argument by temporarily monkey-patching via env or by
  // creating a small wrapper. Instead, we inline a minimal runner here.
  const result = spawnSync(
    process.execPath,
    ["-e", buildInlineScript(localesDir)],
    { encoding: "utf8" }
  );
  return {
    exitCode: result.status ?? 1,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}

/** Build an inline version of the script pointing at a custom locales dir. */
function buildInlineScript(localesDir: string): string {
  return `
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = ${JSON.stringify(localesDir)};
const BASE_LOCALE = "en";

function flattenKeys(obj, prefix) {
  prefix = prefix || "";
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? prefix + "." + key : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? flattenKeys(value, fullKey)
      : [fullKey];
  });
}

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch(e) { console.error("Failed to parse " + filePath + ": " + e.message); process.exit(1); }
}

const baseFile = path.join(LOCALES_DIR, BASE_LOCALE + ".json");
if (!fs.existsSync(baseFile)) { console.error("Base locale file not found: " + baseFile); process.exit(1); }

const baseKeys = new Set(flattenKeys(readJSON(baseFile)));
const localeFiles = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith(".json") && f !== BASE_LOCALE + ".json");
let hasErrors = false;

for (const file of localeFiles) {
  const locale = path.basename(file, ".json");
  const localeKeys = new Set(flattenKeys(readJSON(path.join(LOCALES_DIR, file))));
  const missing = [...baseKeys].filter(k => !localeKeys.has(k));
  if (missing.length > 0) {
    console.error('[FAIL] Locale "' + locale + '" is missing ' + missing.length + ' key(s):');
    missing.forEach(k => console.error("  - " + k));
    hasErrors = true;
  } else {
    console.log('[OK]   Locale "' + locale + '" — all ' + baseKeys.size + ' keys present.');
  }
}

if (hasErrors) { console.error("Translation check failed."); process.exit(1); }
else { console.log("All locale files are complete. No missing keys."); }
`;
}

describe("check-translations CI script", () => {
  it("exits 0 when all locale files have all base keys", () => {
    // fr.json has all keys from en.json in our fixture
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-ok-"));
    fs.cpSync(FIXTURE_LOCALES, tmpDir, { recursive: true });
    // Remove es (incomplete) so only fr (complete) remains
    fs.unlinkSync(path.join(tmpDir, "es.json"));
    const { exitCode, output } = runScript(tmpDir);
    expect(exitCode).toBe(0);
    expect(output).toContain("[OK]");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("exits 1 and reports missing keys when a locale is incomplete", () => {
    // es.json is intentionally missing common.close, header.dashboard, signals.buy_signal
    const { exitCode, output } = runScript(FIXTURE_LOCALES);
    expect(exitCode).toBe(1);
    expect(output).toContain("[FAIL]");
    expect(output).toContain("es");
  });

  it("outputs the specific missing keys in the failure message", () => {
    const { output } = runScript(FIXTURE_LOCALES);
    // es.json is missing: common.close, header.dashboard, signals.buy_signal
    expect(output).toContain("common.close");
    expect(output).toContain("header.dashboard");
    expect(output).toContain("signals.buy_signal");
  });

  it("passes for a locale that has all base keys", () => {
    const { output } = runScript(FIXTURE_LOCALES);
    // fr.json has all keys from en.json
    expect(output).toContain("[OK]");
    expect(output).toMatch(/Locale "fr" — all \d+ keys present/);
  });

  it("reports the affected locale name in the failure message", () => {
    const { output } = runScript(FIXTURE_LOCALES);
    expect(output).toMatch(/Locale "es" is missing \d+ key/);
  });
});
