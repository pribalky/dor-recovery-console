import { assertEqual, assertTrue } from "./assert.js";
import { flattenGaps } from "../js/engine/financialTranslator.js";
import { computeReworkRiskScore, classifyReworkTier, escalationTextForTier } from "../js/engine/reworkRisk.js";
import { SEVERITY_POINTS, TIER_THRESHOLDS } from "../js/config/reworkRiskConfig.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

// Tier boundaries, directly against the documented thresholds.
assertEqual(classifyReworkTier(0), "Low", "score 0 classifies as Low");
assertEqual(classifyReworkTier(TIER_THRESHOLDS.medium - 1), "Low", "just below the medium threshold classifies as Low");
assertEqual(classifyReworkTier(TIER_THRESHOLDS.medium), "Medium", "exactly the medium threshold classifies as Medium");
assertEqual(classifyReworkTier(TIER_THRESHOLDS.high - 1), "Medium", "just below the high threshold classifies as Medium");
assertEqual(classifyReworkTier(TIER_THRESHOLDS.high), "High", "exactly the high threshold classifies as High");

assertTrue(Boolean(escalationTextForTier("Low")), "Low tier has escalation text");
assertTrue(Boolean(escalationTextForTier("Medium")), "Medium tier has escalation text");
assertTrue(Boolean(escalationTextForTier("High")), "High tier has escalation text");

// A fully-ready assessment scores zero.
const bestGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.best);
assertEqual(computeReworkRiskScore(bestGaps), 0, "a fully-ready assessment scores zero rework risk");
assertEqual(classifyReworkTier(computeReworkRiskScore(bestGaps)), "Low", "a fully-ready assessment classifies as Low tier");

// "good" sample: 2 Low-severity gaps -> 2 * SEVERITY_POINTS.Low.
const goodGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.good);
const goodExpected = 2 * SEVERITY_POINTS.Low;
assertEqual(computeReworkRiskScore(goodGaps), goodExpected, "the good sample's score matches a hand calculation from its 2 Low gaps");
assertEqual(classifyReworkTier(goodExpected), "Low", "the good sample classifies as Low tier");

// "intentionally_off" sample: 5 High, 2 Med, 1 Low (hand-counted from sampleExports.js).
const offGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.intentionally_off);
const offExpected = 5 * SEVERITY_POINTS.High + 2 * SEVERITY_POINTS.Med + 1 * SEVERITY_POINTS.Low;
assertEqual(computeReworkRiskScore(offGaps), offExpected, "the intentionally_off sample's score matches a hand calculation");
assertEqual(classifyReworkTier(offExpected), "High", "the intentionally_off sample's severity mix classifies as High tier");

// "very_bad" sample: all 25 items fail — 8 High, 12 Med, 5 Low (hand-counted).
const veryBadGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.very_bad);
const veryBadExpected = 8 * SEVERITY_POINTS.High + 12 * SEVERITY_POINTS.Med + 5 * SEVERITY_POINTS.Low;
assertEqual(computeReworkRiskScore(veryBadGaps), veryBadExpected, "the very_bad sample's score matches a hand calculation across all 25 gaps");
assertEqual(classifyReworkTier(veryBadExpected), "High", "the very_bad sample classifies as High tier");

// Escalation Demo pair: same feature_name, deliberately worse the second time —
// the "before" sample scores Low, the "after" sample scores High, so loading them in
// order in the app produces a real, reproducible escalation-trend demonstration.
const escBeforeGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.escalation_demo_before);
const escBeforeExpected = 1 * SEVERITY_POINTS.Med + 1 * SEVERITY_POINTS.Low;
assertEqual(computeReworkRiskScore(escBeforeGaps), escBeforeExpected, "the escalation_demo_before sample's score matches a hand calculation from its 1 Med + 1 Low gap");
assertEqual(classifyReworkTier(escBeforeExpected), "Low", "the escalation_demo_before sample classifies as Low tier");

const escAfterGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.escalation_demo_after);
const escAfterExpected = 3 * SEVERITY_POINTS.High + 1 * SEVERITY_POINTS.Med;
assertEqual(computeReworkRiskScore(escAfterGaps), escAfterExpected, "the escalation_demo_after sample's score matches a hand calculation from its 3 High + 1 Med gap");
assertEqual(classifyReworkTier(escAfterExpected), "High", "the escalation_demo_after sample classifies as High tier");
assertTrue(escAfterExpected > escBeforeExpected, "the after sample's score is strictly worse than the before sample's, so the demo actually demonstrates escalation");
