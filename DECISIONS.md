# DECISIONS.md

This file documents non-obvious architectural and scoping decisions across both apps (DoR Gatekeeper / App 1 and Delivery Recovery & Governance Console / App 2). Each entry: what was decided, why, and what it trades off. Intended to be read by anyone reviewing the codebase — including future-me — without needing to re-derive the reasoning.

This file is cross-referenced from both repos (`dor-gatekeeper` and `dor-recovery-console`); entries 1–10 apply to both apps, entries 11+ are App 2 (this repo) implementation decisions.

---

## 1. Two apps, not one

**Decision:** Split into App 1 (DoR Gatekeeper) and App 2 (Delivery Recovery & Governance Console) instead of one combined tool.

**Why:** App 1's use case is a fast, repeatable intake check (target: ~3 minutes, run on every feature/story). App 2's use case (financial modeling, RAID tracking, executive reporting) only triggers for programs already flagged CONDITIONAL/BLOCKED or actively recovering. Combining them would force every intake check through a heavier UI, killing adoption. This also mirrors the PRD's own governance maturity spectrum (Option 1 → 2 → 3) — bolting everything into one app pushes Option 2 toward Option 3 territory prematurely.

**Trade-off:** Requires a defined handoff contract between the two apps instead of shared internal state.

---

## 2. Loosely coupled via JSON export, not a shared database

**Decision:** App 1 emits a versioned JSON file. App 2 ingests it via upload/paste. No shared backend, no live API call between them.

**Why:** Keeps both apps independently deployable, independently demoable, and free-hostable (no server-to-server auth/networking to manage). It also mirrors how real handoffs between governance and delivery functions actually work in practice — a defined contract at a boundary, not shared mutable state.

**Trade-off:** No real-time sync — App 2 always reflects a point-in-time snapshot from when the JSON was exported, not live App 1 state.

---

## 3. `severity_gov` is set once by App 1 and is immutable downstream

**Decision:** App 1's governance severity rating (High/Med/Low) is never overwritten by App 2. App 2 can re-rank/sort display order using its own financial or RAID-priority lenses, but the original governance rating is always preserved and visible.

**Why:** Preserves audit integrity. The governance/architecture lens (App 1) and the commercial/business lens (App 2) are legitimately different views on the same gap — a gap might be Med severity architecturally but High priority financially. Overwriting the original would destroy the audit trail of what governance actually flagged at assessment time.

**Trade-off:** Requires the UI to always show both the original and re-ranked values, adding a small amount of display complexity.

---

## 4. `category_tag` is a fixed enum with an `Other` escape hatch

**Decision:** Gap categorization uses a closed set of tags (PII, Fallback, RateLimit, Consent, HITL, Lineage, NFR) plus `Other` with a required freetext field.

**Why:** A fixed enum is what allows App 2's Financial Impact Translator to auto-map gaps to cost buckets without manual tagging — this is the mechanism that makes the financial layer actually automatic instead of manual guesswork. `Other` exists because rigid enums break on edge cases; without an escape hatch, novel gap types would either be miscategorized or block the pipeline entirely.

**Trade-off:** `Other`-tagged gaps can't be auto-costed — they're flagged as "requires manual costing" and never silently excluded from totals, but they do require human input to fully resolve.

---

## 5. `schema_version` field on every export

**Decision:** Every JSON export from App 1 carries an explicit schema version.

**Why:** If App 1's enum or schema changes in the future (e.g. a new category_tag is added), App 2 needs to detect version mismatches and fail loudly with a clear error — not silently misparse or crash on an unexpected field. This is a small addition now that prevents a much harder-to-debug failure mode later.

**Trade-off:** None meaningful — near-zero cost to include.

---

## 6. Financial exposure is expressed as a range, never a point estimate

**Decision:** The Financial Impact Translator outputs low/high $ ranges per gap and in aggregate, never a single number.

**Why:** A single number implies false precision and invites a stakeholder to challenge the exact figure rather than engage with the underlying uncertainty. A range signals the estimate is honest about its own confidence and shifts the conversation toward decision-making under that range — which is a more defensible and more senior way to present unmodeled risk.

**Trade-off:** Ranges are less "clean" for simple dashboard summaries — requires slightly more UI thought than a single KPI number.

---

## 7. `escalation_level` is a first-class RAID field, set at creation

**Decision:** Every RAID entry carries an explicit `escalation_level` (Team / Programme / Steering Committee / Client Exec), assigned when the entry is created, not decided reactively later.

**Why:** Escalation calibration is one of the core evaluated skills for a delivery leadership role. Making it a structured field — rather than an implicit judgment buried in a status update — makes the discipline visible and auditable, and gives a concrete, demonstrable answer to "how do you handle escalation" instead of an abstract claim.

**Trade-off:** Requires the assessor to make an escalation call up front, which may need revision as an issue evolves — status/level should be editable, not fixed forever.

---

## 8. No auth, no persistent database, no multi-tenancy (deliberately)

**Decision:** Neither app has authentication, a real database, or concurrent multi-user handling in v1.

**Why:** This is a portfolio-stage tool demonstrating architectural and governance thinking, not a production system with real client data. Building auth/persistence/scale now would be effort spent on a problem that doesn't exist yet (no real users, no real data sensitivity) instead of on the actual signal being tested (governance design, financial reasoning, executive communication).

**Trade-off:** Not usable as-is for a real client engagement — would need all three before any production use. This is explicitly out of scope and stated as such, not an oversight.

---

## 9. No CI/CD policy enforcement, no bid/proposal tooling, no CoP features

**Decision:** These are explicitly not built, even though they map to real JD/business needs (Option 3 governance spectrum, commercial account growth, mentoring/community of practice).

**Why:** These are either (a) a different point on the governance maturity spectrum requiring a real client-driven trigger to justify (CI/CD enforcement), or (b) organizational functions rather than app functions (bids, mentoring) that a dedicated feature wouldn't meaningfully prove better than clear documentation of design intent. The schema/enum structure is intentionally designed to be *extensible* by other teams without rebuilding the scoring engine — that's the actual answer to "how does this support broader reuse," not a built feature.

**Trade-off:** None — this is scope discipline, not a gap. Reviewers should read this as evidence of judgment about what not to build, not as missing functionality.

---

## 10. Fully static, client-side build (no backend server)

**Decision:** Both apps are built as static React/JS applications with all scoring, cost-mapping, and RAID logic running in-browser. No Python/Streamlit server, no backend of any kind.

**Why:** None of the actual computation requires a server — scoring is deterministic weighted math, cost mapping is a lookup table, RAID is local state, and the App1→App2 handoff is a file, not a live API call. Removing the backend entirely eliminates cold-start/sleep behavior (a real problem on free-tier Streamlit hosting), removes a whole class of infra failure modes, and allows permanent free hosting via GitHub Pages tied directly to the repo.

**Trade-off:** Required porting logic from the originally-scoped Python/Streamlit approach to JS/TS — a real one-time rebuild cost, accepted because this is intended as a long-term portfolio artifact, not a single-use demo.

---

## 11. Cost bands are illustrative placeholders, explicitly labeled as estimates — normalized via an Assumptions panel, not code edits

**Decision:** `js/config/costModel.js` hardcodes a base $ range per `category_tag` (e.g. PII: $50k–$250k) and default effort/capacity assumptions. These figures are not derived from real actuarial, regulatory, or contractual data. The UI exposes two adjustable controls over the defaults — **Cost Model Scale** (×, multiplies every category's $ band) and **Team Sprint Capacity** (hours, the utilisation-% denominator) — so a reviewer can normalize the illustrative figures to their own engagement size live, without touching code.

**Why:** The Financial Impact Translator's job is to demonstrate the *mechanism* — automatic category→cost mapping, severity scaling, range-not-point-estimate presentation — not to be a certified costing tool. Labeling the figures as illustrative (here and in the README) keeps the tool honest about what it is. Making the normalization knobs live in the UI (rather than "edit the config file") means a reviewer can immediately see the mechanism is sound at a different scale, which is a stronger demonstration than a static disclaimer.

**Trade-off:** Numbers shown to a real stakeholder would still need real account/contract-specific bands, not just a scale multiplier, before any real use. `Other`-tagged manual cost entries are deliberately *not* touched by Cost Model Scale — they're literal user-entered dollars, and silently rescaling them would violate the user's actual input.

---

## 12. `severity_gov` drives a cost multiplier instead of being re-scored

**Decision:** The Financial Translator scales each category's base cost range by a severity multiplier (High ×1.0, Med ×0.6, Low ×0.3) keyed off the inherited, immutable `severity_gov`.

**Why:** Reusing `severity_gov` means the assessor never re-judges severity a second time in a different tool with a different scale — one judgment, two lenses (governance and financial), consistent with Decision #3. It also means the financial exposure automatically tracks whatever App 1 already determined, with no manual re-entry step.

**Trade-off:** A 3-point multiplier is coarse — it can't distinguish a "barely High" gap from a "severely High" one. Accepted as proportionate to the illustrative nature of the cost bands themselves (#11).

---

## 13. `Other`-tagged gaps are never silently excluded from totals

**Decision:** Gaps tagged `Other` show as "requires manual costing" and are visibly counted (a "N gap(s) pending manual costing" line) but excluded from the total $ exposure until a user enters a low/high estimate — at which point they fold into the total automatically.

**Why:** PRD §3.2 is explicit that unmodeled gaps must never be silently dropped. A gap with no cost model entry is real risk exposure, even if it can't be auto-priced — hiding it would understate the picture the exec summary is trying to give.

**Trade-off:** The total exposure figure is provisional until every `Other` gap is manually costed or explicitly acknowledged as pending — this is intentional friction, not an oversight.

---

## 14. PDF export via the browser's print dialog, not a JS PDF library

**Decision:** The executive summary panel has a `@media print` stylesheet and a "Print / Save as PDF" button that calls `window.print()`. There's no `jspdf`/`pdf-lib` dependency.

**Why:** Every modern browser already renders arbitrary HTML to PDF via its native print pipeline. Pulling in a PDF-generation library to duplicate that would mean an `npm install` this project otherwise has no reason to have, breaking the zero-dependency story the rest of the stack relies on (Decision #10).

**Trade-off:** Less control over exact PDF layout/pagination than a dedicated library would give — acceptable for a one-page executive brief.

---

## 15. Sample App 1 exports (including 2 deliberately invalid ones) are shared UI/test fixtures

**Decision:** `js/config/sampleExports.js` bundles 6 fixtures for the "load a sample export" dropdown — 4 valid (mirroring `dor-gatekeeper`'s own Best/Good/Intentionally Off/Very Bad samples) and 2 deliberately invalid (malformed JSON; a schema-invalid export hitting every explicit-rejection rule at once). All 6 are asserted against directly in `tests/ingestion.test.js`.

**Why:** Same rationale as `dor-gatekeeper`'s `SAMPLES` (see its `DECISIONS.md` #14): a demo sample that isn't also a test fixture silently drifts from the code it's meant to demonstrate. Bundling the invalid samples specifically exercises the "explicit error messaging, not silent failure" requirement (PRD §5) end-to-end, not just in unit tests but in the actual ingestion UI a reviewer would click through.

**Trade-off:** None meaningful — the fixtures needed hand-authoring regardless of where they live.

---

## 16. Zero-dependency custom test runner instead of Jest/Vitest

**Decision:** `tests/run.js` plus a ~30-line `tests/assert.js` (an independent copy of the same pattern used in `dor-gatekeeper`) replace a full test framework.

**Why:** Ingestion, cost, and RAID logic are pure functions over plain JS objects — trivial to assert without a framework's fixtures, mocks, or watch-mode machinery. Using a real framework would mean an `npm install` step this project otherwise has no reason to have.

**Trade-off:** No test-framework conveniences (parallel runs, snapshot testing, rich diffs) — acceptable at this test volume (~55 assertions across 4 files).

---

## 17. Utilisation % is computed from directly-authored rework-hours, not derived from the $ cost figure

**Decision:** `REWORK_HOURS_MODEL` in `js/config/costModel.js` gives NFR and HITL gaps their own explicit, severity-scaled hour estimates (e.g. HITL: 16–100 hours), independent of `CATEGORY_COST_MODEL`'s $ bands. Utilisation % is `reworkHours ÷ teamSprintCapacityHours`, never `($high ÷ hourlyRate) ÷ teamCapacityHours`.

**Why:** This replaces a real bug, not a tuning issue. The original formula derived "rework hours" by dividing a gap's full `high` dollar exposure by an hourly rate — but that dollar figure already bundles in non-labor cost (HITL's driver is explicitly "rework **+ reputational risk**"). A single High-severity HITL gap produced 600 "rework hours" and 187% utilisation from *one gap*, which is nonsensical — you can't fix that by changing the hourly rate or team-capacity constants, because the formula conflates total exposure with labor hours. Authoring hours directly and separately fixes the conflation at its root: a single High NFR/HITL gap now tops out around 12–21% of a sprint's capacity with the default assumptions.

**Trade-off:** Two now-independent estimates (cost $ and rework hours) to maintain per category instead of one derived from the other — worth it since the derived version was actively wrong. Note the *total* utilisation % (summed across all gaps in an assessment) can still legitimately exceed 100% — that's a meaningful signal ("this is more than one sprint's worth of rework across all gaps"), unlike a single gap exceeding 100%, which would indicate a modeling error.

---

## 18. RAID table fields are inline-editable, in a stable (non-re-sorting) row order

**Decision:** Owner, Status, Target Resolution Date, and Escalation Level are editable directly in the RAID table for every entry, seeded or manual — closing the trade-off `DECISIONS.md` #7 already named ("status/level should be editable, not fixed forever"). Type, Description, and Date Raised stay read-only. The table itself renders `state.raidEntries` in stable (insertion) order and is **not** re-sorted by `sortEntriesByPriority` on every edit.

**Why:** Editing was originally wired against a table that re-sorted by RAID priority (status, then days-open) on every `recompute()`. That's fine for a read-only priority view, but for an *editable* table it's a real usability bug: changing one field (e.g. Status → Mitigating) immediately reorders the table, so a second edit in quick succession (e.g. via the same row position) silently lands on a different entry. Verified this in a headless-browser pass before fixing it — editing Owner then Status then Target then Escalation in sequence landed the later edits on the wrong row until the table was pinned to a stable order. `sortEntriesByPriority` (in `js/engine/sort.js`) is unaffected and still used elsewhere; it's simply no longer applied to this particular render.

**Trade-off:** The RAID table no longer visually groups by priority the way the gap list's "RAID Priority" toggle does — acceptable, since an editable log is more usable in a predictable order than a self-reordering one, and the 3-way toggle (PRD §3.4) was always specified for the gap list, not this table.

---

## 19. `schema_version` "1.1" is accepted alongside "1.0" — additive, not a breaking bump

**Decision:** `js/ingestion/validate.js`'s `SUPPORTED_SCHEMA_VERSIONS` is a set (`{"1.0", "1.1"}`), not a single required value. `"1.1"` exports (from `dor-gatekeeper`'s Water/Energy sector presets) carry 3 extended `category_tag` values (`Safety`, `AssetLifecycle`, `SupplyChain`); `"1.0"` exports are otherwise identical and keep ingesting exactly as before.

**Why:** This is the versioning contract working as originally designed (`DECISIONS.md` #5: *"schema_version allows App 2 to detect and reject stale/incompatible exports instead of failing silently if this enum ever changes"*). The enum *did* change — deliberately, per App 1's own extensibility clause — so App 2's job is to recognize the new version as compatible-but-extended, not to reject it. Rejecting `"1.1"` outright would have broken the sector presets entirely; silently accepting an unrecognized version without updating `KNOWN_CATEGORY_TAGS` would have meant every new-sector gap either failed validation or got miscategorized.

**Trade-off:** App 2 now has to track which schema versions introduced which tags, at least implicitly (the cost model must be kept in sync with whatever tags any supported version can send). At 2 versions and 3 new tags this is trivial; if the enum keeps growing, a per-version tag allowlist might become worth adding.

---

## 20. Cost model extended for `Safety` / `AssetLifecycle` / `SupplyChain`, not routed through `Other`

**Decision:** `CATEGORY_COST_MODEL` gained entries for the 3 new tags (Safety: $40k–$300k; AssetLifecycle: $20k–$150k; SupplyChain: $10k–$90k — same illustrative-placeholder caveat as the original 8, see #11), rather than leaving them to fall through to `Other`'s "requires manual costing" path.

**Why:** `Other` exists for genuinely novel, un-anticipated gap types (PRD's escape hatch). These 3 tags are *not* that — they're deliberately added, known categories with a clear cost driver (safety incidents, asset failure, supply disruption are all well-understood risk types in infrastructure/energy delivery). Routing them through `Other` would mean every Water/Energy assessment shows "pending manual costing" on exactly the gaps that are supposed to demonstrate the Financial Translator's automatic mapping working for those sectors — the opposite of what the sector-preset feature is meant to show.

**Trade-off:** 3 more illustrative dollar bands to keep honest/labeled as such — same discipline already applied to the original 8, no new category of trade-off.

---

## 21. Executive Health Card is a new presentation over existing data, not new computation

**Decision:** `js/export/executiveHealthCard.js`'s "Strategy-to-Execution Health Card" reuses `exposure` (Financial Translator output) and `raidEntries` exactly as computed for the existing Markdown export and on-screen views. It adds one small new piece of config (`js/config/interventionMap.js`, a `category_tag → suggested governance intervention` lookup with a generic fallback) and otherwise just reframes existing numbers in more executive-facing language (overall_score → "TOM Feasibility Score", top exposure gaps → "Root Causes of Operational Rework").

**Why:** The JD requirement behind this ("translate complex analysis into concise, decision-ready recommendations") is a presentation problem, not a data problem — the underlying exposure/RAID computation is already correct and tested. Building a second export format on the same data, rather than a parallel computation path, means there's exactly one place (`financialTranslator.js`) that can get the numbers wrong, and the Health Card can't silently drift out of sync with the detailed Markdown export.

**Trade-off:** The intervention mapping is a flat lookup with one generic fallback, not a rules engine — a tag with no specific mapping still gets a sensible default ("Escalate to Governance & Risk Committee for triage") rather than blocking the export, which matters more than mapping precision for a v1.

---

## 22. Health Card is rendered to the DOM, not just downloaded — closing the actual "PDF" path

**Decision:** `js/ui/render.js`'s `renderHealthCardPreview()` renders `buildHealthCardData()`'s output as real HTML in an on-screen panel (`#health-card-preview`) when "Export Executive Health Card" is clicked, in addition to the Markdown download. A second, independent `@media print` scope (`.print-section-health-card`, toggled via a `body.printing-health-card` class set right before `window.print()`) lets "Print Health Card" print *only* that panel.

**Why:** The original v1 only downloaded a `.md` file — "Markdown or PDF" only half-delivered, since a markdown file isn't a PDF and the page's print button only ever printed the Recovery Plan panel, never the Health Card's content (which was never in the DOM). A downloadable markdown file is a fine engineering artifact but not the actual C-suite-facing deliverable the feature is named for. `buildHealthCardData()` (added as part of this change, replacing the markdown-only `buildExecutiveHealthCard`'s internal logic) is the single source of truth both the Markdown export and this HTML preview consume, so the two presentations can't drift apart.

**Trade-off:** Two independent print scopes (Recovery Plan vs. Health Card) toggled by a body class is more CSS/JS machinery than a single print button — justified because printing "whatever happens to be on screen" would be the wrong result for either audience (an engineer wants the Recovery Plan; an executive wants the one-page Health Card, not RAID tables mixed in).

---

## 23. RAID type is classified from severity_gov + category_tag, not hardcoded to Risk

**Decision:** `js/config/raidTypeMap.js`'s `classifyRaidType(gap)` — `severity_gov === "High"` always yields `"R"` (Risk); otherwise `category_tag === "SupplyChain"` yields `"D"` (Dependency); everything else defaults to `"I"` (Issue). `seedRaidFromGaps()` (`js/engine/raid.js`) calls this per gap instead of hardcoding every seeded entry as `"R"`.

**Why:** Every seeded entry being a Risk was a real understatement of what auto-classification should look like — a Med-severity process gap and a High-severity safety gap are not the same kind of thing, and treating them identically flattens the RAID log into "a list of risks" instead of an actual Risk/Issue/Dependency breakdown. High severity still always maps to Risk deliberately (a high-severity failure is a risk to the objective regardless of theme); the category-based split below that is coarse but principled: a vendor/supply gap is definitionally something you're *waiting on*, which is a Dependency, not a Risk or a generic Issue.

**Trade-off:** `"A"` (Assumption) is never auto-generated — an assumption is asserted by a person about the world, not mechanically implied by a failed check, so forcing one would be dishonest. Only 1 of 11 category_tags (`SupplyChain`) gets its own type rule; every other non-High gap defaults to Issue. A finer-grained mapping is possible but wasn't justified by the data — most category_tags genuinely are "a live problem," which is what Issue means.

---

## 24. The gap-to-RAID link is now visible in the UI, not just present in data

**Decision:** Each row in the Gap Analysis table shows a small `RAID: {type} · {status}` badge, built from a `raidByGapId` lookup (`Map<gap_id, RaidEntry>`) passed into `renderGapTable()` from `app.js`'s `recompute()`. It updates on every recompute, including after a RAID table edit.

**Why:** `source_gap_id` has linked every seeded RAID entry back to its gap since the RAID module was first built (`DECISIONS.md` #7), but the link was only present in the data model — nothing in the UI ever showed it. A tool whose pitch is "automatically identifies a Risk or Issue from a failed check" needs that identification to be visible where the failed check itself is shown, not just discoverable by cross-referencing two tables by description text.

**Trade-off:** None meaningful — the data already existed; this is a rendering-only addition reusing the existing `recompute()` cycle.

---

## 25. NFR Gateway Exposure is a derived cross-cutting view, not new checklist data

**Decision:** `js/config/nfrGatewayMap.js` maps each `category_tag` to one of PRD §4's 4 NFR Gateways (`Fallback`/`Safety`/`AssetLifecycle`/`SupplyChain` → Resilience & Failure Mode; `RateLimit` → Cost & Resource Limit; `PII`/`Consent`/`HITL`/`Other` → Security & OWASP; `NFR` → Performance & Scale). `Lineage` and `Probity` are deliberately left unmapped — `gatewayFor()` returns `null` rather than a fallback gateway. `js/engine/nfrGateway.js`'s `rollupByGateway(exposure)` rolls the already-computed exposure data up by gateway; the new "NFR Gateway Exposure" panel shows gap count and $ exposure per gateway.

**Why:** This reuses the same `category_tag` data every other view in this app already consumes — no new tagging step, no risk of the gateway view drifting from the gap/RAID/exposure data. Leaving Lineage/Probity unmapped (rather than dumping them into the nearest-sounding gateway) keeps the 4 gateways meaning what the PRD says they mean; data-governance and procurement-probity risk are real categories but not one of these 4.

**Trade-off:** 2 of the (now) 12 category_tags contribute to no gateway total — `rollupByGateway`'s `unmappedCount` surfaces this explicitly in the panel rather than silently under-counting, but a reader has to know to look for that note.

---

## 26. ADR draft generator reuses the Recovery Plan's steps, not a separate narrative

**Decision:** `js/export/adrExport.js`'s `buildAdrDraft(assessment, exposure)` produces a standard Status/Context/Decision/Consequences ADR, populating Context from the top-3 exposure gaps (`topExposureGaps`, already shared with the Markdown export and Health Card) and Decision directly from `buildRecoveryPlan()`'s steps — not a reimplementation of "what to do next."

**Why:** An ADR's Decision section and the Recovery Plan are the same underlying decision, described for two different audiences (architecture record vs. delivery brief). Generating both from one function means they can't silently diverge on what the actual recommended path is.

**Trade-off:** The ADR's prose is generic/templated rather than bespoke to the specific architectural question at hand — appropriate for a first draft a human edits before finalizing, not a substitute for actually writing the ADR's reasoning.

---

## 27. Rework Risk Score is an authored formula, not derived from the PRD (which only gives tier boundaries)

**Decision:** `js/config/reworkRiskConfig.js` defines `SEVERITY_POINTS = { High: 10, Med: 5, Low: 2 }` and sums them per gap (`computeReworkRiskScore`) to produce a score, classified into Low/Medium/High tiers at `TIER_THRESHOLDS = { medium: 15, high: 35 }`. The same file also carries a static Option A (Contain) / B (Notify & Remediate) / C (Block & Escalate) reference table, transcribed from PRD §3.3, shown in the new "Rework Risk & Remediation" panel as reference material — not auto-selected per gap.

**Why:** PRD §3.2/3.3 specify the tier *boundaries* and the 3 remediation options' triggers/mechanisms/impacts, but not the score formula underneath the boundaries — a straight point-sum by severity is the simplest formula that produces a sensible ordering (more/higher-severity gaps → higher score) without inventing hidden weighting the PRD never specified. This is the same "illustrative, not invented from nowhere" discipline applied to `costModel.js`'s cost bands.

**Trade-off:** The remediation pathway table is reference-only, not automatically matched to a specific gap or score — the PRD ties each option to the *reason* for drift (contained vs. cross-team vs. contract-breaking), which this app has no data to infer. A human still has to pick the applicable option; auto-selecting one from severity alone would be a false precision the underlying data doesn't support.

---

## 28. V2.0 items deliberately deferred — require a backend

**Decision:** The following PRD v2.0 features are documented here rather than built, because each requires infrastructure this project's `DECISIONS.md` #8/#10 deliberately excludes (a backend, a database, or an OAuth app). Full list and per-item rationale is also in `dor-gatekeeper`'s `DECISIONS.md` #28 (shared, cross-app roadmap): passive webhook ingestion, continuous passive drift detection, Jira/ADO write-back, auto-revert/auto-schedule/auto-ticket actions, real static/dynamic code analysis for Blast-Radius/Resource Boundary profiling, multi-tenancy, persistent cross-session team dashboards, and closed-loop self-tuning of DoR weights.

**Why:** Same reasoning as App 1's #28 — building any of these "lite" inside a static app would mean silently faking a capability, which is worse than not building it. This app's own exposure/RAID/recovery-plan computation stays real and tested; what's deferred is only the backend-requiring automation layer around it.

**Trade-off:** None of the above ships. If real usage demands any of these, it's a deliberate architectural decision to add a backend — not something to bolt onto the static app piecemeal.

---

## 29. Visual/structural redesign: Ledger identity + Tabbed Spread layout, matching App 1's

**Decision:** Re-themed to "Ledger" (warm ivory paper, ink-navy/oxblood accents, `IBMPlexSerif`/`InstrumentSans`/`IBMPlexMono`, ruled rows, double-rule stamped badges — own copy of the fonts under `assets/fonts/`, per the repo-decoupling discipline) and restructured to "Tabbed Spread": a persistent sticky `<aside>` (summary info from `#summary-bar`, plus every export/print button — moved out of `.print-section-recovery`, which previously held both the narrative *and* the buttons) beside a `<main>` tab bar with 5 panes (Gap Analysis & Financial Impact — now also home to the sort controls, previously a separate global section — RAID Log, NFR Gateway Exposure, Rework Risk & Remediation, Recovery Plan). This mirrors `dor-gatekeeper`'s `DECISIONS.md` #30 exactly — same tokens, same layout pattern, confirmed by the same comparison artifacts, applied independently to each repo's own markup/CSS/JS (no shared file, per #1-2).

Every existing element `id` was preserved — `app.js`'s lookups needed zero changes beyond the new tab-switching module. The `#health-card-preview` panel deliberately stays *outside* the tab shell (a transient, on-demand generated preview, not a persistent working tab), and its existing dual `@media print` scoping (#22) is preserved. One real behavioral fix was required by the restructuring: the "Print / Save as PDF" button now lives in the aside, reachable from *any* tab, but only the Recovery Plan tab's content should ever be captured by `window.print()` — so the button's handler now calls `switchTab("recovery")` before `window.print()`, guaranteeing `#tab-recovery` is unhidden regardless of which tab was on screen when it was clicked.

**Why:** Same reasoning as App 1 — the visual treatment had never actually been decided on, just accumulated. Keeping the redesign confined to presentation (no engine/export logic touched) meant the existing 158-test suite could verify nothing broke behaviorally, while a headless-browser pass verified the structural change itself (including the print-tab-switch fix, which has no unit-test surface — it's a DOM interaction).

**Trade-off:** Same as App 1's #30 — a large, single-purpose commit, deliberately free of new features.
