# Delivery Recovery & Governance Console

**🔗 Live app: [pribalky.github.io/dor-recovery-console](https://pribalky.github.io/dor-recovery-console/)**

App 2 in a two-app governance toolkit. Ingests **[`dor-gatekeeper`](https://pribalky.github.io/dor-gatekeeper/)**'s (App 1) JSON export and adds what App 1 deliberately excludes: financial exposure modeling, RAID tracking, escalation paths, and executive-ready recovery reporting for anything that comes back CONDITIONAL/BLOCKED.

Fully static. **No backend, no database, no build step, no `npm install`.** Plain HTML/CSS/JavaScript (ES modules), runs entirely in the browser, deploys straight to GitHub Pages.

---

## Quick start

```bash
git clone https://github.com/pribalky/dor-recovery-console.git
cd dor-recovery-console
python3 -m http.server 8000   # any static file server works
```

Open `http://localhost:8000/`, then pick **"Best — fully ready"** or **"Very Bad — not ready"** from the sample dropdown and click **Validate & Load** to see it working end to end.

```bash
node tests/run.js   # run the test suite (no npm install needed)
```

Requires only a modern browser (ES modules) and Node.js ≥ 18 for the test runner. Opening `index.html` directly via `file://` will **not** work — ES module imports require an HTTP origin.

---

## How it works

```
[ App 1 JSON Export ] ──► [ Ingestion & Validation ]
                                    │
       ┌────────────────┬──────────┼──────────┬─────────────────┐
       ▼                ▼          ▼          ▼                 ▼
 [ Financial     [ RAID Log +  [ NFR Gateway  [ Rework Risk  [ Executive Summary
  Translator ]    Escalation ]     View ]        Score ]      + Recovery Plan ]
       │                │          │          │                 │
       └────────────────┴──────────┴──────────┴─────────────────┘
                                    ▼
                [ Markdown / Health Card / ADR / Print-to-PDF ]
```

Everything runs client-side against a single in-memory console state (`js/state.js`). No network calls, no server, nothing persisted beyond what you explicitly export. `severity_gov` and `category_tag`, inherited from the App 1 export, are **never mutated** — this app only ever adds derived data alongside them (`DECISIONS.md`).

The page itself is the same **"Tabbed Spread"** layout as App 1: a persistent sticky `<aside>` (summary + every export/print button) beside a `<main>` tab bar (Gap Analysis & Financial Impact, RAID Log, NFR Gateway Exposure, Rework Risk & Remediation, Recovery Plan) — themed as **"Ledger"** (warm paper, ink-navy/oxblood, `IBMPlexSerif`/`InstrumentSans`/`IBMPlexMono`). See `DECISIONS.md` #29.

---

## Project structure

```
dor-recovery-console/
├── index.html                        # single-page app shell (Tabbed Spread: aside + tab-nav/tab-panels)
├── assets/css/styles.css             # Ledger design tokens + @font-face + @media print rules for exec exports
├── assets/fonts/                     # IBMPlexSerif/InstrumentSans/IBMPlexMono, Regular+Bold each
├── js/
│   ├── app.js                        # entry point — wires state, DOM, and every event listener
│   ├── state.js                      # in-memory console state factory
│   ├── config/
│   │   ├── costModel.js              # category_tag → cost bands (12 tags), severity multipliers, rework-hours model
│   │   ├── interventionMap.js        # category_tag → suggested governance intervention (Health Card)
│   │   ├── raidTypeMap.js            # severity_gov/category_tag → auto-seeded RAID type (Risk/Issue/Dependency)
│   │   ├── nfrGatewayMap.js          # category_tag → one of 4 NFR Gateways (or intentionally unmapped)
│   │   ├── reworkRiskConfig.js       # severity → rework-risk points, tier thresholds, remediation reference table
│   │   └── sampleExports.js          # 9 bundled sample App 1 exports (7 valid + 2 deliberately invalid)
│   ├── ingestion/
│   │   └── validate.js               # parses + validates an App 1 export (schema_version, required fields, category_tag enum)
│   ├── engine/
│   │   ├── financialTranslator.js    # per-gap cost range + utilisation %, total exposure
│   │   ├── raid.js                   # seeds RAID from gaps (type via raidTypeMap), manual entries, rollups
│   │   ├── sort.js                   # 3 sort lenses over the same gap list
│   │   ├── nfrGateway.js             # rolls exposure up by NFR Gateway
│   │   ├── reworkRisk.js             # computes the rework-risk score and tier
│   │   ├── driftCompare.js           # matches two gap lists by gap_id: new / resolved / severity-changed
│   │   ├── deepLink.js               # parses ?sample=&health-card=1#tab= from the portal
│   │   └── thresholdSignals.js       # writer half of the cross-app closed-loop signal (localStorage)
│   ├── export/
│   │   ├── markdownExport.js         # executive summary + auto-generated recovery plan
│   │   ├── executiveHealthCard.js    # Strategy-to-Execution Health Card export
│   │   └── adrExport.js              # Status/Context/Decision/Consequences ADR draft export
│   └── ui/
│       ├── validation.js             # manual RAID entry / manual cost field validation
│       └── render.js                 # renders every panel: summary, gap table, RAID table, exec summary, NFR/rework-risk/drift panels
├── tests/
│   ├── assert.js                     # ~30-line zero-dependency assertion helper
│   ├── ingestion.test.js             # all 9 sample exports (valid + invalid), schema 1.0/1.1/1.2
│   ├── financial.test.js             # cost model + severity multiplier + utilisation math, all 12 tags
│   ├── raid.test.js                  # RAID seeding + type classification, rollups, all 3 sort lenses
│   ├── export.test.js                # recovery plan + markdown + Health Card export content
│   ├── nfrGateway.test.js            # gateway mapping + rollup, hand-verified against a sample
│   ├── reworkRisk.test.js            # score/tier boundaries + hand-verified sample scores
│   ├── adrExport.test.js             # ADR draft section content
│   ├── driftCompare.test.js          # new/resolved/severity-changed classification, hand-built pairs
│   ├── deepLink.test.js              # URL parameter parsing
│   ├── thresholdSignals.test.js      # representative-gap selection, capped signal recording
│   └── run.js                        # runs every *.test.js, exits non-zero on failure
├── DECISIONS.md                      # why things are built this way (shared with App 1)
└── README.md                         # you are here
```

**Rule of thumb for where new code goes:** `config/` is data (no logic, no DOM), `engine/` is pure functions over that data (no DOM), `export/` turns engine output into a downloadable string, `ui/` is the only layer allowed to touch the DOM. `app.js` is the sole place that wires them together.

---

## Core concepts

| Concept | Shape | Where |
|---|---|---|
| **Assessment** | The ingested App 1 export, unmodified | `state.assessment` |
| **Gap** | `{ gap_id, pillar_name, description, severity_gov, category_tag, category_tag_freetext? }`, inherited from App 1 verbatim | `flattenGaps(assessment)` in `financialTranslator.js` |
| **Costed gap** | A gap + `{ cost: { low, high, unmodeled, manual, utilisationImpactPct? } }` | `computeExposure(gaps, manualCosts, assumptions)` |
| **Exposure** | `{ gaps, totalLow, totalHigh, pendingManualCostCount, utilisationImpactPct }` — the single source every export/panel reads from | same |
| **RAID entry** | `{ raid_id, type, description, owner, status, priority, date_raised, target_resolution_date, escalation_level, source_gap_id }` | `seedRaidFromGaps(gaps)` + manual entries in `engine/raid.js` |

`category_tag` drives every downstream view via a small lookup table per concern — this is the core extension pattern in this app:

| Lookup | File | Maps `category_tag` to |
|---|---|---|
| Cost | `config/costModel.js` | `{ driver, basis, low, high }` |
| RAID type | `config/raidTypeMap.js` | `"R" \| "I" \| "D"` (severity `High` always wins as `"R"`) |
| Governance intervention | `config/interventionMap.js` | a suggested Health Card action |
| NFR Gateway | `config/nfrGatewayMap.js` | one of 4 gateways, or unmapped |

**Assumptions are adjustable, not hardcoded:** Team Sprint Capacity (hours) and Cost Model Scale (×) normalize the illustrative cost bands to your own team/engagement without editing code. Manually-entered "Other" costs are never rescaled by either.

---

## Features

**Ingestion**
- Paste, upload, or pick from 9 bundled sample exports (7 valid across `schema_version` 1.0/1.1/1.2, 2 deliberately invalid to exercise the rejection path). Every rejection reason is specific and visible — malformed JSON, unsupported `schema_version`, missing required field, invalid `gate_decision`, unrecognised `category_tag`, missing `category_tag_freetext` on an `"Other"` gap.

**Financial exposure**
- Every gap auto-costed by `category_tag` × `severity_gov` across all 12 supported tags. `"Other"`-tagged gaps require manual cost entry — never silently costed at zero.
- Adjustable Team Sprint Capacity and Cost Model Scale controls.
- 3 sort lenses over the same gap list: Severity (default), $ Exposure, RAID Priority.

**RAID log**
- One entry auto-seeded per gap, classified as Risk/Issue/Dependency from `severity_gov`/`category_tag` (not always "Risk"). Owner, Status, Target Resolution, and Escalation Level are editable inline; add Assumptions/Issues/Dependencies manually.
- Every gap row shows a live `RAID: {type} · {status}` badge linking back to the RAID entry it seeded.

**Cross-cutting views**
- **NFR Gateway Exposure** — the same gaps regrouped by 4 PRD-defined gateways (Resilience & Failure Mode / Cost & Resource Limit / Security & OWASP / Performance & Scale) instead of by pillar. `Lineage`/`Probity` gaps are intentionally excluded from all 4 and flagged via an explicit count, not silently dropped.
- **Rework Risk & Remediation** — a severity-weighted score (High 10 / Med 5 / Low 2 points per open gap) classified into Low/Medium/High tiers with escalation guidance, plus a reference table of 3 remediation pathways — **Hard Reversion / Emergency Gate Review / Tech Debt Isolation** (`DECISIONS.md` #32) — reference only, never auto-selected. A Medium/High-tier load also writes a small diagnostic signal to same-origin `localStorage`, read by `dor-gatekeeper` as an advisory suggestion — see [Closed-loop tuning](#closed-loop-tuning-cross-app) below.
- **Baseline Drift** — the State Sync Bridge's receiving half: paste/upload a `dor-gatekeeper` "Baseline" export from earlier alongside the currently-loaded "current" assessment, and see what changed — New Since Baseline / Resolved Since Baseline / Severity Changed, matched by `gap_id`. On-demand, one-shot comparison, not a live sync (`DECISIONS.md` #30).

**Executive exports**
- **Markdown recovery brief** — total exposure, top exposure gaps, RAID rollups, auto-generated recovery plan.
- **Executive Strategy-to-Execution Health Card** — TOM Feasibility Score, Total Financial Exposure reframed as **Protected Capital** (`DECISIONS.md` #32), Top 3 Root Causes of Operational Rework, and mapped governance interventions. Renders an on-screen preview with its own **Print Health Card** button, so "Save as PDF" captures the Health Card, not the Recovery Plan panel.
- **ADR draft** — a standard Status/Context/Decision/Consequences record, auto-populated from the top exposure gaps and the same recovery-plan steps.
- **Print / Save as PDF** — native browser print, no PDF library.

---

## Extending this app

### Add a `category_tag` (matching a new one added in `dor-gatekeeper`)
1. Add an entry to `js/config/costModel.js`'s `CATEGORY_COST_MODEL`: `{ driver, basis, low, high }`. `KNOWN_CATEGORY_TAGS` (used by ingestion validation) derives from this object's keys automatically.
2. Add the new `schema_version` to `SUPPORTED_SCHEMA_VERSIONS` in `js/ingestion/validate.js`, or the export gets rejected outright.
3. Optionally map it in `nfrGatewayMap.js` (leave unmapped if it genuinely isn't one of the 4 gateways), `raidTypeMap.js` (default is `"I"` Issue unless you add a rule), and `interventionMap.js` (falls back to a generic intervention if omitted).
4. If the tag also needs a utilisation-% (rework hours) figure, add it to `REWORK_HOURS_MODEL` and to the `UTILISATION_TAGS` set — otherwise it's skipped, not zeroed.

### Add a new bundled sample export
Add a fixture to `js/config/sampleExports.js`: an object matching App 1's export shape, added to both `VALID_SAMPLE_ASSESSMENTS` (keyed by id, used directly in tests) and `SAMPLE_EXPORTS` (the dropdown list, `{ id, label, raw: JSON.stringify(...) }`).

### Add a new cross-cutting view (like NFR Gateway or Rework Risk)
1. Config: a plain lookup or thresholds object in `js/config/`, no logic.
2. Engine: a pure function in `js/engine/` that takes already-computed `exposure`/`gaps` and returns a derived rollup — never recompute cost/exposure from scratch.
3. UI: a render function in `js/ui/render.js`, called from `app.js`'s `recompute()`.
4. Test: hand-calculate the expected numbers against one of the 9 bundled samples and assert against that — see `tests/nfrGateway.test.js` / `tests/reworkRisk.test.js` for the pattern.

### Add a new export format
Follow the pattern in `js/export/*.js`: a pure `buildXyz(assessment, exposure, ...)` returning a string (reuse `topExposureGaps`/`buildRecoveryPlan` from `markdownExport.js` rather than recomputing), plus `exportFilenameXyz(featureName, assessmentId)`. Wire a button into `index.html` and call `downloadFile(...)` from `app.js`. Add `tests/xyzExport.test.js` and import it from `tests/run.js`.

---

## Testing

```bash
node tests/run.js
```

Zero-dependency custom runner (`tests/assert.js` + `tests/run.js`, an independent copy of App 1's — the two repos are deliberately decoupled). Every `*.test.js` in `tests/` is imported by `run.js`; add new ones there.

`.github/workflows/test.yml` runs this same `node tests/run.js` on every push/PR to `main` — no `npm install` there either, just a Node runtime.

---

## Deploying to GitHub Pages

No build step, so no Actions workflow is required for the app itself:

1. Push to `main`.
2. Repo Settings → Pages → **Deploy from a branch** → branch `main`, folder `/ (root)`.
3. Save. Live at `https://<owner>.github.io/dor-recovery-console/` within a minute or two.

`.nojekyll` is included so GitHub Pages serves `js/`/`assets/` as-is without Jekyll processing.

---

## Data contract (App 1 ingestion)

Expects the JSON shape App 1 exports:

```json
{
  "schema_version": "1.0",
  "assessment_id": "…",
  "assessment_date": "…",
  "feature_name": "…",
  "overall_score": 82.5,
  "gate_decision": "CONDITIONAL",
  "pillars": [
    {
      "pillar_name": "…",
      "pillar_score": 70,
      "gaps": [
        { "gap_id": "…", "description": "…", "severity_gov": "High", "category_tag": "PII" }
      ]
    }
  ]
}
```

`schema_version` `"1.0"`/`"1.1"`/`"1.2"` are all accepted — each additive, same shape, progressively extending the `category_tag` enum. Malformed JSON, an unsupported `schema_version`, a missing required field, an invalid `gate_decision`, an unrecognised `category_tag`, or a missing `category_tag_freetext` on an `"Other"` gap are all rejected with a specific, visible error — never silently.

Cost bands in `js/config/costModel.js` are illustrative placeholders, not real actuarial or contractual figures — see `DECISIONS.md` #11, #20.

---

## Closed-loop tuning (cross-app)

`dor-gatekeeper` and `dor-recovery-console` are both served under the same GitHub Pages host (`pribalky.github.io/dor-gatekeeper/` and `pribalky.github.io/dor-recovery-console/`) — browser origin is protocol+host+port only, not path, so both pages share one origin and one `localStorage`. This app writes a small diagnostic signal (`js/engine/thresholdSignals.js`, key `dor:reworkSignals`, capped at 20) once per loaded assessment whose Rework Risk tier is Medium or High; `dor-gatekeeper` reads the same key and surfaces an advisory "this pillar keeps driving rework" suggestion — never an auto-applied threshold change. Single-browser/single-device only; not a live sync across people. See `DECISIONS.md` #33.

## Related docs

- **`DECISIONS.md`** — the "why," including trade-offs, for every non-obvious choice in this repo (numbered, cross-referenced with App 1).
- **[`dor-gatekeeper`](https://github.com/pribalky/dor-gatekeeper)** — the upstream app this one ingests from.

## Out of scope

Re-scoring App 1's governance/architecture criteria, real-time API billing telemetry, automated policy/CI-CD enforcement (that's App 1's job), and actual bid/proposal or CoP tooling. See `DECISIONS.md`'s roadmap entry for the full list of PRD items deliberately deferred because they require a backend.
