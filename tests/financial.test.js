import { assertEqual, assertTrue } from "./assert.js";
import { computeGapCost, computeExposure, flattenGaps } from "../js/engine/financialTranslator.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";
import { CATEGORY_COST_MODEL, SEVERITY_MULTIPLIER } from "../js/config/costModel.js";

// A known High-severity PII gap costs at the full base range.
const piiGap = { gap_id: "GAP-TEST-PII", severity_gov: "High", category_tag: "PII" };
const piiCost = computeGapCost(piiGap);
assertEqual(piiCost.low, CATEGORY_COST_MODEL.PII.low, "High PII gap costs at the full base low");
assertEqual(piiCost.high, CATEGORY_COST_MODEL.PII.high, "High PII gap costs at the full base high");

// A Med-severity gap scales down by the Med multiplier.
const medGap = { gap_id: "GAP-TEST-MED", severity_gov: "Med", category_tag: "Fallback" };
const medCost = computeGapCost(medGap);
assertEqual(medCost.low, Math.round(CATEGORY_COST_MODEL.Fallback.low * SEVERITY_MULTIPLIER.Med), "Med severity applies the Med multiplier (low)");
assertEqual(medCost.high, Math.round(CATEGORY_COST_MODEL.Fallback.high * SEVERITY_MULTIPLIER.Med), "Med severity applies the Med multiplier (high)");

// NFR/HITL gaps carry a utilisation impact percentage; other tags don't.
const nfrGap = { gap_id: "GAP-TEST-NFR", severity_gov: "High", category_tag: "NFR" };
assertTrue(computeGapCost(nfrGap).utilisationImpactPct > 0, "High NFR gap carries a utilisation impact percentage");

const pillarGap = { gap_id: "GAP-TEST-LINEAGE", severity_gov: "High", category_tag: "Lineage" };
assertEqual(computeGapCost(pillarGap).utilisationImpactPct, undefined, "Lineage gap carries no utilisation impact percentage");

// Other-tagged gaps are unmodeled until a manual cost is supplied.
const otherGap = { gap_id: "GAP-TEST-OTHER", severity_gov: "High", category_tag: "Other", category_tag_freetext: "Something novel" };
assertTrue(computeGapCost(otherGap).unmodeled, "Other-tagged gap is unmodeled with no manual cost supplied");
const otherCostAfter = computeGapCost(otherGap, { low: 1000, high: 5000 });
assertEqual(otherCostAfter.unmodeled, false, "Other-tagged gap is no longer unmodeled once a manual cost is supplied");
assertEqual(otherCostAfter.low, 1000, "manual low cost is used as-is");

// The very_bad sample (25 gaps, every category tag represented) totals correctly and
// excludes its single Other gap from the total until manually costed.
const veryBadGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.very_bad);
const exposure = computeExposure(veryBadGaps);
assertEqual(exposure.pendingManualCostCount, 1, "very_bad sample has exactly 1 gap pending manual costing (its Other-tagged gap)");
assertTrue(exposure.totalHigh > 0, "very_bad sample produces a nonzero total exposure");
assertTrue(exposure.utilisationImpactPct > 0, "very_bad sample produces a nonzero utilisation impact (NFR + HITL gaps present)");

// The best sample has zero gaps and therefore zero exposure.
const bestExposure = computeExposure(flattenGaps(VALID_SAMPLE_ASSESSMENTS.best));
assertEqual(bestExposure.totalLow, 0, "fully-ready sample has zero exposure (low)");
assertEqual(bestExposure.totalHigh, 0, "fully-ready sample has zero exposure (high)");
assertEqual(bestExposure.pendingManualCostCount, 0, "fully-ready sample has nothing pending manual costing");
