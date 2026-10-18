#!/usr/bin/env node
// Reads Next.js build output JSON and checks sizes against bundle-budget.json.
// Exits with code 1 if any chunk exceeds its budget + threshold.

const fs = require("fs");
const path = require("path");

const budget = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../bundle-budget.json"), "utf8")
);
const buildManifest = path.join(__dirname, "../.next/build-manifest.json");
const appBuildManifest = path.join(
  __dirname,
  "../.next/app-build-manifest.json"
);

if (!fs.existsSync(buildManifest)) {
  console.error("Build manifest not found. Run `npm run build` first.");
  process.exit(1);
}

function getFileSizeKb(filePath) {
  const full = path.join(
    __dirname,
    "../.next",
    filePath.replace(/^\/_next\//, "")
  );
  if (!fs.existsSync(full)) return 0;
  return fs.statSync(full).size / 1024;
}

const manifest = JSON.parse(fs.readFileSync(buildManifest, "utf8"));
const allFiles = Object.values(manifest.pages || {}).flat();

let totalFirstLoadKb = 0;
const seen = new Set();
for (const file of allFiles) {
  if (seen.has(file)) continue;
  seen.add(file);
  const kb = getFileSizeKb(file);
  totalFirstLoadKb += kb;
}

const checks = [{ name: "First Load JS (total)", actual: totalFirstLoadKb }];

let failed = false;
for (const check of checks) {
  const budgetEntry = budget.budgets.find((b) => b.name === check.name);
  if (!budgetEntry) continue;
  const max = budgetEntry.sizeKb * (1 + budgetEntry.threshold);
  const status = check.actual <= max ? "PASS" : "FAIL";
  if (status === "FAIL") failed = true;
  console.log(
    `[${status}] ${check.name}: ${check.actual.toFixed(1)} kB (budget: ${
      budgetEntry.sizeKb
    } kB + ${budgetEntry.threshold * 100}% = ${max.toFixed(1)} kB)`
  );
}

if (failed) {
  console.error(
    "\nBundle budget exceeded. Update bundle-budget.json with justification to accept a larger budget."
  );
  process.exit(1);
} else {
  console.log("\nAll bundle budgets passed.");
}
