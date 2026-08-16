import { SAMPLE_EXPORTS } from "./config/sampleExports.js";
import { ingestAssessment } from "./ingestion/validate.js";
import { flattenGaps, computeExposure } from "./engine/financialTranslator.js";
import { seedRaidFromGaps, createManualEntry } from "./engine/raid.js";
import { sortGapsBySeverity, sortGapsByExposure, sortGapsByRaidPriority } from "./engine/sort.js";
import { buildMarkdownExport, buildRecoveryPlan, exportFilenameMd } from "./export/markdownExport.js";
import { buildExecutiveHealthCard, buildHealthCardData, exportFilenameHealthCard } from "./export/executiveHealthCard.js";
import { buildAdrDraft, exportFilenameAdr } from "./export/adrExport.js";
import { rollupByGateway } from "./engine/nfrGateway.js";
import { computeReworkRiskScore, classifyReworkTier, escalationTextForTier } from "./engine/reworkRisk.js";
import { compareGapSets } from "./engine/driftCompare.js";
import { validateManualRaidEntry, validateManualCost } from "./ui/validation.js";
import {
  showErrors,
  renderSummaryBar,
  renderGapTable,
  renderExposureSummary,
  renderRaidTable,
  renderRaidRollup,
  renderRecoveryPlan,
  renderHealthCardPreview,
  renderNfrGatewayPanel,
  renderReworkRiskPanel,
  renderDriftResult,
} from "./ui/render.js";
import { createInitialState, todayIso } from "./state.js";

let state = createInitialState();

const els = {
  pasteInput: document.getElementById("paste-input"),
  fileInput: document.getElementById("file-input"),
  sampleSelect: document.getElementById("sample-select"),
  loadBtn: document.getElementById("load-btn"),
  ingestErrors: document.getElementById("ingest-errors"),
  consoleSection: document.getElementById("console-section"),
  summaryBar: document.getElementById("summary-bar"),
  sortButtons: document.querySelectorAll(".sort-btn"),
  gapTableBody: document.getElementById("gap-table-body"),
  exposureSummary: document.getElementById("exposure-summary"),
  raidTableBody: document.getElementById("raid-table-body"),
  raidRollup: document.getElementById("raid-rollup"),
  recoveryPlan: document.getElementById("recovery-plan"),
  nfrGatewayPanel: document.getElementById("nfr-gateway-panel"),
  reworkRiskPanel: document.getElementById("rework-risk-panel"),
  exportMdBtn: document.getElementById("export-md-btn"),
  exportHealthCardBtn: document.getElementById("export-health-card-btn"),
  exportAdrBtn: document.getElementById("export-adr-btn"),
  printRecoveryBtn: document.getElementById("print-recovery-btn"),
  healthCardPreview: document.getElementById("health-card-preview"),
  resetBtn: document.getElementById("reset-btn"),
  raidForm: document.getElementById("raid-form"),
  assumpCapacity: document.getElementById("assump-capacity"),
  assumpScale: document.getElementById("assump-scale"),
  driftBaselineInput: document.getElementById("drift-baseline-input"),
  driftBaselineFile: document.getElementById("drift-baseline-file"),
  driftCompareBtn: document.getElementById("drift-compare-btn"),
  driftErrors: document.getElementById("drift-errors"),
  driftResult: document.getElementById("drift-result"),
  tabButtons: document.querySelectorAll(".tab-nav [role='tab']"),
  tabPanels: document.querySelectorAll(".tab-panel"),
};

function switchTab(tabId) {
  els.tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabId;
    btn.setAttribute("aria-selected", String(isActive));
    btn.tabIndex = isActive ? 0 : -1;
  });
  els.tabPanels.forEach((panel) => {
    const isActive = panel.id === `tab-${tabId}`;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
}

// Left/Right arrow keys move focus between tabs and activate the newly focused one,
// matching the standard ARIA tabs keyboard pattern (native <button>s already give
// Tab/Enter/Space for free) — same pattern as dor-gatekeeper's app.js.
function handleTabKeydown(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const buttons = Array.from(els.tabButtons);
  const currentIndex = buttons.indexOf(event.target);
  if (currentIndex === -1) return;
  const delta = event.key === "ArrowRight" ? 1 : -1;
  const next = buttons[(currentIndex + delta + buttons.length) % buttons.length];
  next.focus();
  switchTab(next.dataset.tab);
}

function populateSampleSelect() {
  els.sampleSelect.innerHTML =
    `<option value="">— Load a sample App 1 export —</option>` +
    SAMPLE_EXPORTS.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
}

function handleLoad(text) {
  const { assessment, errors } = ingestAssessment(text);
  showErrors(els.ingestErrors, errors);
  if (!assessment) {
    els.consoleSection.hidden = true;
    return;
  }

  state.assessment = assessment;
  state.manualCosts = {};
  state.raidEntries = seedRaidFromGaps(flattenGaps(assessment), todayIso());
  state.sortMode = "severity";
  els.sortButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.sort === "severity"));
  els.assumpCapacity.value = state.assumptions.teamSprintCapacityHours;
  els.assumpScale.value = state.assumptions.costScale;
  els.consoleSection.hidden = false;
  recompute();
}

function recompute() {
  if (!state.assessment) return null;

  const gaps = flattenGaps(state.assessment);
  const exposure = computeExposure(gaps, state.manualCosts, state.assumptions);

  let sortedGaps;
  if (state.sortMode === "exposure") sortedGaps = sortGapsByExposure(exposure.gaps);
  else if (state.sortMode === "raid") sortedGaps = sortGapsByRaidPriority(exposure.gaps, state.raidEntries);
  else sortedGaps = sortGapsBySeverity(exposure.gaps);

  const raidByGapId = new Map(state.raidEntries.filter((e) => e.source_gap_id).map((e) => [e.source_gap_id, e]));

  renderSummaryBar(els.summaryBar, state.assessment);
  renderGapTable(els.gapTableBody, sortedGaps, state.manualCosts, raidByGapId, { onManualCostChange: handleManualCostChange });
  renderExposureSummary(els.exposureSummary, exposure);
  // Stable order (not re-sorted on every edit) so a row never jumps position
  // mid-edit-session — sortEntriesByPriority remains available for the gap-list
  // toggle, which operates on a read-mostly list rather than this editable table.
  renderRaidTable(els.raidTableBody, state.raidEntries, { onFieldChange: handleRaidFieldChange });
  renderRaidRollup(els.raidRollup, state.raidEntries);
  renderRecoveryPlan(els.recoveryPlan, buildRecoveryPlan(state.assessment, exposure));

  renderNfrGatewayPanel(els.nfrGatewayPanel, rollupByGateway(exposure));

  const reworkScore = computeReworkRiskScore(gaps);
  const reworkTier = classifyReworkTier(reworkScore);
  renderReworkRiskPanel(els.reworkRiskPanel, { score: reworkScore, tier: reworkTier, escalationText: escalationTextForTier(reworkTier) });

  // Keep an already-open Health Card preview live too, so an edit (e.g. RAID status)
  // made after generating it doesn't leave a stale preview on screen.
  if (!els.healthCardPreview.hidden) {
    renderHealthCard(exposure);
  }

  return exposure;
}

function renderHealthCard(exposure) {
  const data = buildHealthCardData(state.assessment, exposure, state.raidEntries);
  renderHealthCardPreview(els.healthCardPreview, data);
  const printBtn = document.getElementById("print-health-card-btn");
  printBtn?.addEventListener("click", () => {
    document.body.classList.add("printing-health-card");
    window.print();
  });
}

function handleRaidFieldChange(raidId, field, value) {
  const entry = state.raidEntries.find((e) => e.raid_id === raidId);
  if (!entry) return;
  entry[field] = value;
  recompute();
}

function handleAssumptionChange(field, rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) return;
  state.assumptions = { ...state.assumptions, [field]: value };
  recompute();
}

function handleManualCostChange(gapId, field, rawValue) {
  const value = rawValue === "" ? undefined : Number(rawValue);
  const existing = state.manualCosts[gapId] || {};
  const updated = { ...existing, [field]: value };

  if (Number.isFinite(updated.low) && Number.isFinite(updated.high)) {
    const errors = validateManualCost(updated);
    if (errors.length > 0) {
      showErrors(els.ingestErrors, errors);
      return;
    }
  }
  showErrors(els.ingestErrors, []);

  state.manualCosts[gapId] = updated;
  recompute();
}

function handleSortClick(mode) {
  state.sortMode = mode;
  els.sortButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.sort === mode));
  recompute();
}

function handleRaidFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.raidForm);
  const entry = {
    type: formData.get("type"),
    description: formData.get("description"),
    owner: formData.get("owner"),
    status: formData.get("status"),
    dateRaised: formData.get("dateRaised") || todayIso(),
    targetResolutionDate: formData.get("targetResolutionDate"),
    escalationLevel: formData.get("escalationLevel"),
  };

  const errors = validateManualRaidEntry(entry);
  if (errors.length > 0) {
    showErrors(els.ingestErrors, errors);
    return;
  }
  showErrors(els.ingestErrors, []);

  state.raidEntries.push(createManualEntry(entry, crypto.randomUUID()));
  els.raidForm.reset();
  recompute();
}

function handleDriftCompare() {
  const text = els.driftBaselineInput.value.trim();
  if (!text) {
    showErrors(els.driftErrors, ["Paste or upload a Baseline export first."]);
    return;
  }
  if (!state.assessment) {
    showErrors(els.driftErrors, ["Load a current assessment above before comparing."]);
    return;
  }

  const { assessment: baseline, errors } = ingestAssessment(text);
  if (!baseline) {
    showErrors(els.driftErrors, errors);
    els.driftResult.innerHTML = "";
    return;
  }
  showErrors(els.driftErrors, []);

  const baselineGaps = flattenGaps(baseline);
  const currentGaps = flattenGaps(state.assessment);
  const drift = compareGapSets(baselineGaps, currentGaps);
  renderDriftResult(els.driftResult, drift);
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function init() {
  populateSampleSelect();

  els.loadBtn.addEventListener("click", () => {
    if (els.pasteInput.value.trim()) {
      handleLoad(els.pasteInput.value);
    } else {
      showErrors(els.ingestErrors, ["Paste a JSON export, or choose a file / sample first."]);
    }
  });

  els.fileInput.addEventListener("change", () => {
    const file = els.fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      els.pasteInput.value = reader.result;
      handleLoad(reader.result);
    };
    reader.readAsText(file);
  });

  els.sampleSelect.addEventListener("change", () => {
    const sample = SAMPLE_EXPORTS.find((s) => s.id === els.sampleSelect.value);
    if (!sample) return;
    els.pasteInput.value = sample.raw;
    handleLoad(sample.raw);
  });

  els.sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleSortClick(btn.dataset.sort));
  });

  els.raidForm.addEventListener("submit", handleRaidFormSubmit);

  els.assumpCapacity.addEventListener("change", () => handleAssumptionChange("teamSprintCapacityHours", els.assumpCapacity.value));
  els.assumpScale.addEventListener("change", () => handleAssumptionChange("costScale", els.assumpScale.value));

  els.exportMdBtn.addEventListener("click", () => {
    const exposure = recompute();
    if (!exposure) return;
    const md = buildMarkdownExport(state.assessment, exposure, state.raidEntries);
    downloadFile(exportFilenameMd(state.assessment.feature_name, state.assessment.assessment_id), md, "text/markdown");
  });

  els.exportHealthCardBtn.addEventListener("click", () => {
    const exposure = recompute();
    if (!exposure) return;
    const md = buildExecutiveHealthCard(state.assessment, exposure, state.raidEntries);
    downloadFile(exportFilenameHealthCard(state.assessment.feature_name, state.assessment.assessment_id), md, "text/markdown");

    // Also render the on-screen preview so "Print Health Card" has real DOM content
    // to print — a downloaded .md file alone can't be captured by window.print().
    els.healthCardPreview.hidden = false;
    renderHealthCard(exposure);
    els.healthCardPreview.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.exportAdrBtn.addEventListener("click", () => {
    const exposure = recompute();
    if (!exposure) return;
    const md = buildAdrDraft(state.assessment, exposure);
    downloadFile(exportFilenameAdr(state.assessment.feature_name, state.assessment.assessment_id), md, "text/markdown");
  });

  els.printRecoveryBtn.addEventListener("click", () => {
    // The Recovery Plan tab must be the one revealed for print, regardless of which
    // tab is on screen when this button (in the persistent aside) is clicked.
    switchTab("recovery");
    document.body.classList.remove("printing-health-card");
    window.print();
  });

  els.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    btn.addEventListener("keydown", handleTabKeydown);
  });

  els.driftBaselineFile.addEventListener("change", () => {
    const file = els.driftBaselineFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      els.driftBaselineInput.value = reader.result;
    };
    reader.readAsText(file);
  });

  els.driftCompareBtn.addEventListener("click", handleDriftCompare);

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-health-card");
  });

  els.resetBtn.addEventListener("click", () => {
    state = createInitialState();
    els.pasteInput.value = "";
    els.fileInput.value = "";
    els.sampleSelect.value = "";
    els.assumpCapacity.value = state.assumptions.teamSprintCapacityHours;
    els.assumpScale.value = state.assumptions.costScale;
    els.consoleSection.hidden = true;
    els.healthCardPreview.hidden = true;
    els.healthCardPreview.innerHTML = "";
    els.driftBaselineInput.value = "";
    els.driftBaselineFile.value = "";
    els.driftResult.innerHTML = "";
    showErrors(els.driftErrors, []);
    showErrors(els.ingestErrors, []);
  });
}

document.addEventListener("DOMContentLoaded", init);
