// Cost model config — one entry per category_tag, base range at High severity_gov.
// Figures are illustrative placeholders, not real actuarial data — see DECISIONS.md.
export const CATEGORY_COST_MODEL = {
  PII: { driver: "Compliance fine + breach remediation", basis: "Regulatory fine bands, incident response cost", low: 50000, high: 250000 },
  Fallback: { driver: "SLA penalty risk", basis: "Contract SLA clauses, downtime cost/hr", low: 10000, high: 80000 },
  RateLimit: { driver: "Cost overrun / throttle failure", basis: "API cost per call, projected volume", low: 5000, high: 40000 },
  Consent: { driver: "Regulatory + legal exposure", basis: "GDPR fine bands, legal review cost", low: 20000, high: 120000 },
  HITL: { driver: "Rework + reputational risk", basis: "Incident cost, remediation hours", low: 8000, high: 60000 },
  Lineage: { driver: "Data breach / audit failure cost", basis: "Audit remediation, breach cost/record", low: 15000, high: 100000 },
  NFR: { driver: "Rework hours", basis: "Dev day rate × estimated rework effort", low: 4000, high: 30000 },
};

// severity_gov (inherited, immutable from App 1) scales the base range instead of
// asking the assessor to re-judge severity a second time.
export const SEVERITY_MULTIPLIER = { High: 1.0, Med: 0.6, Low: 0.3 };

// Illustrative constants for the utilisation/margin estimate on NFR/HITL gaps.
export const HOURLY_RATE_USD = 100;
export const TEAM_SPRINT_CAPACITY_HOURS = 320; // 8 people × 40 hours

export const UTILISATION_TAGS = new Set(["NFR", "HITL"]);

export const KNOWN_CATEGORY_TAGS = new Set([...Object.keys(CATEGORY_COST_MODEL), "Other"]);
