import { RAID_TYPES, ESCALATION_LEVELS, rollupByTypeAndStatus, rollupByEscalationAndStatus } from "../engine/raid.js";

// Shared by buildMarkdownExport and buildExecutiveHealthCard — costed gaps ranked by
// $ high descending; unmodeled (pending manual costing) gaps are excluded, not just
// sorted last, since they have no $ figure to rank by.
export function topExposureGaps(exposure, n = 3) {
  return [...exposure.gaps]
    .filter((g) => !g.cost.unmodeled)
    .sort((a, b) => b.cost.high - a.cost.high)
    .slice(0, n);
}

// Deterministic template — degrades gracefully to a single sign-off step when the
// ingested assessment has no gaps left, per PRD's "fail gracefully" principle.
export function buildRecoveryPlan(assessment, exposure) {
  if (exposure.gaps.length === 0) {
    return ["No gaps remain — proceed to steering committee sign-off."];
  }

  const highGaps = exposure.gaps.filter((g) => g.severity_gov === "High");
  const steps = [];

  if (highGaps.length > 0) {
    const top = [...highGaps].sort((a, b) => (b.cost.high ?? 0) - (a.cost.high ?? 0))[0];
    steps.push(`Resolve ${highGaps.length} High severity_gov gap(s), starting with "${top.description}".`);
  } else {
    steps.push(`Resolve the ${exposure.gaps.length} remaining Med/Low severity_gov gap(s).`);
  }

  steps.push(`Re-run App 1 assessment to confirm the gate decision improves from ${assessment.gate_decision}.`);
  steps.push("Re-issue the executive brief to the steering committee once re-assessment is APPROVED, or CONDITIONAL with an accepted residual risk.");

  return steps;
}

export function buildMarkdownExport(assessment, exposure, raidEntries) {
  const lines = [];

  lines.push(`# Delivery Recovery Brief — ${assessment.feature_name}`);
  lines.push("");
  lines.push(`- **Assessment ID:** ${assessment.assessment_id}`);
  lines.push(`- **Overall Score:** ${assessment.overall_score}/100`);
  lines.push(`- **Gate Decision:** ${assessment.gate_decision}`);
  lines.push(`- **Total Financial Exposure:** $${exposure.totalLow.toLocaleString()} – $${exposure.totalHigh.toLocaleString()}`);
  if (exposure.pendingManualCostCount > 0) {
    lines.push(`- **Pending Manual Costing:** ${exposure.pendingManualCostCount} gap(s) not yet included in the total above.`);
  }
  if (exposure.utilisationImpactPct > 0) {
    lines.push(`- **Estimated Utilisation Impact:** ${exposure.utilisationImpactPct}% of a sprint's capacity`);
  }
  lines.push("");

  lines.push("## Top Exposure Gaps");
  lines.push("");
  const top3 = topExposureGaps(exposure, 3);
  if (top3.length === 0) {
    lines.push("No costed gaps.");
  } else {
    top3.forEach((g, i) => {
      const tag = g.category_tag === "Other" ? g.category_tag_freetext : g.category_tag;
      lines.push(`${i + 1}. **[${g.severity_gov}] ${g.description}** — $${g.cost.low.toLocaleString()}–$${g.cost.high.toLocaleString()} _(${g.pillar_name} · ${tag})_`);
    });
  }
  lines.push("");

  lines.push("## RAID Summary");
  lines.push("");
  const rollupType = rollupByTypeAndStatus(raidEntries);
  for (const type of RAID_TYPES) {
    const counts = rollupType[type];
    lines.push(`- **${type}:** Open ${counts.Open}, Mitigating ${counts.Mitigating}, Closed ${counts.Closed}`);
  }
  lines.push("");
  lines.push("### By Escalation Level");
  lines.push("");
  const rollupEsc = rollupByEscalationAndStatus(raidEntries);
  const escalationLines = ESCALATION_LEVELS.map((level) => {
    const c = rollupEsc[level];
    const total = c.Open + c.Mitigating + c.Closed;
    return total > 0 ? `- **${level}:** ${total} entr${total === 1 ? "y" : "ies"} (Open ${c.Open}, Mitigating ${c.Mitigating}, Closed ${c.Closed})` : null;
  }).filter(Boolean);
  lines.push(...(escalationLines.length > 0 ? escalationLines : ["No entries yet."]));
  lines.push("");

  lines.push("## Recovery Plan");
  lines.push("");
  buildRecoveryPlan(assessment, exposure).forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push("");

  return lines.join("\n");
}

export function slugify(text) {
  const slug = (text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "untitled";
}

export function exportFilenameMd(featureName, assessmentId) {
  return `${slugify(featureName)}_${assessmentId}_recovery_brief.md`;
}
