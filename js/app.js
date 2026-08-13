import { SAMPLE_EXPORTS } from "./config/sampleExports.js";
import { ingestAssessment } from "./ingestion/validate.js";
import { flattenGaps, computeExposure } from "./engine/financialTranslator.js";
import { seedRaidFromGaps, createManualEntry } from "./engine/raid.js";
import { sortGapsBySeverity, sortGapsByExposure, sortGapsByRaidPriority } from "./engine/sort.js";
import { buildMarkdownExport, buildRecoveryPlan, exportFilenameMd } from "./export/markdownExport.js";
import { buildExecutiveHealthCard, exportFilenameHealthCard } from "./export/executiveHealthCard.js";
import { validateManualRaidEntry, validateManualCost } from "./ui/validation.js";
import {
  showErrors,
  renderSummaryBar,
  renderGapTable,
  renderExposureSummary,
  renderRaidTable,
  renderRaidRollup,
  renderRecoveryPlan,
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
  exportMdBtn: document.getElementById("export-md-btn"),
  exportHealthCardBtn: document.getElementById("export-health-card-btn"),
  resetBtn: document.getElementById("reset-btn"),
  raidForm: document.getElementById("raid-form"),
  assumpCapacity: document.getElementById("assump-capacity"),
  assumpScale: document.getElementById("assump-scale"),
};

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

  renderSummaryBar(els.summaryBar, state.assessment);
  renderGapTable(els.gapTableBody, sortedGaps, state.manualCosts, { onManualCostChange: handleManualCostChange });
  renderExposureSummary(els.exposureSummary, exposure);
  // Stable order (not re-sorted on every edit) so a row never jumps position
  // mid-edit-session — sortEntriesByPriority remains available for the gap-list
  // toggle, which operates on a read-mostly list rather than this editable table.
  renderRaidTable(els.raidTableBody, state.raidEntries, { onFieldChange: handleRaidFieldChange });
  renderRaidRollup(els.raidRollup, state.raidEntries);
  renderRecoveryPlan(els.recoveryPlan, buildRecoveryPlan(state.assessment, exposure));

  return exposure;
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
  });

  els.resetBtn.addEventListener("click", () => {
    state = createInitialState();
    els.pasteInput.value = "";
    els.fileInput.value = "";
    els.sampleSelect.value = "";
    els.assumpCapacity.value = state.assumptions.teamSprintCapacityHours;
    els.assumpScale.value = state.assumptions.costScale;
    els.consoleSection.hidden = true;
    showErrors(els.ingestErrors, []);
  });
}

document.addEventListener("DOMContentLoaded", init);
