import { assertEqual, assertTrue } from "./assert.js";
import { compareGapSets } from "../js/engine/driftCompare.js";
import { flattenGaps } from "../js/engine/financialTranslator.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

const baselineGaps = [
  { gap_id: "GAP-A", description: "GDPR requirements confirmed", severity_gov: "High", category_tag: "PII" },
  { gap_id: "GAP-B", description: "Consent mechanism defined", severity_gov: "Med", category_tag: "Consent" },
  { gap_id: "GAP-C", description: "Rate limiting configured", severity_gov: "Low", category_tag: "RateLimit" },
];

// Current: GAP-A resolved (dropped), GAP-B severity escalated, GAP-C unchanged,
// GAP-D is newly introduced.
const currentGaps = [
  { gap_id: "GAP-B", description: "Consent mechanism defined", severity_gov: "High", category_tag: "Consent" },
  { gap_id: "GAP-C", description: "Rate limiting configured", severity_gov: "Low", category_tag: "RateLimit" },
  { gap_id: "GAP-D", description: "Fallback behaviour defined", severity_gov: "High", category_tag: "Fallback" },
];

const drift = compareGapSets(baselineGaps, currentGaps);

assertEqual(drift.newGaps.length, 1, "exactly 1 new gap since baseline");
assertEqual(drift.newGaps[0].gap_id, "GAP-D", "the new gap is the one absent from baseline");

assertEqual(drift.resolvedGaps.length, 1, "exactly 1 gap resolved since baseline");
assertEqual(drift.resolvedGaps[0].gap_id, "GAP-A", "the resolved gap is the one absent from current");

assertEqual(drift.severityChanged.length, 1, "exactly 1 gap changed severity");
assertEqual(drift.severityChanged[0].gap_id, "GAP-B", "the changed gap is GAP-B");
assertEqual(drift.severityChanged[0].from, "Med", "severity change records the baseline severity");
assertEqual(drift.severityChanged[0].to, "High", "severity change records the current severity");

// Identical gap sets produce no drift in any category.
const noDrift = compareGapSets(baselineGaps, baselineGaps);
assertEqual(noDrift.newGaps.length, 0, "identical gap sets produce zero new gaps");
assertEqual(noDrift.resolvedGaps.length, 0, "identical gap sets produce zero resolved gaps");
assertEqual(noDrift.severityChanged.length, 0, "identical gap sets produce zero severity changes");

// Empty baseline: everything in current is "new".
const fromEmpty = compareGapSets([], currentGaps);
assertEqual(fromEmpty.newGaps.length, currentGaps.length, "an empty baseline treats every current gap as new");
assertEqual(fromEmpty.resolvedGaps.length, 0, "an empty baseline has nothing to resolve");

// Empty current: everything in baseline is "resolved".
const toEmpty = compareGapSets(baselineGaps, []);
assertEqual(toEmpty.resolvedGaps.length, baselineGaps.length, "an empty current export resolves every baseline gap");
assertEqual(toEmpty.newGaps.length, 0, "an empty current export introduces no new gaps");

// The bundled Baseline Drift Demo pair — hand-verified so the dropdown's demo is
// provably correct, same discipline as every other sample in this suite.
const demoDrift = compareGapSets(
  flattenGaps(VALID_SAMPLE_ASSESSMENTS.drift_demo_baseline),
  flattenGaps(VALID_SAMPLE_ASSESSMENTS.drift_demo_current)
);
assertEqual(demoDrift.newGaps.length, 2, "the demo pair introduces exactly 2 new gaps");
assertTrue(
  demoDrift.newGaps.every((g) => ["GAP-DRIFT-4", "GAP-DRIFT-5"].includes(g.gap_id)),
  "the demo pair's new gaps are GAP-DRIFT-4 and GAP-DRIFT-5"
);
assertEqual(demoDrift.resolvedGaps.length, 1, "the demo pair resolves exactly 1 gap");
assertEqual(demoDrift.resolvedGaps[0].gap_id, "GAP-DRIFT-1", "the demo pair's resolved gap is GAP-DRIFT-1");
assertEqual(demoDrift.severityChanged.length, 1, "the demo pair changes exactly 1 gap's severity");
assertEqual(demoDrift.severityChanged[0].gap_id, "GAP-DRIFT-2", "the demo pair's severity-changed gap is GAP-DRIFT-2");
assertEqual(demoDrift.severityChanged[0].from, "High", "the demo pair's severity change starts at High");
assertEqual(demoDrift.severityChanged[0].to, "Med", "the demo pair's severity change improves to Med");
