import { assertEqual, assertTrue } from "./assert.js";
import { flattenGaps } from "../js/engine/financialTranslator.js";
import { deriveComplianceCoverage } from "../js/engine/complianceCoverage.js";
import { NIST_RMF_FUNCTIONS } from "../js/config/nistRmfMap.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

// End-to-end against the "very_bad" sample: hand-verified category_tag mix (per
// sampleExports.js) is Lineage x5, NFR x8, Other x1, PII x3, HITL x1, Consent x2,
// Fallback x3, RateLimit x2 — every NIST function is touched by at least one tag,
// and exactly the 1 "Other" gap is unmapped.
const veryBadGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.very_bad);
const veryBadCoverage = deriveComplianceCoverage(veryBadGaps);

assertEqual(veryBadCoverage.totalGaps, veryBadGaps.length, "totalGaps matches the input gap count");
assertEqual(veryBadCoverage.functionsTouched, NIST_RMF_FUNCTIONS, "the very_bad sample's gaps touch all 4 NIST AI RMF functions");
assertEqual(veryBadCoverage.unmappedCount, 1, "exactly the 1 Other-tagged gap is unmapped");

// A clean, fully-ready assessment has no gaps at all — degrades to an honest "nothing
// to report," not an error.
const cleanGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.best);
const cleanCoverage = deriveComplianceCoverage(cleanGaps);
assertEqual(cleanCoverage.totalGaps, 0, "a fully-ready assessment has zero gaps");
assertEqual(cleanCoverage.functionsTouched, [], "a fully-ready assessment touches zero NIST functions");
assertEqual(cleanCoverage.unmappedCount, 0, "a fully-ready assessment has zero unmapped gaps");

// A single-tag input touches exactly its mapped function(s), nothing more.
const singleFallback = deriveComplianceCoverage([{ category_tag: "Fallback" }]);
assertEqual(singleFallback.functionsTouched, ["Manage"], "a single Fallback gap touches only Manage");

const singlePii = deriveComplianceCoverage([{ category_tag: "PII" }]);
assertEqual(singlePii.functionsTouched, ["Map", "Manage"], "a single PII gap touches Map and Manage, in NIST_RMF_FUNCTIONS order");

// totalFunctions is always 4, regardless of how many are actually touched.
assertTrue(veryBadCoverage.totalFunctions === 4 && cleanCoverage.totalFunctions === 4, "totalFunctions is always the fixed count of 4 NIST AI RMF functions");
