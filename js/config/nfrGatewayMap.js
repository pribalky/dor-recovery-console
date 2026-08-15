// category_tag -> NFR Gateway, PRD §4's 4 gateways as a derived cross-cutting view
// over data App 1 already provides — no new checklist items, no hand-tagging.
// Lineage and Probity are intentionally left unmapped: they're genuinely data-
// governance/procurement concerns, not one of the 4 listed gateways, and forcing
// them into a gateway would misrepresent what the gateway actually covers.
export const NFR_GATEWAY_MAP = {
  Fallback: "Resilience & Failure Mode",
  Safety: "Resilience & Failure Mode",
  AssetLifecycle: "Resilience & Failure Mode",
  SupplyChain: "Resilience & Failure Mode",
  RateLimit: "Cost & Resource Limit",
  PII: "Security & OWASP",
  Consent: "Security & OWASP",
  HITL: "Security & OWASP",
  Other: "Security & OWASP",
  NFR: "Performance & Scale",
};

export const NFR_GATEWAYS = ["Resilience & Failure Mode", "Cost & Resource Limit", "Security & OWASP", "Performance & Scale"];

// Returns null for tags with no gateway mapping (Lineage, Probity) rather than a
// fallback — an unmapped gateway is a meaningful "not one of the 4", not a default.
export function gatewayFor(categoryTag) {
  return NFR_GATEWAY_MAP[categoryTag] ?? null;
}
