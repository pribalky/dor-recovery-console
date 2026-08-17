import "./ingestion.test.js";
import "./financial.test.js";
import "./raid.test.js";
import "./export.test.js";
import "./nfrGateway.test.js";
import "./reworkRisk.test.js";
import "./adrExport.test.js";
import "./driftCompare.test.js";
import "./deepLink.test.js";
import "./thresholdSignals.test.js";
import "./escapeHtml.test.js";
import { summary } from "./assert.js";

const { passCount, failCount, failures } = summary();

console.log(`\n${passCount} passed, ${failCount} failed\n`);

if (failCount > 0) {
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
} else {
  console.log("All tests passed.");
}
