const fs = require("fs");

let exportTest = fs.readFileSync("__tests__/exportComparison.test.ts", "utf8");
exportTest = exportTest.replace(/asset:/g, "ticker:");
exportTest = exportTest.replace(/id: overrides\.id,\n/g, "");
exportTest = exportTest.replace(/stats: overrides\.stats,\n/g, "");
exportTest = exportTest.replace(
  /providerName: overrides\.providerName,\n/g,
  ""
);
exportTest = exportTest.replace(
  /providerId: overrides\.providerId,\n/g,
  "provider: overrides.provider,\n"
);
exportTest = exportTest.replace(/stats: \{[^}]+\}/g, "");
exportTest = exportTest.replace(/,  \}/g, "}");
fs.writeFileSync("__tests__/exportComparison.test.ts", exportTest);

let recEngine = fs.readFileSync(
  "services/__tests__/recommendationEngine.test.ts",
  "utf8"
);
recEngine = recEngine.replace(/@\/lib\/types/g, "@/lib/api-types.generated");
recEngine = recEngine.replace(/direction:/g, "action:");
recEngine = recEngine.replace(/analysis:/g, "details:");
fs.writeFileSync("services/__tests__/recommendationEngine.test.ts", recEngine);

let sigRecs = fs.readFileSync("components/SignalRecommendations.tsx", "utf8");
sigRecs = sigRecs.replace(/@\/lib\/types/g, "@/lib/api-types.generated");
fs.writeFileSync("components/SignalRecommendations.tsx", sigRecs);
