import { assertEqual, assertTrue } from "./assert.js";
import { seedRaidFromGaps, createManualEntry, rollupByTypeAndStatus, rollupByEscalationAndStatus } from "../js/engine/raid.js";
import { classifyRaidType } from "../js/config/raidTypeMap.js";
import { sortGapsBySeverity, sortGapsByExposure, sortGapsByRaidPriority, sortEntriesByPriority } from "../js/engine/sort.js";
import { flattenGaps, computeExposure } from "../js/engine/financialTranslator.js";
import { VALID_SAMPLE_ASSESSMENTS } from "../js/config/sampleExports.js";

const gaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.intentionally_off);
const raidEntries = seedRaidFromGaps(gaps, "2026-01-01");

assertEqual(raidEntries.length, gaps.length, "one seeded RAID entry per gap");
assertTrue(raidEntries.every((e) => e.status === "Open"), "seeded entries start Open");
assertEqual(raidEntries[0].priority, gaps[0].severity_gov, "seeded entry priority is inherited from severity_gov");

// Type is classified per gap, not hardcoded — the intentionally_off sample has a
// known mix of High and Med/Low severity gaps, so seeding should produce a real mix
// of Risk and Issue entries, not "everything is a Risk".
assertEqual(classifyRaidType({ severity_gov: "High", category_tag: "PII" }), "R", "High severity always classifies as Risk");
assertEqual(classifyRaidType({ severity_gov: "Med", category_tag: "Fallback" }), "I", "Med severity with no special category classifies as Issue");
assertEqual(classifyRaidType({ severity_gov: "Low", category_tag: "SupplyChain" }), "D", "non-High SupplyChain gap classifies as Dependency");

const highGapCount = gaps.filter((g) => g.severity_gov === "High").length;
const nonHighGapCount = gaps.length - highGapCount;
assertTrue(raidEntries.some((e) => e.type === "R"), "seeded entries include at least one Risk");
assertTrue(raidEntries.some((e) => e.type === "I"), "seeded entries include at least one Issue (not every gap is a Risk)");

const typeRollup = rollupByTypeAndStatus(raidEntries);
assertEqual(typeRollup.R.Open, highGapCount, "type rollup counts exactly the High-severity gaps as Open Risks");
assertEqual(typeRollup.I.Open, nonHighGapCount, "type rollup counts the remaining gaps as Open Issues (no SupplyChain gaps in this sample)");

// The Energy sample has a Low-severity SupplyChain gap — confirms auto-seeding
// actually produces a Dependency entry end to end, not just in the unit-level check above.
const energyGaps = flattenGaps(VALID_SAMPLE_ASSESSMENTS.energy_good);
const energyRaid = seedRaidFromGaps(energyGaps, "2026-01-01");
assertTrue(energyRaid.some((e) => e.type === "D"), "energy_good sample's SupplyChain gap seeds a Dependency entry");

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
