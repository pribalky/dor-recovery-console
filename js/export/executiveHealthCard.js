import { topExposureGaps, buildRecoveryPlan, slugify } from "./markdownExport.js";
import { interventionFor } from "../config/interventionMap.js";

// Single source of truth for the Health Card's content — consumed by both the
// Markdown export and the on-screen preview (renderHealthCardPreview in ui/render.js)
// so the two can never drift out of sync with each other.
export function buildHealthCardData(assessment, exposure, raidEntries) {
  const rootCauses = topExposureGaps(exposure, 3);
  const interventions = rootCauses.map((g) => ({
    text: interventionFor(g.category_tag),
    gapDescription: g.description,
  }));
  const recoverySteps = rootCauses.length > 0 ? buildRecoveryPlan(assessment, exposure) : [];
  const escalationItems = raidEntries.filter((e) => e.status !== "Closed" && e.escalation_level !== "Team");

  // Same totalLow/totalHigh figure as "Total Financial Exposure" — reframed as capital
  // protected by catching these gaps pre-commitment, not a second computation.
  const protectedCapitalNote =
    rootCauses.length > 0
      ? `Catching these gaps before commitment protects $${exposure.totalLow.toLocaleString()}–$${exposure.totalHigh.toLocaleString()} of capital from being spent on rework.`
      : null;

  return {
    featureName: assessment.feature_name,
    overallScore: assessment.overall_score,
    gateDecision: assessment.gate_decision,
    totalLow: exposure.totalLow,
    totalHigh: exposure.totalHigh,
    pendingManualCostCount: exposure.pendingManualCostCount,
    utilisationImpactPct: exposure.utilisationImpactPct,
    protectedCapitalNote,
    rootCauses,
    interventions,
    recoverySteps,
    escalationItems,
  };
}

// One-page executive artifact — reuses the exposure/RAID/recovery-plan data already
// computed elsewhere (no new underlying computation), just a different presentation
// aimed at "decision-ready" language rather than an engineering audit trail.
export function buildExecutiveHealthCard(assessment, exposure, raidEntries) {
  const data = buildHealthCardData(assessment, exposure, raidEntries);
  const lines = [];

  lines.push(`# ${data.featureName} — Strategy-to-Execution Health Card`);
  lines.push("");
  lines.push(`- **TOM Feasibility Score:** ${data.overallScore}% (${data.gateDecision})`);
  lines.push(`- **Total Financial Exposure:** $${data.totalLow.toLocaleString()} – $${data.totalHigh.toLocaleString()}`);
  if (data.protectedCapitalNote) {
    lines.push(`- **Protected Capital:** ${data.protectedCapitalNote}`);
  }
  if (data.pendingManualCostCount > 0) {
    lines.push(`- **Pending Manual Costing:** ${data.pendingManualCostCount} item(s) not yet included above.`);
  }
  if (data.utilisationImpactPct > 0) {
    lines.push(`- **Estimated Utilisation Impact:** ${data.utilisationImpactPct}% of a sprint's capacity.`);
  }
  lines.push("");

  lines.push("## Top 3 Root Causes of Operational Rework");
  lines.push("");
  if (data.rootCauses.length === 0) {
    lines.push("No material root causes identified — programme is tracking to plan.");
  } else {
    data.rootCauses.forEach((g, i) => {
      const tag = g.category_tag === "Other" ? g.category_tag_freetext : g.category_tag;
      lines.push(`${i + 1}. **${g.description}** _(${g.pillar_name} · ${tag}, ${g.severity_gov} severity)_ — $${g.cost.low.toLocaleString()}–$${g.cost.high.toLocaleString()} estimated exposure.`);
    });
  }
  lines.push("");

  lines.push("## Recommended Executive Actions & Governance Interventions");
  lines.push("");
  if (data.rootCauses.length === 0) {
    lines.push("No governance escalation required — proceed to steering committee sign-off.");
  } else {
    data.interventions.forEach((intervention, i) => {
      lines.push(`${i + 1}. **${intervention.text}** — re: "${intervention.gapDescription}".`);
    });
    data.recoverySteps.forEach((step) => lines.push(`- ${step}`));
  }
  lines.push("");

  if (data.escalationItems.length > 0) {
    lines.push("## Open Items Requiring Escalation Beyond the Delivery Team");
    lines.push("");
    data.escalationItems.forEach((e) => {
      lines.push(`- **[${e.escalation_level}] ${e.description}** _(${e.type}, ${e.status})_`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

export function exportFilenameHealthCard(featureName, assessmentId) {
  return `${slugify(featureName)}_${assessmentId}_health_card.md`;
}
