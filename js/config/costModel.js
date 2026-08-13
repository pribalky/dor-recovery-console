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
  // Extended per schema_version "1.1" — physical/regulated-sector risk themes the
  // original software-governance enum doesn't honestly cover. Added per the PRD's own
  // extensibility clause rather than force-fit onto e.g. PII — see DECISIONS.md.
  Safety: { driver: "Safety incident / HSE compliance failure", basis: "Incident cost, regulatory penalty, remediation", low: 40000, high: 300000 },
  AssetLifecycle: { driver: "Asset failure / capital delivery slippage", basis: "Replacement cost, programme delay cost", low: 20000, high: 150000 },
  SupplyChain: { driver: "Vendor/supply disruption risk", basis: "Contract penalty, delay cost, remediation", low: 10000, high: 90000 },
};

// severity_gov (inherited, immutable from App 1) scales the base range instead of
// asking the assessor to re-judge severity a second time.
export const SEVERITY_MULTIPLIER = { High: 1.0, Med: 0.6, Low: 0.3 };

// Rework-hours estimates for the utilisation/margin line, authored directly and
// independent of the $ cost bands above (a category's $ high figure often bundles
// in non-labor cost — e.g. HITL's includes reputational risk — so deriving "hours"
// from it would overcount; see DECISIONS.md #12).
export const REWORK_HOURS_MODEL = {
  NFR: { low: 8, high: 60 },
  HITL: { low: 16, high: 100 },
};

// Defaults for the adjustable "Assumptions" controls in the UI — illustrative,
// meant to be normalized per engagement rather than edited in code.
export const DEFAULT_TEAM_SPRINT_CAPACITY_HOURS = 480; // 6 people x 2-week sprint x 40h/week
export const DEFAULT_COST_SCALE = 1;

export const UTILISATION_TAGS = new Set(["NFR", "HITL"]);

export const KNOWN_CATEGORY_TAGS = new Set([...Object.keys(CATEGORY_COST_MODEL), "Other"]);
