import { RAID_TYPES, RAID_STATUSES, ESCALATION_LEVELS, rollupByTypeAndStatus, rollupByEscalationAndStatus } from "../engine/raid.js";
import { REMEDIATION_PATHWAYS } from "../config/reworkRiskConfig.js";
import { escapeHtml } from "./escapeHtml.js";

function optionsHtml(values, selected) {
  return values.map((v) => `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`).join("");
}

export function renderDriftResult(container, drift) {
  const { newGaps, resolvedGaps, severityChanged } = drift;

  if (newGaps.length === 0 && resolvedGaps.length === 0 && severityChanged.length === 0) {
    container.innerHTML = `<p class="empty">No drift — the current assessment matches the baseline exactly.</p>`;
    return;
  }

  const section = (title, items, renderItem) => `
    <h3>${title} (${items.length})</h3>
    ${items.length ? `<ul class="gap-list">${items.map(renderItem).join("")}</ul>` : `<p class="empty">None.</p>`}
  `;

  container.innerHTML = `
    ${section(
      "New Since Baseline",
      newGaps,
      (g) => `<li class="gap-row severity-${g.severity_gov.toLowerCase()}"><span class="gap-severity">${g.severity_gov}</span><span>${escapeHtml(g.description)}</span></li>`
    )}
    ${section(
      "Resolved Since Baseline",
      resolvedGaps,
      (g) => `<li class="gap-row severity-${g.severity_gov.toLowerCase()}"><span class="gap-severity">${g.severity_gov}</span><span>${escapeHtml(g.description)}</span></li>`
    )}
    ${section(
      "Severity Changed",
      severityChanged,
      (c) => `<li class="gap-row"><span>${escapeHtml(c.description)}</span><span class="gap-meta">${c.from} → ${c.to}</span></li>`
    )}
  `;
}

export function showErrors(container, errors) {
  container.innerHTML = errors.length
    ? `<ul class="errors">${errors.map((e) => `<li>${e}</li>`).join("")}</ul>`
    : "";
}

export function renderSummaryBar(container, assessment) {
  container.innerHTML = `
    <h2>${escapeHtml(assessment.feature_name)}</h2>
    <div class="summary-meta">
      <span>Assessment ID: <code>${escapeHtml(assessment.assessment_id)}</code></span>
      <span>Overall Score: <strong>${assessment.overall_score}</strong>/100</span>
      <span class="gate-badge gate-${assessment.gate_decision.toLowerCase()}">${assessment.gate_decision}</span>
    </div>
  `;
}

// raidByGapId: Map<gap_id, RaidEntry> — lets each gap row show a live badge for the
// RAID entry it seeded, so the gap-to-RAID link (source_gap_id) is visible, not just
// present in data. Updates on every recompute(), including after editing the RAID
// table, since both render from the same state.
export function renderGapTable(tbody, costedGaps, manualCosts, raidByGapId, handlers) {
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

      const raidEntry = raidByGapId?.get(gap.gap_id);
      const raidBadge = raidEntry
        ? `<span class="raid-link-badge">RAID: ${raidEntry.type} · ${raidEntry.status}</span>`
        : "";

      return `
        <tr class="gap-row severity-${gap.severity_gov.toLowerCase()}">
          <td><span class="gap-severity">${gap.severity_gov}</span></td>
          <td>${escapeHtml(gap.description)}<div class="gap-meta">${escapeHtml(gap.pillar_name)} · ${escapeHtml(tag)} ${raidBadge}</div></td>
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
      <td>${escapeHtml(e.description)}${e.priority ? `<div class="gap-meta">Inherited priority: ${e.priority}</div>` : ""}</td>
      <td><input type="text" class="raid-owner-input" data-raid-id="${e.raid_id}" value="${escapeHtml(e.owner)}" /></td>
      <td>
        <select class="raid-status-select" data-raid-id="${e.raid_id}">
          ${optionsHtml(RAID_STATUSES, e.status)}
        </select>
      </td>
      <td>${escapeHtml(e.date_raised)}</td>
      <td><input type="date" class="raid-target-input" data-raid-id="${e.raid_id}" value="${escapeHtml(e.target_resolution_date || "")}" /></td>
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

// steps are plain sentences from buildRecoveryPlan() (markdownExport.js) that embed
// gap.description verbatim — that builder is also used for the raw .md export, where
// HTML-escaping would corrupt the text, so escaping happens here at the DOM boundary
// instead of inside the shared builder.
export function renderRecoveryPlan(container, steps) {
  container.innerHTML = `<ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
}

export function renderNfrGatewayPanel(container, rollup) {
  const rows = Object.entries(rollup.byGateway)
    .map(
      ([gateway, data]) => `
      <tr>
        <td>${gateway}</td>
        <td>${data.gapCount}</td>
        <td>$${data.exposureLow.toLocaleString()} – $${data.exposureHigh.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  container.innerHTML = `
    <table class="nfr-gateway-table">
      <thead><tr><th>Gateway</th><th>Gaps</th><th>$ Exposure</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${rollup.unmappedCount > 0 ? `<p class="pending-flag">${rollup.unmappedCount} gap(s) use a category_tag outside the 4 gateways (e.g. Lineage, Probity) and are not shown above.</p>` : ""}
  `;
}

export function renderReworkRiskPanel(container, { score, tier, escalationText }) {
  const pathwaysRows = REMEDIATION_PATHWAYS.map(
    (p) => `
    <tr>
      <td>${p.option}</td>
      <td>${p.trigger}</td>
      <td>${p.mechanism}</td>
      <td>${p.impact}</td>
    </tr>`
  ).join("");

  container.innerHTML = `
    <div class="rework-risk-summary rework-tier-${tier.toLowerCase()}">
      <span class="rework-score">${score}</span>
      <span class="rework-tier">${tier} risk</span>
    </div>
    <p class="rework-escalation">${escalationText}</p>
    <h3>Remediation Pathway Reference</h3>
    <p class="section-note">Reference only — not auto-selected. Which option applies depends on the reason for drift, which requires a human judgement call.</p>
    <div class="table-scroll">
      <table class="remediation-table">
        <thead><tr><th>Option</th><th>Trigger</th><th>Mechanism</th><th>Time/Cost Impact</th></tr></thead>
        <tbody>${pathwaysRows}</tbody>
      </table>
    </div>
  `;
}

// Renders buildHealthCardData()'s output as HTML (not the markdown string) so the
// on-screen panel and the "Print Health Card" path both work from real DOM content,
// not a downloaded .md file — see DECISIONS.md.
export function renderHealthCardPreview(container, data) {
  const rootCausesHtml = data.rootCauses.length
    ? `<ol>${data.rootCauses
        .map((g) => {
          const tag = g.category_tag === "Other" ? g.category_tag_freetext : g.category_tag;
          return `<li><strong>${escapeHtml(g.description)}</strong> <span class="gap-meta">${escapeHtml(g.pillar_name)} · ${escapeHtml(tag)}, ${g.severity_gov} severity — $${g.cost.low.toLocaleString()}–$${g.cost.high.toLocaleString()}</span></li>`;
        })
        .join("")}</ol>`
    : `<p class="empty">No material root causes identified — programme is tracking to plan.</p>`;

  const interventionsHtml = data.interventions.length
    ? `<ol>${data.interventions.map((i) => `<li><strong>${escapeHtml(i.text)}</strong> — re: "${escapeHtml(i.gapDescription)}"</li>`).join("")}${data.recoverySteps
        .map((s) => `<li>${escapeHtml(s)}</li>`)
        .join("")}</ol>`
    : `<p class="empty">No governance escalation required — proceed to steering committee sign-off.</p>`;

  const escalationHtml = data.escalationItems.length
    ? `<ul>${data.escalationItems.map((e) => `<li><strong>[${e.escalation_level}] ${escapeHtml(e.description)}</strong> <span class="gap-meta">${e.type}, ${e.status}</span></li>`).join("")}</ul>`
    : "";

  container.innerHTML = `
    <h2>${escapeHtml(data.featureName)} — Strategy-to-Execution Health Card</h2>
    <div class="summary-meta">
      <span>TOM Feasibility Score: <strong>${data.overallScore}%</strong></span>
      <span class="gate-badge gate-${data.gateDecision.toLowerCase()}">${data.gateDecision}</span>
      <span>Total Financial Exposure: $${data.totalLow.toLocaleString()} – $${data.totalHigh.toLocaleString()}</span>
    </div>
    ${data.protectedCapitalNote ? `<p class="utilisation-summary">${data.protectedCapitalNote}</p>` : ""}
    ${data.pendingManualCostCount > 0 ? `<p class="pending-flag">${data.pendingManualCostCount} item(s) pending manual costing — not yet included above.</p>` : ""}
    ${data.utilisationImpactPct > 0 ? `<p class="utilisation-summary">Estimated utilisation impact: <strong>${data.utilisationImpactPct}%</strong> of a sprint's capacity.</p>` : ""}

    <h3>Top 3 Root Causes of Operational Rework</h3>
    ${rootCausesHtml}

    <h3>Recommended Executive Actions &amp; Governance Interventions</h3>
    ${interventionsHtml}

    ${escalationHtml ? `<h3>Open Items Requiring Escalation Beyond the Delivery Team</h3>${escalationHtml}` : ""}

    <div class="export-buttons no-print">
      <button id="print-health-card-btn" type="button">Print Health Card</button>
    </div>
  `;
}
