import { assertEqual, assertTrue } from "./assert.js";
import { ingestAssessment } from "../js/ingestion/validate.js";
import { SAMPLE_EXPORTS } from "../js/config/sampleExports.js";

for (const id of [
  "best",
  "good",
  "intentionally_off",
  "very_bad",
  "water_good",
  "energy_good",
  "public_sector_good",
  "escalation_demo_before",
  "escalation_demo_after",
  "drift_demo_baseline",
  "drift_demo_current",
]) {
  const sample = SAMPLE_EXPORTS.find((s) => s.id === id);
  const { assessment, errors } = ingestAssessment(sample.raw);
  assertEqual(errors.length, 0, `valid sample "${id}" ingests with no errors`);
  assertTrue(Boolean(assessment), `valid sample "${id}" produces an assessment object`);
}

// schema_version "1.1" and "1.2" samples ingest cleanly alongside "1.0" ones —
// progressive, backward-compatible extension, not a breaking bump each time.
const waterGood = SAMPLE_EXPORTS.find((s) => s.id === "water_good");
const { assessment: waterAssessment, errors: waterErrors } = ingestAssessment(waterGood.raw);
assertEqual(waterErrors.length, 0, "schema_version 1.1 sample ingests with no errors");
assertEqual(waterAssessment.schema_version, "1.1", "ingested assessment carries schema_version 1.1");

const publicSectorGood = SAMPLE_EXPORTS.find((s) => s.id === "public_sector_good");
const { assessment: publicSectorAssessment, errors: publicSectorErrors } = ingestAssessment(publicSectorGood.raw);
assertEqual(publicSectorErrors.length, 0, "schema_version 1.2 sample ingests with no errors");
assertEqual(publicSectorAssessment.schema_version, "1.2", "ingested assessment carries schema_version 1.2");

const malformed = SAMPLE_EXPORTS.find((s) => s.id === "malformed");
const malformedResult = ingestAssessment(malformed.raw);
assertEqual(malformedResult.assessment, null, "malformed sample produces no assessment");
assertTrue(
  malformedResult.errors.length === 1 && malformedResult.errors[0].startsWith("Malformed JSON"),
  "malformed sample reports a parse error"
);

const badSeverity = JSON.stringify({
  schema_version: "1.0",
  assessment_id: "test-bad-severity",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Test Feature",
  overall_score: 50,
  gate_decision: "CONDITIONAL",
  pillars: [
    {
      pillar_name: "Test Pillar",
      gaps: [{ gap_id: "GAP-1", category_tag: "PII", severity_gov: "Critical", description: "x", remediation: "x" }],
    },
  ],
});
const badSeverityResult = ingestAssessment(badSeverity);
assertEqual(badSeverityResult.assessment, null, "an invalid severity_gov produces no assessment");
assertTrue(
  badSeverityResult.errors.some((e) => e.includes('invalid severity_gov "Critical"')),
  "an invalid severity_gov is rejected with a specific message"
);

const schemaInvalid = SAMPLE_EXPORTS.find((s) => s.id === "schema_invalid");
const invalidResult = ingestAssessment(schemaInvalid.raw);
assertEqual(invalidResult.assessment, null, "schema-invalid sample produces no assessment");
assertTrue(invalidResult.errors.some((e) => e.includes("schema_version")), "schema-invalid sample flags the schema_version mismatch");
assertTrue(invalidResult.errors.some((e) => e.includes("gate_decision")), "schema-invalid sample flags the missing gate_decision");
assertTrue(invalidResult.errors.some((e) => e.includes("category_tag_freetext")), "schema-invalid sample flags the missing category_tag_freetext");
assertTrue(invalidResult.errors.some((e) => e.includes("unrecognised category_tag")), "schema-invalid sample flags the unknown category_tag");
