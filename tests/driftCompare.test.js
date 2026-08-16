import { assertEqual, assertTrue } from "./assert.js";
import { compareGapSets } from "../js/engine/driftCompare.js";

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
