import { assertEqual, assertTrue } from "./assert.js";
import { flattenGaps, computeExposure } from "../js/engine/financialTranslator.js";
import { rollupByGateway } from "../js/engine/nfrGateway.js";
import { gatewayFor, NFR_GATEWAYS } from "../js/config/nfrGatewayMap.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

assertEqual(gatewayFor("Fallback"), "Resilience & Failure Mode", "Fallback maps to Resilience & Failure Mode");
assertEqual(gatewayFor("Safety"), "Resilience & Failure Mode", "Safety maps to Resilience & Failure Mode");
assertEqual(gatewayFor("AssetLifecycle"), "Resilience & Failure Mode", "AssetLifecycle maps to Resilience & Failure Mode");
assertEqual(gatewayFor("SupplyChain"), "Resilience & Failure Mode", "SupplyChain maps to Resilience & Failure Mode");
assertEqual(gatewayFor("RateLimit"), "Cost & Resource Limit", "RateLimit maps to Cost & Resource Limit");
assertEqual(gatewayFor("PII"), "Security & OWASP", "PII maps to Security & OWASP");
assertEqual(gatewayFor("Consent"), "Security & OWASP", "Consent maps to Security & OWASP");
assertEqual(gatewayFor("HITL"), "Security & OWASP", "HITL maps to Security & OWASP");
assertEqual(gatewayFor("Other"), "Security & OWASP", "Other maps to Security & OWASP");
assertEqual(gatewayFor("NFR"), "Performance & Scale", "NFR maps to Performance & Scale");
assertEqual(gatewayFor("Lineage"), null, "Lineage is intentionally unmapped");
assertEqual(gatewayFor("Probity"), null, "Probity is intentionally unmapped");

// End-to-end against the "very_bad" sample: hand-verified gap-to-gateway mix.
const veryBadGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.very_bad);
const veryBadExposure = computeExposure(veryBadGaps);
const rollup = rollupByGateway(veryBadExposure);

const expectedGapCount = veryBadGaps.length;
const summedGapCount =
  Object.values(rollup.byGateway).reduce((sum, g) => sum + g.gapCount, 0) + rollup.unmappedCount;
assertEqual(summedGapCount, expectedGapCount, "every gap is accounted for across the 4 gateways plus the unmapped count");

for (const gateway of NFR_GATEWAYS) {
  assertTrue(gateway in rollup.byGateway, `rollup includes the ${gateway} gateway even if its gap count is zero`);
}

// Lineage gaps in "very_bad" (5 of them, per sampleExports.js) fall into unmappedCount.
const lineageGapCount = veryBadGaps.filter((g) => g.category_tag === "Lineage").length;
assertTrue(lineageGapCount > 0, "the very_bad sample has at least one Lineage gap to prove the unmapped path");
assertTrue(rollup.unmappedCount >= lineageGapCount, "unmapped count includes at least the Lineage gaps");

// A clean assessment produces all-zero rollups, not an error.
const cleanRollup = rollupByGateway(computeExposure(flattenGaps(VALID_SAMPLE_ASSESSMENTS.best)));
for (const gateway of NFR_GATEWAYS) {
  assertEqual(cleanRollup.byGateway[gateway].gapCount, 0, `${gateway} has zero gaps for a fully-ready assessment`);
}
assertEqual(cleanRollup.unmappedCount, 0, "a fully-ready assessment has zero unmapped gaps");
