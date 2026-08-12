import { KNOWN_CATEGORY_TAGS } from "../config/costModel.js";

const REQUIRED_TOP_FIELDS = [
  "schema_version",
  "assessment_id",
  "assessment_date",
  "feature_name",
  "overall_score",
  "gate_decision",
  "pillars",
];
const VALID_GATE_DECISIONS = new Set(["APPROVED", "CONDITIONAL", "BLOCKED"]);
const SUPPORTED_SCHEMA_VERSION = "1.0";

export function parseAssessmentJson(text) {
  try {
    return { data: JSON.parse(text), error: null };
  } catch (e) {
    return { data: null, error: `Malformed JSON: ${e.message}` };
  }
}

// Collects every violation rather than stopping at the first, per PRD §5
// ("explicit error messaging, not silent failure").
export function validateAssessment(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return ["Export is not a JSON object."];
  }

  const errors = [];

  for (const field of REQUIRED_TOP_FIELDS) {
    if (!(field in data)) errors.push(`Missing required field: "${field}".`);
  }

  if ("schema_version" in data && data.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    errors.push(`Unsupported schema_version "${data.schema_version}" (expected "${SUPPORTED_SCHEMA_VERSION}").`);
  }

  if ("gate_decision" in data && !VALID_GATE_DECISIONS.has(data.gate_decision)) {
    errors.push(`Invalid gate_decision "${data.gate_decision}" (expected APPROVED, CONDITIONAL, or BLOCKED).`);
  }

  if (Array.isArray(data.pillars)) {
    for (const pillar of data.pillars) {
      for (const gap of pillar.gaps ?? []) {
        const gapLabel = gap.gap_id ?? "(unknown id)";
        if (!KNOWN_CATEGORY_TAGS.has(gap.category_tag)) {
          errors.push(`Gap ${gapLabel} has an unrecognised category_tag "${gap.category_tag}".`);
        } else if (gap.category_tag === "Other" && !gap.category_tag_freetext) {
          errors.push(`Gap ${gapLabel} is tagged "Other" but is missing category_tag_freetext.`);
        }
      }
    }
  }

  return errors;
}

export function ingestAssessment(text) {
  const { data, error } = parseAssessmentJson(text);
  if (error) return { assessment: null, errors: [error] };

  const errors = validateAssessment(data);
  if (errors.length > 0) return { assessment: null, errors };

  return { assessment: data, errors: [] };
}
