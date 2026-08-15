import { SEVERITY_POINTS, TIER_THRESHOLDS } from "../config/reworkRiskConfig.js";

// Sums severity points across all open gaps — a simple, explainable score rather than
// a weighted/multiplicative formula, matching the "no invented complexity" discipline
// used elsewhere (see DECISIONS.md, reworkRiskConfig.js).
export function computeReworkRiskScore(gaps) {
  return gaps.reduce((sum, gap) => sum + (SEVERITY_POINTS[gap.severity_gov] ?? 0), 0);
}

export function classifyReworkTier(score) {
  if (score >= TIER_THRESHOLDS.high) return "High";
  if (score >= TIER_THRESHOLDS.medium) return "Medium";
  return "Low";
}

const TIER_ESCALATION_TEXT = {
  Low: "Contained — track within the team, no escalation required.",
  Medium: "Notify the architect/tech lead — remediation should be planned, not deferred indefinitely.",
  High: "Block and escalate to the governance/architecture board before proceeding further.",
};

export function escalationTextForTier(tier) {
  return TIER_ESCALATION_TEXT[tier];
}
