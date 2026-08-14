// Bundled sample App 1 exports for the "load a sample export" dropdown. The 4 valid
// ones mirror dor-gatekeeper's own Best/Good/Intentionally Off/Very Bad samples (same
// 25-item checklist, same answers) so the financial/RAID/exec-summary modules exercise
// realistic, varied input. 2 are deliberately invalid, to exercise the explicit
// ingestion-rejection paths required by the PRD. Every fixture here is also asserted
// against directly in tests/ingestion.test.js — the dropdown is provably correct.

const bestExport = {
  schema_version: "1.0",
  assessment_id: "sample-best-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Fully Ready Feature",
  overall_score: 100,
  gate_decision: "APPROVED",
  pillars: [
    { pillar_name: "Architectural & Data Lineage Feasibility", pillar_score: 100, gaps: [] },
    { pillar_name: "Responsible AI & Safety Assurance", pillar_score: 100, gaps: [] },
    { pillar_name: "Data Governance & Regulatory Compliance", pillar_score: 100, gaps: [] },
    { pillar_name: "Operational Readiness & Resilience", pillar_score: 100, gaps: [] },
    { pillar_name: "Definition of Ready Completeness", pillar_score: 100, gaps: [] },
  ],
};

const goodExport = {
  schema_version: "1.0",
  assessment_id: "sample-good-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Minor Gaps Feature",
  overall_score: 96.5,
  gate_decision: "APPROVED",
  pillars: [
    {
      pillar_name: "Architectural & Data Lineage Feasibility",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-P1-5", description: "Schema change / rollback strategy defined", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    { pillar_name: "Responsible AI & Safety Assurance", pillar_score: 100, gaps: [] },
    { pillar_name: "Data Governance & Regulatory Compliance", pillar_score: 100, gaps: [] },
    { pillar_name: "Operational Readiness & Resilience", pillar_score: 100, gaps: [] },
    {
      pillar_name: "Definition of Ready Completeness",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-P5-5", description: "Story sized / estimated by team", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
  ],
};

const intentionallyOffExport = {
  schema_version: "1.0",
  assessment_id: "sample-intentionally-off-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Borderline Feature",
  overall_score: 76,
  gate_decision: "CONDITIONAL",
  pillars: [
    {
      pillar_name: "Architectural & Data Lineage Feasibility",
      pillar_score: 70,
      gaps: [
        { gap_id: "GAP-P1-3", description: "State management & data retention policy defined", severity_gov: "High", category_tag: "Lineage" },
        { gap_id: "GAP-P1-5", description: "Schema change / rollback strategy defined", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    {
      pillar_name: "Responsible AI & Safety Assurance",
      pillar_score: 70,
      gaps: [
        { gap_id: "GAP-P2-2", description: "Prompt injection & jailbreak testing performed (OWASP LLM01)", severity_gov: "High", category_tag: "Other", category_tag_freetext: "Prompt Injection / Jailbreak Resistance (OWASP LLM01)" },
        { gap_id: "GAP-P2-3", description: "PII / data leakage safeguards validated (OWASP LLM06)", severity_gov: "High", category_tag: "PII" },
      ],
    },
    {
      pillar_name: "Data Governance & Regulatory Compliance",
      pillar_score: 70,
      gaps: [
        { gap_id: "GAP-P3-1", description: "GDPR / data residency requirements confirmed", severity_gov: "High", category_tag: "PII" },
        { gap_id: "GAP-P3-3", description: "Consent management mechanism defined", severity_gov: "High", category_tag: "Consent" },
      ],
    },
    {
      pillar_name: "Operational Readiness & Resilience",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-P4-4", description: "Error handling & graceful degradation tested", severity_gov: "Med", category_tag: "Fallback" },
      ],
    },
    {
      pillar_name: "Definition of Ready Completeness",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-P5-2", description: "Test data available and representative", severity_gov: "Med", category_tag: "NFR" },
      ],
    },
  ],
};

const veryBadExport = {
  schema_version: "1.0",
  assessment_id: "sample-very-bad-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Not Ready Feature",
  overall_score: 10,
  gate_decision: "BLOCKED",
  pillars: [
    {
      pillar_name: "Architectural & Data Lineage Feasibility",
      pillar_score: 10,
      gaps: [
        { gap_id: "GAP-P1-1", description: "Integration pattern documented & validated", severity_gov: "Med", category_tag: "Lineage" },
        { gap_id: "GAP-P1-2", description: "Data schema maturity confirmed / versioned", severity_gov: "Med", category_tag: "Lineage" },
        { gap_id: "GAP-P1-3", description: "State management & data retention policy defined", severity_gov: "High", category_tag: "Lineage" },
        { gap_id: "GAP-P1-4", description: "End-to-end data lineage / traceability mapped", severity_gov: "Med", category_tag: "Lineage" },
        { gap_id: "GAP-P1-5", description: "Schema change / rollback strategy defined", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    {
      pillar_name: "Responsible AI & Safety Assurance",
      pillar_score: 10,
      gaps: [
        { gap_id: "GAP-P2-1", description: "Output determinism / reproducibility documented", severity_gov: "Med", category_tag: "NFR" },
        { gap_id: "GAP-P2-2", description: "Prompt injection & jailbreak testing performed (OWASP LLM01)", severity_gov: "High", category_tag: "Other", category_tag_freetext: "Prompt Injection / Jailbreak Resistance (OWASP LLM01)" },
        { gap_id: "GAP-P2-3", description: "PII / data leakage safeguards validated (OWASP LLM06)", severity_gov: "High", category_tag: "PII" },
        { gap_id: "GAP-P2-4", description: "HITL fallback defined for critical/high-risk decisions", severity_gov: "High", category_tag: "HITL" },
        { gap_id: "GAP-P2-5", description: "Model output monitoring & drift detection in place", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    {
      pillar_name: "Data Governance & Regulatory Compliance",
      pillar_score: 10,
      gaps: [
        { gap_id: "GAP-P3-1", description: "GDPR / data residency requirements confirmed", severity_gov: "High", category_tag: "PII" },
        { gap_id: "GAP-P3-2", description: "Audit trail completeness (who/what/when)", severity_gov: "Med", category_tag: "Lineage" },
        { gap_id: "GAP-P3-3", description: "Consent management mechanism defined", severity_gov: "High", category_tag: "Consent" },
        { gap_id: "GAP-P3-4", description: "Data retention & deletion policy documented", severity_gov: "Med", category_tag: "PII" },
        { gap_id: "GAP-P3-5", description: "Third-party / subprocessor data flows reviewed", severity_gov: "Med", category_tag: "Consent" },
      ],
    },
    {
      pillar_name: "Operational Readiness & Resilience",
      pillar_score: 10,
      gaps: [
        { gap_id: "GAP-P4-1", description: "Fallback / circuit-breaker behaviour defined", severity_gov: "High", category_tag: "Fallback" },
        { gap_id: "GAP-P4-2", description: "Rate limiting & token budgeting configured", severity_gov: "Med", category_tag: "RateLimit" },
        { gap_id: "GAP-P4-3", description: "SLAs / SLOs defined and agreed", severity_gov: "Med", category_tag: "Fallback" },
        { gap_id: "GAP-P4-4", description: "Error handling & graceful degradation tested", severity_gov: "Med", category_tag: "Fallback" },
        { gap_id: "GAP-P4-5", description: "Monitoring / alerting on operational thresholds", severity_gov: "Low", category_tag: "RateLimit" },
      ],
    },
    {
      pillar_name: "Definition of Ready Completeness",
      pillar_score: 10,
      gaps: [
        { gap_id: "GAP-P5-1", description: "Acceptance criteria are testable & specific", severity_gov: "Med", category_tag: "NFR" },
        { gap_id: "GAP-P5-2", description: "Test data available and representative", severity_gov: "Med", category_tag: "NFR" },
        { gap_id: "GAP-P5-3", description: "NFR sign-off obtained (perf/security/etc.)", severity_gov: "High", category_tag: "NFR" },
        { gap_id: "GAP-P5-4", description: "Dependencies identified and unblocked", severity_gov: "Low", category_tag: "NFR" },
        { gap_id: "GAP-P5-5", description: "Story sized / estimated by team", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
  ],
};

// schema_version "1.1" samples — mirror dor-gatekeeper's Water/Energy "Good" sector
// presets, exercising the extended category_tag enum (Safety/AssetLifecycle/
// SupplyChain) end to end through ingestion + financial translation.
const waterGoodExport = {
  schema_version: "1.1",
  assessment_id: "sample-water-good-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Regional Water Network Upgrade",
  overall_score: 97,
  gate_decision: "APPROVED",
  pillars: [
    {
      pillar_name: "People & Capability",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-PPL-5", description: "Succession / knowledge-transfer plan for critical asset SMEs", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    { pillar_name: "Process & Workflow", pillar_score: 100, gaps: [] },
    {
      pillar_name: "Data & Integration",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-DATA-1", description: "Asset register / GIS data integration validated", severity_gov: "Med", category_tag: "Lineage" },
      ],
    },
    { pillar_name: "Technology & Infrastructure", pillar_score: 100, gaps: [] },
    { pillar_name: "Governance & Compliance", pillar_score: 100, gaps: [] },
  ],
};

const energyGoodExport = {
  schema_version: "1.1",
  assessment_id: "sample-energy-good-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Regional Grid Modernisation Programme",
  overall_score: 96,
  gate_decision: "APPROVED",
  pillars: [
    {
      pillar_name: "People & Capability",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-PPL-5", description: "Knowledge transfer plan for retiring SME workforce", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    {
      pillar_name: "Process & Workflow",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-PROC-5", description: "Vendor/contractor onboarding process for field works defined", severity_gov: "Low", category_tag: "SupplyChain" },
      ],
    },
    { pillar_name: "Data & Integration", pillar_score: 100, gaps: [] },
    { pillar_name: "Technology & Infrastructure", pillar_score: 100, gaps: [] },
    { pillar_name: "Governance & Compliance", pillar_score: 100, gaps: [] },
  ],
};

// schema_version "1.2" sample — mirrors dor-gatekeeper's Public Sector preset,
// exercising the Probity category_tag end to end through ingestion + financial
// translation, on top of the 1.1 tags already covered by water/energy above.
const publicSectorGoodExport = {
  schema_version: "1.2",
  assessment_id: "sample-public-sector-good-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Citizen Services Digital Uplift",
  overall_score: 96,
  gate_decision: "APPROVED",
  pillars: [
    {
      pillar_name: "People & Capability",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-PPL-5", description: "Knowledge transfer plan for outgoing contractors/consultants", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    {
      pillar_name: "Process & Workflow",
      pillar_score: 90,
      gaps: [
        { gap_id: "GAP-PROC-5", description: "Citizen complaints / service feedback process integrated", severity_gov: "Low", category_tag: "NFR" },
      ],
    },
    { pillar_name: "Data & Integration", pillar_score: 100, gaps: [] },
    { pillar_name: "Technology & Infrastructure", pillar_score: 100, gaps: [] },
    { pillar_name: "Governance & Compliance", pillar_score: 100, gaps: [] },
  ],
};

// Deliberately invalid: not parseable JSON (missing comma after assessment_id).
const malformedRaw = `{
  "schema_version": "1.0",
  "assessment_id": "sample-malformed-0000"
  "feature_name": "Sample: Malformed JSON"
}`;

// Deliberately invalid: valid JSON, but wrong schema_version, missing gate_decision,
// an Other-tagged gap missing category_tag_freetext, and an unrecognised category_tag —
// exercises every explicit-rejection rule in one fixture.
const schemaInvalidExport = {
  schema_version: "0.9",
  assessment_id: "sample-invalid-0000",
  assessment_date: "2026-01-01T00:00:00.000Z",
  feature_name: "Sample: Invalid Export",
  overall_score: 50,
  pillars: [
    {
      pillar_name: "Responsible AI & Safety Assurance",
      pillar_score: 50,
      gaps: [
        { gap_id: "GAP-X1", description: "Untagged risk", severity_gov: "High", category_tag: "Other" },
        { gap_id: "GAP-X2", description: "Unknown category", severity_gov: "Med", category_tag: "Security" },
      ],
    },
  ],
};

export const VALID_SAMPLE_ASSESSMENTS = {
  best: bestExport,
  good: goodExport,
  intentionally_off: intentionallyOffExport,
  very_bad: veryBadExport,
  water_good: waterGoodExport,
  energy_good: energyGoodExport,
  public_sector_good: publicSectorGoodExport,
};

export const SAMPLE_EXPORTS = [
  { id: "best", label: "Best — fully ready (valid)", raw: JSON.stringify(bestExport, null, 2) },
  { id: "good", label: "Good — minor gaps only (valid)", raw: JSON.stringify(goodExport, null, 2) },
  { id: "intentionally_off", label: "Intentionally Off — borderline (valid)", raw: JSON.stringify(intentionallyOffExport, null, 2) },
  { id: "very_bad", label: "Very Bad — not ready (valid)", raw: JSON.stringify(veryBadExport, null, 2) },
  { id: "water_good", label: "Water Asset Transformation — Good (valid, schema 1.1)", raw: JSON.stringify(waterGoodExport, null, 2) },
  { id: "energy_good", label: "Energy Grid Operating Model — Good (valid, schema 1.1)", raw: JSON.stringify(energyGoodExport, null, 2) },
  { id: "public_sector_good", label: "Public Sector — Good (valid, schema 1.2)", raw: JSON.stringify(publicSectorGoodExport, null, 2) },
  { id: "malformed", label: "Malformed JSON (invalid — tests parse error)", raw: malformedRaw },
  { id: "schema_invalid", label: "Schema-Invalid Export (invalid — tests validation errors)", raw: JSON.stringify(schemaInvalidExport, null, 2) },
];
