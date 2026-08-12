import { assertEqual, assertTrue } from "./assert.js";
import { flattenGaps, computeExposure } from "../js/engine/financialTranslator.js";
import { seedRaidFromGaps, createManualEntry } from "../js/engine/raid.js";
import { buildMarkdownExport, buildRecoveryPlan, slugify, exportFilenameMd } from "../js/export/markdownExport.js";
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
