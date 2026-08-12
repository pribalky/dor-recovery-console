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

## 11. Cost bands are illustrative placeholders, explicitly labeled as estimates

**Decision:** `js/config/costModel.js` hardcodes a base $ range per `category_tag` (e.g. PII: $50k–$250k). These figures are not derived from real actuarial, regulatory, or contractual data.

**Why:** The Financial Impact Translator's job is to demonstrate the *mechanism* — automatic category→cost mapping, severity scaling, range-not-point-estimate presentation — not to be a certified costing tool. Labeling the figures as illustrative (here and in the README) keeps the tool honest about what it is: a structured way to reason about exposure, not a source of truth for real dollar figures.

**Trade-off:** Numbers shown to a real stakeholder would need replacing with account/contract-specific figures before any real use — by design, this is a config change, not a code change.

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
