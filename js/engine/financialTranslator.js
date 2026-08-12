import { CATEGORY_COST_MODEL, SEVERITY_MULTIPLIER, UTILISATION_TAGS, HOURLY_RATE_USD, TEAM_SPRINT_CAPACITY_HOURS } from "../config/costModel.js";

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function flattenGaps(assessment) {
  return assessment.pillars.flatMap((pillar) =>
    (pillar.gaps ?? []).map((gap) => ({ ...gap, pillar_name: pillar.pillar_name }))
  );
}

// Other-tagged gaps have no cost model entry — they're unmodeled until a manual
// {low, high} is supplied, never silently costed at zero (PRD §3.2).
export function computeGapCost(gap, manualCost) {
  if (gap.category_tag === "Other") {
    if (manualCost && Number.isFinite(manualCost.low) && Number.isFinite(manualCost.high)) {
      return { low: manualCost.low, high: manualCost.high, unmodeled: false, manual: true };
    }
    return { low: null, high: null, unmodeled: true, manual: true };
  }

  const model = CATEGORY_COST_MODEL[gap.category_tag];
  const multiplier = SEVERITY_MULTIPLIER[gap.severity_gov] ?? 1;
  const low = Math.round(model.low * multiplier);
  const high = Math.round(model.high * multiplier);

  const result = { low, high, unmodeled: false, manual: false };

  if (UTILISATION_TAGS.has(gap.category_tag)) {
    const reworkHours = high / HOURLY_RATE_USD;
    result.utilisationImpactPct = round2((reworkHours / TEAM_SPRINT_CAPACITY_HOURS) * 100);
  }

  return result;
}

export function computeExposure(gaps, manualCosts = {}) {
  let totalLow = 0;
  let totalHigh = 0;
  let pendingManualCostCount = 0;
  let utilisationImpactPct = 0;

  const costedGaps = gaps.map((gap) => {
    const cost = computeGapCost(gap, manualCosts[gap.gap_id]);
    if (cost.unmodeled) {
      pendingManualCostCount += 1;
    } else {
      totalLow += cost.low;
      totalHigh += cost.high;
    }
    if (cost.utilisationImpactPct) utilisationImpactPct += cost.utilisationImpactPct;
    return { ...gap, cost };
  });

  return {
    gaps: costedGaps,
    totalLow,
    totalHigh,
    pendingManualCostCount,
    utilisationImpactPct: round2(utilisationImpactPct),
  };
}
