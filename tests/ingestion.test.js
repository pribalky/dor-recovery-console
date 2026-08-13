import { assertEqual, assertTrue } from "./assert.js";
import { ingestAssessment } from "../js/ingestion/validate.js";
import { SAMPLE_EXPORTS } from "../js/config/sampleExports.js";

for (const id of ["best", "good", "intentionally_off", "very_bad", "water_good", "energy_good"]) {
  const sample = SAMPLE_EXPORTS.find((s) => s.id === id);
  const { assessment, errors } = ingestAssessment(sample.raw);
  assertEqual(errors.length, 0, `valid sample "${id}" ingests with no errors`);
  assertTrue(Boolean(assessment), `valid sample "${id}" produces an assessment object`);
}

// schema_version "1.1" samples (Water/Energy) ingest cleanly alongside "1.0" ones —
// backward compatibility, not a breaking bump.
const waterGood = SAMPLE_EXPORTS.find((s) => s.id === "water_good");
const { assessment: waterAssessment, errors: waterErrors } = ingestAssessment(waterGood.raw);
assertEqual(waterErrors.length, 0, "schema_version 1.1 sample ingests with no errors");
assertEqual(waterAssessment.schema_version, "1.1", "ingested assessment carries schema_version 1.1");

const malformed = SAMPLE_EXPORTS.find((s) => s.id === "malformed");
const malformedResult = ingestAssessment(malformed.raw);
assertEqual(malformedResult.assessment, null, "malformed sample produces no assessment");
assertTrue(
  malformedResult.errors.length === 1 && malformedResult.errors[0].startsWith("Malformed JSON"),
  "malformed sample reports a parse error"
);

const schemaInvalid = SAMPLE_EXPORTS.find((s) => s.id === "schema_invalid");
const invalidResult = ingestAssessment(schemaInvalid.raw);
assertEqual(invalidResult.assessment, null, "schema-invalid sample produces no assessment");
assertTrue(invalidResult.errors.some((e) => e.includes("schema_version")), "schema-invalid sample flags the schema_version mismatch");
assertTrue(invalidResult.errors.some((e) => e.includes("gate_decision")), "schema-invalid sample flags the missing gate_decision");
assertTrue(invalidResult.errors.some((e) => e.includes("category_tag_freetext")), "schema-invalid sample flags the missing category_tag_freetext");
assertTrue(invalidResult.errors.some((e) => e.includes("unrecognised category_tag")), "schema-invalid sample flags the unknown category_tag");
