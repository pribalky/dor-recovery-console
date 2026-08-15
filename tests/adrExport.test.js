import { assertEqual, assertTrue } from "./assert.js";
import { flattenGaps, computeExposure } from "../js/engine/financialTranslator.js";
import { buildAdrDraft, exportFilenameAdr } from "../js/export/adrExport.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

const gappyAssessment = VALID_SAMPLE_ASSESSMENTS.intentionally_off;
const exposure = computeExposure(flattenGaps(gappyAssessment));
const adr = buildAdrDraft(gappyAssessment, exposure);

assertTrue(adr.includes(`# ADR: ${gappyAssessment.feature_name}`), "ADR title includes the feature name");
assertTrue(adr.includes("## Status"), "ADR includes the Status section");
assertTrue(adr.includes("## Context"), "ADR includes the Context section");
assertTrue(adr.includes("## Decision"), "ADR includes the Decision section");
assertTrue(adr.includes("## Consequences"), "ADR includes the Consequences section");
assertTrue(adr.includes(gappyAssessment.gate_decision), "ADR Status section includes the gate decision");
assertTrue(adr.includes(`$${exposure.totalLow.toLocaleString()}`), "ADR Consequences section includes the total exposure figure");

// A fully-ready assessment still produces all 4 sections, degrading gracefully.
const cleanAssessment = VALID_SAMPLE_ASSESSMENTS.best;
const cleanExposure = computeExposure(flattenGaps(cleanAssessment));
const cleanAdr = buildAdrDraft(cleanAssessment, cleanExposure);
assertTrue(cleanAdr.includes("## Context"), "a fully-ready assessment's ADR still includes the Context section");
assertTrue(cleanAdr.includes("No material gaps"), "a fully-ready assessment's ADR Context says so explicitly");

assertEqual(
  exportFilenameAdr("Customer Support Chatbot", "abc-123"),
  "customer-support-chatbot_abc-123_adr_draft.md",
  "ADR filename is slugified feature name + assessment_id"
);
