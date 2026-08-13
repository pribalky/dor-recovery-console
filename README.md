# Delivery Recovery & Governance Console

**🔗 Live app: [pribalky.github.io/dor-recovery-console](https://pribalky.github.io/dor-recovery-console/)**

App 2 in the two-app governance toolkit. Ingests [`dor-gatekeeper`](https://pribalky.github.io/dor-gatekeeper/)'s (App 1) JSON export and adds what App 1 deliberately excludes: financial exposure modeling, RAID tracking, escalation paths, and an executive-ready recovery brief.

Fully static. No backend, no build step, no npm install. Runs entirely in the browser and deploys straight to GitHub Pages.

---

## Architecture

```
[ App 1 JSON Export ] ──► [ Ingestion & Validation ]
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
  [ Financial Translator ]   [ RAID Log + Escalation ]  [ Re-classification Toggle ]
              │                     │                     │
              └─────────────────────┴─────────────────────┘
                                    ▼
                     [ Executive Summary + Recovery Plan ]
                                    ▼
                        [ Markdown / Print-to-PDF ]
```

Everything runs client-side against a single in-memory console state. No network calls, no server, nothing persisted beyond what you explicitly export. `severity_gov` and `category_tag`, inherited from the App 1 export, are never mutated (see `DECISIONS.md`).

## Folder Structure

```
dor-recovery-console/
├── index.html                     # single-page app shell
├── assets/css/styles.css          # styling + @media print rules for the exec summary
├── js/
│   ├── app.js                      # entry point: wires state + DOM + event listeners
│   ├── state.js                    # in-memory console state factory
│   ├── config/
│   │   ├── costModel.js            # category_tag → cost bands, severity multipliers, utilisation constants
│   │   └── sampleExports.js        # 6 bundled sample App 1 exports (4 valid + 2 deliberately invalid)
│   ├── ingestion/
│   │   └── validate.js             # parses + validates an App 1 export against the schema
│   ├── engine/
│   │   ├── financialTranslator.js  # per-gap cost range + utilisation %, total exposure
│   │   ├── raid.js                 # seeds RAID from gaps, manual entries, rollups
│   │   └── sort.js                 # 3 sort lenses over the same gap list
│   ├── export/
│   │   └── markdownExport.js       # executive summary + auto-generated recovery plan
│   └── ui/
│       ├── validation.js           # manual RAID entry / manual cost field validation
│       └── render.js                # renders summary, gap table, RAID table, exec summary
├── tests/
│   ├── assert.js                    # ~30-line zero-dependency assertion helper
│   ├── ingestion.test.js            # all 6 sample exports (valid + invalid)
│   ├── financial.test.js            # cost model + severity multiplier + utilisation math
│   ├── raid.test.js                 # RAID seeding, rollups, all 3 sort lenses
│   ├── export.test.js               # recovery plan + markdown export content
│   └── run.js                       # runs all *.test.js, exits non-zero on failure
├── DECISIONS.md                    # shared rationale doc (cross-referenced with App 1)
└── README.md
```

## Using It

1. **Ingest** — paste an App 1 JSON export, upload a `.json` file, or pick one of the 6 bundled samples from the dropdown (4 valid, spanning APPROVED→BLOCKED; 2 deliberately invalid, to show the rejection path). Click **Validate & Load**.
2. **Gap Analysis & Financial Impact** — every gap from the export is auto-costed by `category_tag` and `severity_gov`. `Other`-tagged gaps show "requires manual costing" with two input fields — enter a range and it folds into the total.
3. **Assumptions** — two adjustable controls sit above the gap table: **Team Sprint Capacity (hours)** (the utilisation-% denominator) and **Cost Model Scale (×)** (multiplies every category's $ band). Use these to normalize the illustrative figures to your own team size/engagement without editing code — manually-entered `Other` costs are never rescaled. See `DECISIONS.md` #11, #17.
4. **Sort** — toggle the gap list between Severity (default, inherited from App 1), $ Exposure, and RAID Priority. All three are lenses on the same list, not separate data.
5. **RAID Log** — one Risk entry is auto-seeded per gap. Owner, Status, Target Resolution, and Escalation Level are editable directly in the table for every entry, seeded or manual (Type/Description/Date Raised stay fixed). Add Assumptions/Issues/Dependencies manually via the form below the table.
6. **Executive Summary & Recovery Plan** — auto-compiled from the above: total exposure, utilisation impact, top exposure gaps, RAID rollups, and a recovery plan. Export as Markdown, or use **Print / Save as PDF** (native browser print, no PDF library).

## Running Locally

ES module imports require an HTTP origin — opening `index.html` directly via `file://` will fail in Chrome/Firefox. Serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Running Tests

```bash
node tests/run.js
```

No `npm install` required — `package.json` only sets `"type": "module"` so Node's native ESM loader can import the same files the browser uses.

## Deploying to GitHub Pages

No build step, so no Actions workflow is required:

1. Push to `main`.
2. Repo Settings → Pages → **Deploy from a branch** → branch `main`, folder `/ (root)`.
3. Save. The app is live at `https://<owner>.github.io/dor-recovery-console/` within a minute or two.

`.nojekyll` is included so GitHub Pages serves the `js/`/`assets/` folders as-is without Jekyll processing.

## Data Contract (App 1 Ingestion)

Expects the JSON shape App 1 exports: `schema_version` ("1.0"), `assessment_id`, `assessment_date`, `feature_name`, `overall_score`, `gate_decision`, and `pillars[]` (each with `pillar_name`, `pillar_score`, and `gaps[]` carrying `gap_id`, `description`, `severity_gov`, `category_tag`, and `category_tag_freetext` when `category_tag` is `"Other"`). Malformed JSON, an unsupported `schema_version`, a missing required field, an invalid `gate_decision`, an unrecognised `category_tag`, or a missing `category_tag_freetext` on an `Other` gap are all rejected with a specific, visible error message — never silently.

Cost bands in `js/config/costModel.js` are illustrative placeholders, not real actuarial or contractual figures — see `DECISIONS.md` #11.

## Out of Scope

Re-scoring App 1's governance/architecture criteria, real-time API billing telemetry, automated policy/CI-CD enforcement, and actual bid/proposal or CoP tooling — see `DECISIONS.md` for the reasoning.
