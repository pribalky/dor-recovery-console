import { topExposureGaps, buildRecoveryPlan, slugify } from "./markdownExport.js";
import { interventionFor } from "../config/interventionMap.js";

// One-page executive artifact — reuses the exposure/RAID/recovery-plan data already
// computed elsewhere (no new underlying computation), just a different presentation
// aimed at "decision-ready" language rather than an engineering audit trail.
export function buildExecutiveHealthCard(assessment, exposure, raidEntries) {
  const lines = [];

  lines.push(`# ${assessment.feature_name} — Strategy-to-Execution Health Card`);
  lines.push("");
  lines.push(`- **TOM Feasibility Score:** ${assessment.overall_score}% (${assessment.gate_decision})`);
  lines.push(`- **Total Financial Exposure:** $${exposure.totalLow.toLocaleString()} – $${exposure.totalHigh.toLocaleString()}`);
  if (exposure.pendingManualCostCount > 0) {
    lines.push(`- **Pending Manual Costing:** ${exposure.pendingManualCostCount} item(s) not yet included above.`);
  }
  if (exposure.utilisationImpactPct > 0) {
    lines.push(`- **Estimated Utilisation Impact:** ${exposure.utilisationImpactPct}% of a sprint's capacity.`);
  }
  lines.push("");

  lines.push("## Top 3 Root Causes of Operational Rework");
  lines.push("");
  const rootCauses = topExposureGaps(exposure, 3);
  if (rootCauses.length === 0) {
    lines.push("No material root causes identified — programme is tracking to plan.");
  } else {
    rootCauses.forEach((g, i) => {
      const tag = g.category_tag === "Other" ? g.category_tag_freetext : g.category_tag;
      lines.push(`${i + 1}. **${g.description}** _(${g.pillar_name} · ${tag}, ${g.severity_gov} severity)_ — $${g.cost.low.toLocaleString()}–$${g.cost.high.toLocaleString()} estimated exposure.`);
    });
  }
  lines.push("");

  lines.push("## Recommended Executive Actions & Governance Interventions");
  lines.push("");
  if (rootCauses.length === 0) {
    lines.push("No governance escalation required — proceed to steering committee sign-off.");
  } else {
    rootCauses.forEach((g, i) => {
      lines.push(`${i + 1}. **${interventionFor(g.category_tag)}** — re: "${g.description}".`);
    });
    const recoverySteps = buildRecoveryPlan(assessment, exposure);
    recoverySteps.forEach((step) => lines.push(`- ${step}`));
  }
  lines.push("");

  const raidByEscalation = raidEntries.filter((e) => e.status !== "Closed" && e.escalation_level !== "Team");
  if (raidByEscalation.length > 0) {
    lines.push("## Open Items Requiring Escalation Beyond the Delivery Team");
    lines.push("");
    raidByEscalation.forEach((e) => {
      lines.push(`- **[${e.escalation_level}] ${e.description}** _(${e.type}, ${e.status})_`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

export function exportFilenameHealthCard(featureName, assessmentId) {
  return `${slugify(featureName)}_${assessmentId}_health_card.md`;
}
