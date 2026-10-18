const fs = require("fs");
let c = fs.readFileSync(
  "services/__tests__/recommendationEngine.test.ts",
  "utf8"
);
c = c.replace(/asset: 'XLM'/g, "ticker: 'XLM'");
c = c.replace(/asset: 'BTC'/g, "ticker: 'BTC'");
c = c.replace(/timestamp: '' \}/g, "timestamp: '', source: 'explicit' }");
fs.writeFileSync("services/__tests__/recommendationEngine.test.ts", c);
