import { assertEqual, assertTrue } from "./assert.js";
import { computeGapCost, computeExposure, flattenGaps } from "../js/engine/financialTranslator.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";
import {
  CATEGORY_COST_MODEL,
  SEVERITY_MULTIPLIER,
  REWORK_HOURS_MODEL,
  DEFAULT_TEAM_SPRINT_CAPACITY_HOURS,
} from "../js/config/costModel.js";

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

// NFR/HITL gaps carry a utilisation impact percentage, computed from the directly-
// authored REWORK_HOURS_MODEL — never derived from the $ cost figure (that figure can
// bundle in non-labor cost, e.g. HITL's "reputational risk" — see DECISIONS.md #12).
// A single gap, even High severity, should never approach 100% of a sprint's capacity.
const nfrGap = { gap_id: "GAP-TEST-NFR", severity_gov: "High", category_tag: "NFR" };
const nfrUtilisation = computeGapCost(nfrGap).utilisationImpactPct;
const expectedNfrUtilisation = Math.round(((REWORK_HOURS_MODEL.NFR.high / DEFAULT_TEAM_SPRINT_CAPACITY_HOURS) * 100) * 100) / 100;
assertEqual(nfrUtilisation, expectedNfrUtilisation, "High NFR gap's utilisation matches reworkHours / teamCapacity, not $/rate");
assertTrue(nfrUtilisation > 0 && nfrUtilisation < 25, "a single High NFR gap's utilisation stays well under 100% of a sprint");

const hitlGap = { gap_id: "GAP-TEST-HITL", severity_gov: "High", category_tag: "HITL" };
const hitlUtilisation = computeGapCost(hitlGap).utilisationImpactPct;
assertTrue(hitlUtilisation > 0 && hitlUtilisation < 25, "a single High HITL gap's utilisation stays well under 100% of a sprint (previously this could exceed 100%)");

const pillarGap = { gap_id: "GAP-TEST-LINEAGE", severity_gov: "High", category_tag: "Lineage" };
assertEqual(computeGapCost(pillarGap).utilisationImpactPct, undefined, "Lineage gap carries no utilisation impact percentage");

// Assumptions are adjustable: a smaller team capacity raises the utilisation %; the
// cost model scale multiplies $ bands only, never the rework-hours/utilisation calc.
const nfrWithSmallerTeam = computeGapCost(nfrGap, undefined, { teamSprintCapacityHours: 80 });
assertTrue(nfrWithSmallerTeam.utilisationImpactPct > nfrUtilisation, "a smaller team sprint capacity raises the utilisation % for the same gap");

const scaledCost = computeGapCost(piiGap, undefined, { costScale: 2 });
assertEqual(scaledCost.low, CATEGORY_COST_MODEL.PII.low * 2, "costScale multiplies the $ low estimate");
assertEqual(scaledCost.high, CATEGORY_COST_MODEL.PII.high * 2, "costScale multiplies the $ high estimate");

const scaledNfr = computeGapCost(nfrGap, undefined, { costScale: 2 });
assertEqual(scaledNfr.utilisationImpactPct, nfrUtilisation, "costScale never affects the utilisation %, only $ figures");

const otherGapForScale = { gap_id: "GAP-TEST-OTHER-SCALE", severity_gov: "High", category_tag: "Other", category_tag_freetext: "x" };
const scaledManualOther = computeGapCost(otherGapForScale, { low: 1000, high: 5000 }, { costScale: 2 });
assertEqual(scaledManualOther.low, 1000, "costScale never rescales a manually-entered Other cost");

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

// Extended tags (schema_version 1.1: Safety, AssetLifecycle, SupplyChain) cost
// correctly via the normal category lookup — not silently dumped into "Other".
const safetyGap = { gap_id: "GAP-TEST-SAFETY", severity_gov: "High", category_tag: "Safety" };
const safetyCost = computeGapCost(safetyGap);
assertEqual(safetyCost.unmodeled, false, "Safety gap is costed, not treated as unmodeled");
assertEqual(safetyCost.low, CATEGORY_COST_MODEL.Safety.low, "High Safety gap costs at the full base low");
assertEqual(safetyCost.high, CATEGORY_COST_MODEL.Safety.high, "High Safety gap costs at the full base high");

const assetGap = { gap_id: "GAP-TEST-ASSET", severity_gov: "Med", category_tag: "AssetLifecycle" };
const assetCost = computeGapCost(assetGap);
assertEqual(assetCost.low, Math.round(CATEGORY_COST_MODEL.AssetLifecycle.low * SEVERITY_MULTIPLIER.Med), "Med AssetLifecycle gap applies the Med multiplier (low)");

const supplyGap = { gap_id: "GAP-TEST-SUPPLY", severity_gov: "Low", category_tag: "SupplyChain" };
const supplyCost = computeGapCost(supplyGap);
assertEqual(supplyCost.low, Math.round(CATEGORY_COST_MODEL.SupplyChain.low * SEVERITY_MULTIPLIER.Low), "Low SupplyChain gap applies the Low multiplier (low)");

// The Water "Good" sample (schema 1.1) costs cleanly end-to-end.
const waterExposure = computeExposure(flattenGaps(VALID_SAMPLE_ASSESSMENTS.water_good));
assertEqual(waterExposure.pendingManualCostCount, 0, "water_good sample has nothing pending manual costing (no Other-tagged gaps)");
assertTrue(waterExposure.totalHigh > 0, "water_good sample produces a nonzero total exposure");

// The Energy "Good" sample includes a SupplyChain gap and costs cleanly.
const energyGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.energy_good);
assertTrue(energyGaps.some((g) => g.category_tag === "SupplyChain"), "energy_good sample includes a SupplyChain-tagged gap");
const energyExposure = computeExposure(energyGaps);
assertTrue(energyExposure.totalHigh > 0, "energy_good sample produces a nonzero total exposure");

// Probity (schema_version 1.2, Public Sector) costs via the normal category lookup too.
const probityGap = { gap_id: "GAP-TEST-PROBITY", severity_gov: "High", category_tag: "Probity" };
const probityCost = computeGapCost(probityGap);
assertEqual(probityCost.unmodeled, false, "Probity gap is costed, not treated as unmodeled");
assertEqual(probityCost.low, CATEGORY_COST_MODEL.Probity.low, "High Probity gap costs at the full base low");
assertEqual(probityCost.high, CATEGORY_COST_MODEL.Probity.high, "High Probity gap costs at the full base high");

// The Public Sector "Good" sample (schema 1.2) costs cleanly end-to-end.
const publicSectorExposure = computeExposure(flattenGaps(VALID_SAMPLE_ASSESSMENTS.public_sector_good));
assertEqual(publicSectorExposure.pendingManualCostCount, 0, "public_sector_good sample has nothing pending manual costing (no Other-tagged gaps)");
assertTrue(publicSectorExposure.totalHigh > 0, "public_sector_good sample produces a nonzero total exposure");
