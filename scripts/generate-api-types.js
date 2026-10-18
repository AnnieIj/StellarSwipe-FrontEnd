#!/usr/bin/env node
/**
 * api:generate — regenerates lib/api-types.generated.ts from openapi.yaml
 * using openapi-typescript, then checks it matches the committed copy.
 *
 * Usage:
 *   npm run api:generate          # regenerate in-place
 *   npm run api:check             # fail if generated output differs from committed
 *
 * Add to CI:  npm run api:check
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SPEC = path.resolve(__dirname, "../openapi.yaml");
const OUT = path.resolve(__dirname, "../lib/api-types.generated.ts");
const CHECK_MODE = process.argv.includes("--check");

// Generate into a temp file
const tmp = OUT + ".tmp";

try {
  execSync(`npx --yes openapi-typescript@7 "${SPEC}" --output "${tmp}"`, {
    stdio: "inherit",
  });
} catch {
  console.error("openapi-typescript failed. Ensure the spec is valid YAML.");
  process.exit(1);
}

const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Re-generate with: npm run api:generate
 * Source: openapi.yaml
 */\n\n`;

const generated = header + fs.readFileSync(tmp, "utf8");
fs.unlinkSync(tmp);

if (CHECK_MODE) {
  const committed = fs.readFileSync(OUT, "utf8");
  if (committed !== generated) {
    console.error(
      "❌  lib/api-types.generated.ts is out of sync with openapi.yaml.\n" +
        "   Run `npm run api:generate` and commit the result."
    );
    process.exit(1);
  }
  console.log("✅  lib/api-types.generated.ts is in sync with openapi.yaml.");
} else {
  fs.writeFileSync(OUT, generated, "utf8");
  console.log("✅  lib/api-types.generated.ts updated.");
}
