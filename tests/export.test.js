import { assertEqual, assertTrue } from "./assert.js";
import { flattenGaps, computeExposure } from "../js/engine/financialTranslator.js";
import { seedRaidFromGaps, createManualEntry } from "../js/engine/raid.js";
import { buildMarkdownExport, buildRecoveryPlan, slugify, exportFilenameMd } from "../js/export/markdownExport.js";
import { buildExecutiveHealthCard, buildHealthCardData, exportFilenameHealthCard } from "../js/export/executiveHealthCard.js";
import { interventionFor } from "../js/config/interventionMap.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

const gappyAssessment = VALID_SAMPLE_ASSESSMENTS.intentionally_off;
const gaps = flattenGaps(gappyAssessment);
const exposure = computeExposure(gaps);
const raidEntries = seedRaidFromGaps(gaps, "2026-01-01");
raidEntries.push(
  createManualEntry(
    { type: "A", description: "Assume vendor SLA holds", status: "Mitigating", escalationLevel: "Programme", dateRaised: "2026-01-01" },
    "raid-manual-1"
  )
);

const recoverySteps = buildRecoveryPlan(gappyAssessment, exposure);
assertTrue(recoverySteps.length > 0, "recovery plan produces at least one step for a gappy assessment");
assertTrue(recoverySteps.some((s) => s.includes("Re-run App 1 assessment")), "recovery plan always includes the re-run App 1 step");
assertTrue(recoverySteps[0].includes("High severity_gov"), "recovery plan leads with the High severity_gov gaps when present");

const cleanExposure = computeExposure(flattenGaps(VALID_SAMPLE_ASSESSMENTS.best));
const cleanSteps = buildRecoveryPlan(VALID_SAMPLE_ASSESSMENTS.best, cleanExposure);
assertEqual(cleanSteps.length, 1, "a fully-ready assessment gets a single sign-off recovery step");
assertTrue(cleanSteps[0].includes("No gaps remain"), "the sign-off step says no gaps remain");

const md = buildMarkdownExport(gappyAssessment, exposure, raidEntries);
assertTrue(md.includes("Recovery Plan"), "markdown export includes the Recovery Plan section");
assertTrue(md.includes("RAID Summary"), "markdown export includes the RAID Summary section");
assertTrue(md.includes("Top Exposure Gaps"), "markdown export includes the Top Exposure Gaps section");
assertTrue(md.includes(gappyAssessment.feature_name), "markdown export includes the feature name");
assertTrue(md.includes(gappyAssessment.gate_decision), "markdown export includes the gate decision");

assertEqual(slugify("Customer Support Chatbot!"), "customer-support-chatbot", "slugify lowercases and hyphenates");
assertEqual(
  exportFilenameMd("Customer Support Chatbot", "abc-123"),
  "customer-support-chatbot_abc-123_recovery_brief.md",
  "export filename leads with the slugified feature name, then assessment_id"
);

// Executive Strategy-to-Execution Health Card — reuses the same exposure/RAID data,
// different presentation aimed at decision-ready executive language.
const healthCard = buildExecutiveHealthCard(gappyAssessment, exposure, raidEntries);
assertTrue(healthCard.includes("Strategy-to-Execution Health Card"), "health card includes its title");
assertTrue(healthCard.includes("TOM Feasibility Score"), "health card includes the TOM Feasibility Score line");
assertTrue(healthCard.includes("Top 3 Root Causes of Operational Rework"), "health card includes the root causes section");
assertTrue(healthCard.includes("Recommended Executive Actions & Governance Interventions"), "health card includes the interventions section");
assertTrue(healthCard.includes(gappyAssessment.feature_name), "health card includes the feature name");

const cleanRaid = seedRaidFromGaps([], "2026-01-01");
const cleanHealthCard = buildExecutiveHealthCard(VALID_SAMPLE_ASSESSMENTS.best, cleanExposure, cleanRaid);
assertTrue(cleanHealthCard.includes("tracking to plan"), "a fully-ready assessment's health card reports no material root causes");
assertTrue(cleanHealthCard.includes("No governance escalation required"), "a fully-ready assessment's health card requires no escalation");

assertEqual(interventionFor("Safety"), "Convene Safety Case Review Board", "Safety gaps map to a safety-case-specific intervention");
assertEqual(interventionFor("PII"), "Escalate to Data Protection Officer / Privacy Office", "PII gaps map to a privacy-specific intervention");
assertEqual(interventionFor("NotARealTag"), interventionFor("Other"), "an unmapped/unknown tag falls back to the same default as Other");

assertEqual(
  exportFilenameHealthCard("Customer Support Chatbot", "abc-123"),
  "customer-support-chatbot_abc-123_health_card.md",
  "health card filename leads with the slugified feature name, then assessment_id"
);

// buildHealthCardData is the single source of truth consumed by both the Markdown
// export above and the on-screen preview (renderHealthCardPreview) — confirm its
// shape matches what the Markdown export reflects, so the two can't silently diverge.
const healthCardData = buildHealthCardData(gappyAssessment, exposure, raidEntries);
assertEqual(healthCardData.featureName, gappyAssessment.feature_name, "health card data carries the feature name");
assertEqual(healthCardData.gateDecision, gappyAssessment.gate_decision, "health card data carries the gate decision");
assertEqual(healthCardData.rootCauses.length, Math.min(3, exposure.gaps.filter((g) => !g.cost.unmodeled).length), "health card data's root causes match the same top-3-by-exposure logic as the Markdown export");
assertEqual(healthCardData.interventions.length, healthCardData.rootCauses.length, "health card data has one intervention per root cause");
assertTrue(Array.isArray(healthCardData.escalationItems), "health card data exposes escalationItems as an array");
