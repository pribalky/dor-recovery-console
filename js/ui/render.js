import { RAID_TYPES, RAID_STATUSES, ESCALATION_LEVELS, rollupByTypeAndStatus, rollupByEscalationAndStatus } from "../engine/raid.js";

function optionsHtml(values, selected) {
  return values.map((v) => `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`).join("");
}

export function showErrors(container, errors) {
  container.innerHTML = errors.length
    ? `<ul class="errors">${errors.map((e) => `<li>${e}</li>`).join("")}</ul>`
    : "";
}

export function renderSummaryBar(container, assessment) {
  container.innerHTML = `
    <h2>${assessment.feature_name}</h2>
    <div class="summary-meta">
      <span>Assessment ID: <code>${assessment.assessment_id}</code></span>
      <span>Overall Score: <strong>${assessment.overall_score}</strong>/100</span>
      <span class="gate-badge gate-${assessment.gate_decision.toLowerCase()}">${assessment.gate_decision}</span>
    </div>
  `;
}

export function renderGapTable(tbody, costedGaps, manualCosts, handlers) {
  if (costedGaps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">No gaps in this assessment.</td></tr>`;
    return;
  }

  tbody.innerHTML = costedGaps
    .map((gap) => {
      const tag = gap.category_tag === "Other" ? gap.category_tag_freetext : gap.category_tag;
      const costCell = gap.cost.unmodeled
        ? `
          <div class="manual-cost">
            <span class="unmodeled-flag">Requires manual costing</span>
            <input type="number" min="0" placeholder="Low $" data-gap-id="${gap.gap_id}" data-field="low" class="manual-cost-input" />
            <input type="number" min="0" placeholder="High $" data-gap-id="${gap.gap_id}" data-field="high" class="manual-cost-input" />
          </div>
        `
        : `
          <span class="cost-range">$${gap.cost.low.toLocaleString()} – $${gap.cost.high.toLocaleString()}</span>
          ${gap.cost.utilisationImpactPct ? `<span class="utilisation">${gap.cost.utilisationImpactPct}% utilisation</span>` : ""}
        `;

      return `
        <tr class="gap-row severity-${gap.severity_gov.toLowerCase()}">
          <td><span class="gap-severity">${gap.severity_gov}</span></td>
          <td>${gap.description}<div class="gap-meta">${gap.pillar_name} · ${tag}</div></td>
          <td>${costCell}</td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll(".manual-cost-input").forEach((input) => {
    const gapId = input.dataset.gapId;
    const field = input.dataset.field;
    if (manualCosts[gapId]?.[field] !== undefined) input.value = manualCosts[gapId][field];
    input.addEventListener("change", () => handlers.onManualCostChange(gapId, field, input.value));
  });
}

export function renderExposureSummary(container, exposure) {
  container.innerHTML = `
    <div class="exposure-total">$${exposure.totalLow.toLocaleString()} – $${exposure.totalHigh.toLocaleString()}</div>
    ${exposure.pendingManualCostCount > 0 ? `<p class="pending-flag">${exposure.pendingManualCostCount} gap(s) pending manual costing — not yet included above.</p>` : ""}
    ${exposure.utilisationImpactPct > 0 ? `<p class="utilisation-summary">Estimated utilisation impact: <strong>${exposure.utilisationImpactPct}%</strong> of a sprint's capacity.</p>` : ""}
  `;
}

// Owner/Status/Target Resolution/Escalation Level are editable for every entry —
// seeded or manual (DECISIONS.md #7's own noted trade-off: these shouldn't be fixed
// forever). Type, Description, and Date Raised stay read-only: identity and history.
export function renderRaidTable(tbody, entries, handlers) {
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No RAID entries yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = entries
    .map(
      (e) => `
    <tr>
      <td>${e.type}</td>
      <td>${e.description}${e.priority ? `<div class="gap-meta">Inherited priority: ${e.priority}</div>` : ""}</td>
      <td><input type="text" class="raid-owner-input" data-raid-id="${e.raid_id}" value="${e.owner}" /></td>
      <td>
        <select class="raid-status-select" data-raid-id="${e.raid_id}">
          ${optionsHtml(RAID_STATUSES, e.status)}
        </select>
      </td>
      <td>${e.date_raised}</td>
      <td><input type="date" class="raid-target-input" data-raid-id="${e.raid_id}" value="${e.target_resolution_date || ""}" /></td>
      <td>
        <select class="raid-escalation-select" data-raid-id="${e.raid_id}">
          ${optionsHtml(ESCALATION_LEVELS, e.escalation_level)}
        </select>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll(".raid-owner-input").forEach((input) => {
    input.addEventListener("change", () => handlers.onFieldChange(input.dataset.raidId, "owner", input.value));
  });
  tbody.querySelectorAll(".raid-status-select").forEach((select) => {
    select.addEventListener("change", () => handlers.onFieldChange(select.dataset.raidId, "status", select.value));
  });
  tbody.querySelectorAll(".raid-target-input").forEach((input) => {
    input.addEventListener("change", () => handlers.onFieldChange(input.dataset.raidId, "target_resolution_date", input.value));
  });
  tbody.querySelectorAll(".raid-escalation-select").forEach((select) => {
    select.addEventListener("change", () => handlers.onFieldChange(select.dataset.raidId, "escalation_level", select.value));
  });
}

export function renderRaidRollup(container, entries) {
  const byType = rollupByTypeAndStatus(entries);
  const byEsc = rollupByEscalationAndStatus(entries);

  const typeRows = RAID_TYPES.map(
    (t) => `<li><strong>${t}:</strong> Open ${byType[t].Open}, Mitigating ${byType[t].Mitigating}, Closed ${byType[t].Closed}</li>`
  ).join("");

  const escRows = ESCALATION_LEVELS.map((level) => {
    const c = byEsc[level];
    const total = c.Open + c.Mitigating + c.Closed;
    return total > 0
      ? `<li><strong>${level}:</strong> ${total} (Open ${c.Open}, Mitigating ${c.Mitigating}, Closed ${c.Closed})</li>`
      : "";
  }).join("");

  container.innerHTML = `
    <div>
      <h3>By Type</h3>
      <ul>${typeRows}</ul>
    </div>
    <div>
      <h3>By Escalation Level</h3>
      <ul>${escRows || "<li>No entries yet.</li>"}</ul>
    </div>
  `;
}

export function renderRecoveryPlan(container, steps) {
  container.innerHTML = `<ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>`;
}
