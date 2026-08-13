import {
  CATEGORY_COST_MODEL,
  SEVERITY_MULTIPLIER,
  REWORK_HOURS_MODEL,
  UTILISATION_TAGS,
  DEFAULT_TEAM_SPRINT_CAPACITY_HOURS,
  DEFAULT_COST_SCALE,
} from "../config/costModel.js";

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function flattenGaps(assessment) {
  return assessment.pillars.flatMap((pillar) =>
    (pillar.gaps ?? []).map((gap) => ({ ...gap, pillar_name: pillar.pillar_name }))
  );
}

// Other-tagged gaps have no cost model entry — they're unmodeled until a manual
// {low, high} is supplied, never silently costed at zero (PRD §3.2). Manual entries
// are literal user-entered dollars and are never rescaled by costScale.
export function computeGapCost(gap, manualCost, assumptions = {}) {
  const costScale = assumptions.costScale ?? DEFAULT_COST_SCALE;
  const teamSprintCapacityHours = assumptions.teamSprintCapacityHours ?? DEFAULT_TEAM_SPRINT_CAPACITY_HOURS;

  if (gap.category_tag === "Other") {
    if (manualCost && Number.isFinite(manualCost.low) && Number.isFinite(manualCost.high)) {
      return { low: manualCost.low, high: manualCost.high, unmodeled: false, manual: true };
    }
    return { low: null, high: null, unmodeled: true, manual: true };
  }

  const model = CATEGORY_COST_MODEL[gap.category_tag];
  const multiplier = SEVERITY_MULTIPLIER[gap.severity_gov] ?? 1;
  const low = Math.round(model.low * multiplier * costScale);
  const high = Math.round(model.high * multiplier * costScale);

  const result = { low, high, unmodeled: false, manual: false };

  // Rework hours are authored directly (REWORK_HOURS_MODEL), not derived from the
  // $ figure above — that figure can bundle in non-labor cost (see DECISIONS.md #12).
  if (UTILISATION_TAGS.has(gap.category_tag)) {
    const reworkHours = REWORK_HOURS_MODEL[gap.category_tag].high * multiplier;
    result.utilisationImpactPct = round2((reworkHours / teamSprintCapacityHours) * 100);
  }

  return result;
}

export function computeExposure(gaps, manualCosts = {}, assumptions = {}) {
  let totalLow = 0;
  let totalHigh = 0;
  let pendingManualCostCount = 0;
  let utilisationImpactPct = 0;

  const costedGaps = gaps.map((gap) => {
    const cost = computeGapCost(gap, manualCosts[gap.gap_id], assumptions);
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
