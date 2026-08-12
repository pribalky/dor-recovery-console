import "./ingestion.test.js";
import "./financial.test.js";
import "./raid.test.js";
import "./export.test.js";
import { summary } from "./assert.js";

const { passCount, failCount, failures } = summary();

console.log(`\n${passCount} passed, ${failCount} failed\n`);

if (failCount > 0) {
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exit(1);
} else {
  console.log("All tests passed.");
}
