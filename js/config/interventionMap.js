// category_tag -> suggested governance intervention, used by the Executive Health
// Card's "Recommended Executive Actions & Governance Interventions" section. Falls
// back to a generic action for any tag without a specific mapping (never blocks on
// an unmapped tag — new category_tags added later still degrade gracefully).
export const INTERVENTION_MAP = {
  PII: "Escalate to Data Protection Officer / Privacy Office",
  Consent: "Escalate to Data Protection Officer / Privacy Office",
  Lineage: "Escalate to Data Governance Board",
  Fallback: "Engage Site Reliability / Operational Resilience function",
  RateLimit: "Engage Platform Engineering for capacity remediation",
  HITL: "Escalate to Responsible AI / Model Risk Committee",
  NFR: "Assign to Engineering Leadership for delivery remediation",
  Safety: "Convene Safety Case Review Board",
  AssetLifecycle: "Escalate to Asset Management Steering Group",
  SupplyChain: "Engage Vendor / Supply Chain Risk Management",
  Other: "Escalate to Governance & Risk Committee for triage",
};

export const DEFAULT_INTERVENTION = "Escalate to Governance & Risk Committee for triage";

export function interventionFor(categoryTag) {
  return INTERVENTION_MAP[categoryTag] ?? DEFAULT_INTERVENTION;
}
