import { topExposureGaps, buildRecoveryPlan, slugify } from "./markdownExport.js";

// Standard ADR sections, auto-populated from data already computed elsewhere
// (overall_score, gate_decision, top exposure gaps, buildRecoveryPlan's steps) —
// reused, not reimplemented, same discipline as executiveHealthCard.js.
export function buildAdrDraft(assessment, exposure) {
  const lines = [];
  const top3 = topExposureGaps(exposure, 3);

  lines.push(`# ADR: ${assessment.feature_name}`);
  lines.push("");
  lines.push(`## Status`);
  lines.push("");
  lines.push(`Proposed — DoR gate decision: **${assessment.gate_decision}** (${assessment.overall_score}/100).`);
  lines.push("");

  lines.push(`## Context`);
  lines.push("");
  if (top3.length === 0) {
    lines.push("No material gaps were identified against the Definition of Ready criteria.");
  } else {
    lines.push("The following gaps against the Definition of Ready criteria carry the greatest financial exposure:");
    lines.push("");
    top3.forEach((g, i) => {
      const tag = g.category_tag === "Other" ? g.category_tag_freetext : g.category_tag;
      lines.push(`${i + 1}. **${g.description}** _(${g.pillar_name} · ${tag}, ${g.severity_gov} severity)_ — $${g.cost.low.toLocaleString()}–$${g.cost.high.toLocaleString()} estimated exposure.`);
    });
  }
  lines.push("");

  lines.push(`## Decision`);
  lines.push("");
  buildRecoveryPlan(assessment, exposure).forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push("");

  lines.push(`## Consequences`);
  lines.push("");
  lines.push(`- Total financial exposure of $${exposure.totalLow.toLocaleString()}–$${exposure.totalHigh.toLocaleString()} remains until the above steps are completed.`);
  if (exposure.pendingManualCostCount > 0) {
    lines.push(`- ${exposure.pendingManualCostCount} gap(s) are not yet costed and are excluded from the figure above.`);
  }
  if (exposure.utilisationImpactPct > 0) {
    lines.push(`- Estimated utilisation impact of ${exposure.utilisationImpactPct}% of a sprint's capacity until resolved.`);
  }
  lines.push(`- Re-assessment against the Definition of Ready criteria is required before this decision can be closed out.`);
  lines.push("");

  return lines.join("\n");
}

export function exportFilenameAdr(featureName, assessmentId) {
  return `${slugify(featureName)}_${assessmentId}_adr_draft.md`;
}
