// category_tag -> NIST AI RMF 1.0 (January 2023) function(s), a derived cross-cutting
// view over data App 1 already provides — no new checklist items, no hand-tagging.
// Same shape and "leave genuinely unmapped tags unmapped, surface the count"
// discipline as nfrGatewayMap.js: Probity (procurement/conflict-of-interest), Safety
// (physical field-workforce safety), AssetLifecycle (capital asset condition), and
// SupplyChain are real project-governance concerns, but not AI-risk-management
// concerns NIST AI RMF's 4 functions are about — forcing them into a function would
// misrepresent what the function actually covers. "Other" is a catch-all free-text
// tag with no fixed meaning and is left unmapped for the same reason.
export const NIST_RMF_MAP = {
  HITL: ["Govern", "Manage"],
  PII: ["Map", "Manage"],
  Consent: ["Govern"],
  Fallback: ["Manage"],
  RateLimit: ["Manage"],
  NFR: ["Measure"],
  Lineage: ["Map"],
};

export const NIST_RMF_FUNCTIONS = ["Govern", "Map", "Measure", "Manage"];

// Returns [] for tags with no function mapping (Other, Probity, Safety,
// AssetLifecycle, SupplyChain) rather than a fallback — an unmapped tag is a
// meaningful "outside NIST AI RMF's scope", not a default.
export function nistFunctionsFor(categoryTag) {
  return NIST_RMF_MAP[categoryTag] ?? [];
}
