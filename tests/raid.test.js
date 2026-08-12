import { assertEqual, assertTrue } from "./assert.js";
import { seedRaidFromGaps, createManualEntry, rollupByTypeAndStatus, rollupByEscalationAndStatus } from "../js/engine/raid.js";
import { sortGapsBySeverity, sortGapsByExposure, sortGapsByRaidPriority, sortEntriesByPriority } from "../js/engine/sort.js";
import { flattenGaps, computeExposure } from "../js/engine/financialTranslator.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

const gaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.intentionally_off);
const raidEntries = seedRaidFromGaps(gaps, "2026-01-01");

assertEqual(raidEntries.length, gaps.length, "one seeded RAID entry per gap");
assertTrue(raidEntries.every((e) => e.type === "R"), "seeded entries are all type Risk");
assertTrue(raidEntries.every((e) => e.status === "Open"), "seeded entries start Open");
assertEqual(raidEntries[0].priority, gaps[0].severity_gov, "seeded entry priority is inherited from severity_gov");

const typeRollup = rollupByTypeAndStatus(raidEntries);
assertEqual(typeRollup.R.Open, gaps.length, "type rollup counts all seeded entries as Open Risks");

const manual = createManualEntry(
  { type: "A", description: "Assume vendor SLA holds", status: "Mitigating", escalationLevel: "Programme", dateRaised: "2026-01-01" },
  "raid-manual-1"
);
const withManual = [...raidEntries, manual];
const escRollup = rollupByEscalationAndStatus(withManual);
assertEqual(escRollup.Programme.Mitigating, 1, "manual entry appears in the escalation-level rollup");
assertEqual(escRollup.Team.Open, gaps.length, "seeded entries default to Team escalation, all Open");

const exposure = computeExposure(gaps);

const bySeverity = sortGapsBySeverity(exposure.gaps);
assertTrue(bySeverity[0].severity_gov === "High", "severity sort puts a High-severity gap first");

const byExposure = sortGapsByExposure(exposure.gaps);
const costedOnly = byExposure.filter((g) => !g.cost.unmodeled);
const isDescending = costedOnly.every((g, i) => i === 0 || costedOnly[i - 1].cost.high >= g.cost.high);
assertTrue(isDescending, "exposure sort orders costed gaps by descending $ high estimate");
assertTrue(byExposure[byExposure.length - 1].cost.unmodeled, "exposure sort pushes the unmodeled Other gap to the end");

const byRaid = sortGapsByRaidPriority(exposure.gaps, raidEntries);
assertEqual(byRaid.length, exposure.gaps.length, "RAID-priority sort returns every gap");

const sortedEntries = sortEntriesByPriority(withManual);
assertEqual(sortedEntries.length, withManual.length, "entry priority sort returns all entries, seeded and manual");
assertEqual(sortedEntries[sortedEntries.length - 1].status, "Mitigating", "Mitigating entry sorts after all Open entries");
